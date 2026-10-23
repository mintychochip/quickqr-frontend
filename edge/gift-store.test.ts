import { describe, expect, test } from 'bun:test';
import { newGiftToken } from './gifts';
import { sha256Hex } from './ids';
import { effectivePlan } from './store/entitlements';
import { createGrant, listGrants, redeemGrant, revokeGrant } from './store/gifts';
import { rig, signUp, type Rig } from './test/rig';

const DAY = 86_400_000;
const iso = (ms: number): string => new Date(ms).toISOString();

interface Options {
  plan?: 'plus' | 'pro';
  days?: number;
  maxUses?: number;
  linkDays?: number;
  note?: string;
}

/** Makes a grant the way the routes do: only the token's hash goes in. */
async function grant(r: Rig, options: Options = {}) {
  const token = newGiftToken();
  const tokenHash = await sha256Hex(token);
  const view = await createGrant(
    r.db,
    {
      tokenHash,
      plan: options.plan ?? 'plus',
      days: options.days ?? 30,
      maxUses: options.maxUses ?? 1,
      redeemBy: iso(r.now().getTime() + (options.linkDays ?? 30) * DAY),
      note: options.note ?? '',
      createdBy: 'test',
    },
    r.now(),
  );
  return { token, tokenHash, view };
}

const entitlementRows = (r: Rig, userId: string) =>
  r.db.sqlite.query('SELECT plan, ends_at, source, source_id FROM entitlements WHERE user_id = ? ORDER BY ends_at').all(userId) as { plan: string; ends_at: string; source: string; source_id: string }[];

describe('making, listing, and revoking grants', () => {
  test('a grant is stored by its token hash, and neither the token nor the hash is ever listed', async () => {
    const r = rig();
    const { token, tokenHash, view } = await grant(r, { note: 'for Sam' });

    expect(view).toMatchObject({ plan: 'plus', days: 30, max_uses: 1, uses: 0, note: 'for Sam', created_by: 'test', revoked_at: null, status: 'active' });
    expect(view.id).toMatch(/^gft-/);

    const stored = r.db.sqlite.query('SELECT * FROM gift_grants').all() as Record<string, unknown>[];
    expect(stored).toHaveLength(1);
    expect(stored[0]?.token_hash).toBe(tokenHash);
    expect(JSON.stringify(stored)).not.toContain(token);

    const listed = JSON.stringify(await listGrants(r.db, r.now()));
    expect(listed).not.toContain(token);
    expect(listed).not.toContain(tokenHash);
  });

  test('two grants never share a token hash', async () => {
    const r = rig();
    const { tokenHash } = await grant(r);
    await expect(
      createGrant(r.db, { tokenHash, plan: 'pro', days: 5, maxUses: 1, redeemBy: iso(r.now().getTime() + DAY), note: '', createdBy: 'test' }, r.now()),
    ).rejects.toThrow();
  });

  test('a grant is active, then used up, expired, or revoked', async () => {
    const r = rig();
    const sam = await signUp(r, 'sam@example.com');
    const active = await grant(r, { note: 'active' });
    const usedUp = await grant(r, { note: 'used up' });
    await grant(r, { note: 'expired', linkDays: 1 });
    const revoked = await grant(r, { note: 'revoked' });

    await redeemGrant(r.db, usedUp.tokenHash, sam.id, r.now());
    await revokeGrant(r.db, revoked.view.id, r.now());
    r.advance(2 * DAY);

    const byNote = Object.fromEntries((await listGrants(r.db, r.now())).map((g) => [g.note, g]));
    expect(byNote.active?.status).toBe('active');
    expect(byNote['used up']).toMatchObject({ status: 'used up', uses: 1 });
    expect(byNote.expired?.status).toBe('expired');
    expect(byNote.revoked?.status).toBe('revoked');
    expect(active.view.id).toBe(byNote.active?.id ?? '');
  });

  test('revoking sets the time once, and an unknown id is null', async () => {
    const r = rig();
    const { view } = await grant(r);
    const first = await revokeGrant(r.db, view.id, r.now());
    expect(first?.revoked_at).toBe(r.now().toISOString());
    r.advance(DAY);
    const again = await revokeGrant(r.db, view.id, r.now());
    expect(again?.revoked_at).toBe(first?.revoked_at ?? '');
    expect(await revokeGrant(r.db, 'gft-nothere', r.now())).toBeNull();
  });
});

