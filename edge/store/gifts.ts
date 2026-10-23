import type { Db } from '../db';
import type { GiftPlan } from '../gifts';
import { randomCode } from '../ids';

const DAY_MS = 86_400_000;

export type GrantStatus = 'active' | 'used up' | 'expired' | 'revoked';

/** A grant as an administrator sees it. The token and its hash are never part of it. */
export interface GrantView {
  id: string;
  plan: string;
  days: number;
  max_uses: number;
  uses: number;
  redeem_by: string | null;
  note: string;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
  status: GrantStatus;
}

type GrantRow = Omit<GrantView, 'status'>;

export interface NewGrant {
  /** SHA-256 of the token, as hex. */
  tokenHash: string;
  plan: GiftPlan;
  days: number;
  maxUses: number;
  redeemBy: string;
  note: string;
  /** An administrator's email, or 'cli'. */
  createdBy: string;
}

// scripts/gift.ts runs these same statements through wrangler, so the CLI and the routes cannot disagree.
export const GRANT_INSERT_SQL =
  'INSERT INTO gift_grants (id, token_hash, plan, days, max_uses, redeem_by, note, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
export const GRANT_SELECT_SQL =
  'SELECT g.id, g.plan, g.days, g.max_uses, (SELECT COUNT(*) FROM gift_redemptions r WHERE r.grant_id = g.id) AS uses, g.redeem_by, g.note, g.created_by, g.created_at, g.revoked_at FROM gift_grants g';
export const GRANT_LIST_SQL = `${GRANT_SELECT_SQL} ORDER BY g.created_at DESC, g.id`;
export const GRANT_REVOKE_SQL = 'UPDATE gift_grants SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL';

/** Where a grant stands: revoked, then used up, then expired, else active. */
export function grantStatus(row: Pick<GrantView, 'revoked_at' | 'uses' | 'max_uses' | 'redeem_by'>, now: Date): GrantStatus {
  if (row.revoked_at !== null) return 'revoked';
  if (row.uses >= row.max_uses) return 'used up';
  if (row.redeem_by !== null && row.redeem_by <= now.toISOString()) return 'expired';
  return 'active';
}

const toView = (row: GrantRow, now: Date): GrantView => ({ ...row, status: grantStatus(row, now) });

/**
 * The statement that stores a new grant, with its values and the view of it. A pure function so the routes (which bind
 * the values) and scripts/gift.ts (which writes them into SQL for wrangler) store the very same row.
 */
export function grantInsert(input: NewGrant, now: Date): { view: GrantView; sql: string; values: unknown[] } {
  const row: GrantRow = {
    id: `gft-${randomCode(8)}`,
    plan: input.plan,
    days: input.days,
    max_uses: input.maxUses,
    uses: 0,
    redeem_by: input.redeemBy,
    note: input.note,
    created_by: input.createdBy,
    created_at: now.toISOString(),
    revoked_at: null,
  };
  const values = [row.id, input.tokenHash, row.plan, row.days, row.max_uses, row.redeem_by, row.note, row.created_by, row.created_at];
  return { view: toView(row, now), sql: GRANT_INSERT_SQL, values };
}

export async function createGrant(db: Db, input: NewGrant, now: Date): Promise<GrantView> {
  const { view, sql, values } = grantInsert(input, now);
  await db.prepare(sql).bind(...values).run();
  return view;
}

/** Every grant, newest first. */
export async function listGrants(db: Db, now: Date): Promise<GrantView[]> {
  const { results } = await db.prepare(GRANT_LIST_SQL).all<GrantRow>();
  return results.map((row) => toView(row, now));
}

/** Stops further claims. Plans already given stay. Revoking twice keeps the first time; an unknown id is null. */
export async function revokeGrant(db: Db, id: string, now: Date): Promise<GrantView | null> {
  await db.prepare(GRANT_REVOKE_SQL).bind(now.toISOString(), id).run();
  const row = await db.prepare(`${GRANT_SELECT_SQL} WHERE g.id = ?`).bind(id).first<GrantRow>();
  return row ? toView(row, now) : null;
}

export type Redeemed = { kind: 'granted' | 'already'; plan: string; until: string } | { kind: 'invalid' };

const INVALID: Redeemed = { kind: 'invalid' };

async function endOfRedemption(db: Db, grantId: string, userId: string): Promise<string | null> {
  const row = await db.prepare('SELECT ends_at FROM gift_redemptions WHERE grant_id = ? AND user_id = ?').bind(grantId, userId).first<{ ends_at: string }>();
  return row?.ends_at ?? null;
}

/**
 * Gives a person the plan a grant carries. A token nobody made, a revoked grant, an expired link, and a full grant are
 * all `invalid`, so a caller cannot tell them apart. A person who already claimed it is told the same answer again and
 * gets nothing more.
 *
 * The days run from now, or from the end of what the person already has of the same plan, so gifts chain. The capacity
 * check and the insert are one statement inside one transaction, so two people racing for the last use cannot both
 * get it; the unique (grant, person) pair makes a double click grant a single plan.
 */
export async function redeemGrant(db: Db, tokenHash: string, userId: string, now: Date): Promise<Redeemed> {
  const grant = await db
    .prepare('SELECT id, plan, days, redeem_by, revoked_at FROM gift_grants WHERE token_hash = ?')
    .bind(tokenHash)
    .first<{ id: string; plan: string; days: number; redeem_by: string | null; revoked_at: string | null }>();
  if (!grant) return INVALID;

  const claimedBefore = await endOfRedemption(db, grant.id, userId);
  if (claimedBefore) return { kind: 'already', plan: grant.plan, until: claimedBefore };

  const stamp = now.toISOString();
  if (grant.revoked_at !== null || (grant.redeem_by !== null && grant.redeem_by <= stamp)) return INVALID;

  const held = await db
    .prepare('SELECT MAX(ends_at) AS latest FROM entitlements WHERE user_id = ? AND plan = ? AND ends_at > ?')
    .bind(userId, grant.plan, stamp)
    .first<{ latest: string | null }>();
  const start = Math.max(now.getTime(), held?.latest ? Date.parse(held.latest) : 0);
  const endsAt = new Date(start + grant.days * DAY_MS).toISOString();

  const redemptionId = `rdm-${randomCode(10)}`;
  const [claimed] = await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO gift_redemptions (id, grant_id, user_id, redeemed_at, ends_at)
         SELECT ?, g.id, ?, ?, ? FROM gift_grants g
         WHERE g.id = ? AND g.revoked_at IS NULL AND (g.redeem_by IS NULL OR g.redeem_by > ?)
           AND (SELECT COUNT(*) FROM gift_redemptions r WHERE r.grant_id = g.id) < g.max_uses`,
      )
      .bind(redemptionId, userId, stamp, endsAt, grant.id, stamp),
    db
      .prepare(
        `INSERT INTO entitlements (id, user_id, plan, ends_at, source, source_id, created_at)
         SELECT ?, r.user_id, g.plan, r.ends_at, 'gift', g.id, ?
         FROM gift_redemptions r JOIN gift_grants g ON g.id = r.grant_id WHERE r.id = ?`,
      )
      .bind(`ent-${randomCode(10)}`, stamp, redemptionId),
  ]);
  if (claimed?.meta.changes === 1) return { kind: 'granted', plan: grant.plan, until: endsAt };

  // Nothing went in: the same person's other click got there first, or the grant filled up or was revoked meanwhile.
  const raced = await endOfRedemption(db, grant.id, userId);
  return raced ? { kind: 'already', plan: grant.plan, until: raced } : INVALID;
}