describe('redeeming a grant', () => {
  test('gives the plan for its days, counted from the moment it is claimed', async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    const { tokenHash } = await grant(r, { plan: 'plus', days: 30 });
    r.advance(3 * DAY);

    const claimed = await redeemGrant(r.db, tokenHash, ada.id, r.now());
    const until = iso(r.now().getTime() + 30 * DAY);
    expect(claimed).toEqual({ kind: 'granted', plan: 'plus', until });
    expect(await effectivePlan(r.db, ada.id, r.now())).toEqual({ plan: 'plus', until });
  });

  test('the plan ends when the days do, and then the person is on Free again', async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    const { tokenHash } = await grant(r, { plan: 'pro', days: 10 });
    await redeemGrant(r.db, tokenHash, ada.id, r.now());

    r.advance(10 * DAY - 1);
    expect((await effectivePlan(r.db, ada.id, r.now())).plan).toBe('pro');
    r.advance(1);
    expect(await effectivePlan(r.db, ada.id, r.now())).toEqual({ plan: 'free', until: null });
  });

  test('the same person claiming again is told the same thing and gets nothing more', async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    const { tokenHash, view } = await grant(r, { maxUses: 5 });

    const first = await redeemGrant(r.db, tokenHash, ada.id, r.now());
    r.advance(DAY);
    const second = await redeemGrant(r.db, tokenHash, ada.id, r.now());

    if (first.kind !== 'granted') throw new Error('the first claim should have been granted');
    expect(second).toEqual({ kind: 'already', plan: first.plan, until: first.until });
    expect(entitlementRows(r, ada.id)).toHaveLength(1);
    expect((await listGrants(r.db, r.now())).find((g) => g.id === view.id)?.uses).toBe(1);
  });

  test('a single-use grant is gone for the next person, who gets nothing', async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    const bob = await signUp(r, 'bob@example.com');
    const { tokenHash } = await grant(r);

    expect((await redeemGrant(r.db, tokenHash, ada.id, r.now())).kind).toBe('granted');
    expect(await redeemGrant(r.db, tokenHash, bob.id, r.now())).toEqual({ kind: 'invalid' });
    expect(entitlementRows(r, bob.id)).toEqual([]);
  });

  test('a grant with several uses serves exactly that many people', async () => {
    const r = rig();
    const people = await Promise.all(['a', 'b', 'c'].map((n) => signUp(r, `${n}@example.com`)));
    const { tokenHash } = await grant(r, { maxUses: 2 });

    const kinds: string[] = [];
    for (const person of people) kinds.push((await redeemGrant(r.db, tokenHash, person.id, r.now())).kind);
    expect(kinds).toEqual(['granted', 'granted', 'invalid']);
  });

  test('a token nobody made is invalid', async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    expect(await redeemGrant(r.db, await sha256Hex(newGiftToken()), ada.id, r.now())).toEqual({ kind: 'invalid' });
  });

  test('a link past its expiry is invalid, and one claimed in time still works after it', async () => {
    const r = rig();
    const early = await signUp(r, 'early@example.com');
    const late = await signUp(r, 'late@example.com');
    const { tokenHash } = await grant(r, { maxUses: 2, linkDays: 7 });

    await redeemGrant(r.db, tokenHash, early.id, r.now());
    r.advance(7 * DAY);
    expect(await redeemGrant(r.db, tokenHash, late.id, r.now())).toEqual({ kind: 'invalid' });
    expect(entitlementRows(r, late.id)).toEqual([]);
    expect((await effectivePlan(r.db, early.id, r.now())).plan).toBe('plus');
  });

  test('a revoked grant cannot be claimed, but revoking takes nothing back', async () => {
    const r = rig();
    const early = await signUp(r, 'early@example.com');
    const late = await signUp(r, 'late@example.com');
    const { tokenHash, view } = await grant(r, { maxUses: 2 });

    await redeemGrant(r.db, tokenHash, early.id, r.now());
    await revokeGrant(r.db, view.id, r.now());

    expect(await redeemGrant(r.db, tokenHash, late.id, r.now())).toEqual({ kind: 'invalid' });
    expect((await effectivePlan(r.db, early.id, r.now())).plan).toBe('plus');
  });

  test('a second gift of the same plan starts where the first ends', async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    const first = await grant(r, { days: 30 });
    const second = await grant(r, { days: 20 });
    const start = r.now().getTime();

    await redeemGrant(r.db, first.tokenHash, ada.id, r.now());
    const chained = await redeemGrant(r.db, second.tokenHash, ada.id, r.now());

    expect(chained).toEqual({ kind: 'granted', plan: 'plus', until: iso(start + 50 * DAY) });
    expect((await effectivePlan(r.db, ada.id, r.now())).until).toBe(iso(start + 50 * DAY));
  });

  test('a gift of a different plan runs alongside, the higher plan wins, and the lower one is still there after', async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    const plus = await grant(r, { plan: 'plus', days: 60 });
    const pro = await grant(r, { plan: 'pro', days: 10 });
    const start = r.now().getTime();

    await redeemGrant(r.db, plus.tokenHash, ada.id, r.now());
    await redeemGrant(r.db, pro.tokenHash, ada.id, r.now());

    expect(await effectivePlan(r.db, ada.id, r.now())).toEqual({ plan: 'pro', until: iso(start + 10 * DAY) });
    r.advance(11 * DAY);
    expect(await effectivePlan(r.db, ada.id, r.now())).toEqual({ plan: 'plus', until: iso(start + 60 * DAY) });
  });

  test('having something already never makes a gift fail', async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    const long = await grant(r, { plan: 'pro', days: 100 });
    const short = await grant(r, { plan: 'plus', days: 5 });

    await redeemGrant(r.db, long.tokenHash, ada.id, r.now());
    expect((await redeemGrant(r.db, short.tokenHash, ada.id, r.now())).kind).toBe('granted');
    expect(entitlementRows(r, ada.id).map((row) => row.plan)).toEqual(['plus', 'pro']);
  });

  test('two people racing for the last use: one gets it and the other gets nothing', async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    const bob = await signUp(r, 'bob@example.com');
    const { tokenHash } = await grant(r);

    const results = await Promise.all([redeemGrant(r.db, tokenHash, ada.id, r.now()), redeemGrant(r.db, tokenHash, bob.id, r.now())]);

    expect(results.map((result) => result.kind).sort()).toEqual(['granted', 'invalid']);
    expect(r.db.sqlite.query('SELECT COUNT(*) AS n FROM entitlements').get()).toEqual({ n: 1 });
    expect(r.db.sqlite.query('SELECT COUNT(*) AS n FROM gift_redemptions').get()).toEqual({ n: 1 });
  });

  test('one person double-clicking gets one plan, and both answers are good', async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    const { tokenHash } = await grant(r, { maxUses: 3 });

    const results = await Promise.all([redeemGrant(r.db, tokenHash, ada.id, r.now()), redeemGrant(r.db, tokenHash, ada.id, r.now())]);

    expect(results.map((result) => result.kind).sort()).toEqual(['already', 'granted']);
    expect(entitlementRows(r, ada.id)).toHaveLength(1);
    const [first, second] = results;
    if (first.kind === 'invalid' || second.kind === 'invalid') throw new Error('both claims should have been good');
    expect([first.plan, first.until]).toEqual(['plus', second.until]);
  });

  test('the entitlement remembers where it came from', async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    const { tokenHash, view } = await grant(r);
    await redeemGrant(r.db, tokenHash, ada.id, r.now());
    expect(entitlementRows(r, ada.id)).toEqual([{ plan: 'plus', ends_at: iso(r.now().getTime() + 30 * DAY), source: 'gift', source_id: view.id }]);
  });
});

describe('effectivePlan', () => {
  test('a person with nothing is on Free', async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    expect(await effectivePlan(r.db, ada.id, r.now())).toEqual({ plan: 'free', until: null });
  });

  test("one person's plan is not another's", async () => {
    const r = rig();
    const ada = await signUp(r, 'ada@example.com');
    const bob = await signUp(r, 'bob@example.com');
    const { tokenHash } = await grant(r);
    await redeemGrant(r.db, tokenHash, ada.id, r.now());
    expect((await effectivePlan(r.db, bob.id, r.now())).plan).toBe('free');
  });
});
