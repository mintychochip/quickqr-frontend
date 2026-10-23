/**
 * A gift grant is made on the server and handed out as a link that holds nothing but a random token. Everything about
 * the grant (plan, length, uses, expiry) is looked up by the token's SHA-256, so the link cannot be read or forged.
 * The hosted routes, the admin page, and scripts/gift.ts all go through this file so they cannot disagree.
 */

export const GIFT_PLANS = ['plus', 'pro'] as const;
export type GiftPlan = (typeof GIFT_PLANS)[number];

export const GIFT_LIMITS = {
  days: { min: 1, max: 366 },
  uses: { min: 1, max: 1000 },
  linkDays: { default: 30, max: 365 },
  noteMax: 120,
} as const;

const DAY_MS = 86_400_000;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{27}$/;

/** 160 random bits as 27 URL-safe characters with no padding, so it survives a URL fragment untouched. */
export function newGiftToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

/** True for a string shaped like a token. Anything else cannot be one, so it is not worth hashing or looking up. */
export function isGiftToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_PATTERN.test(value);
}

/** The link that goes to the recipient. The token is in the fragment so no request line, log, or Referer ever carries it. */
export function giftLink(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/+$/, '')}/gift#${token}`;
}

export interface NewGift {
  plan: GiftPlan;
  days: number;
  maxUses: number;
  /** The link stops working after this instant (UTC ISO 8601). */
  redeemBy: string;
  note: string;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const wholeBetween = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

/** Checks the body of a request to make a grant, in the order the messages are listed in the docs. */
export function parseNewGift(input: unknown, now: Date): Parsed<NewGift> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ok: false, error: 'Invalid request body' };
  const body = input as Record<string, unknown>;

  const plan = body.plan;
  if (!GIFT_PLANS.some((allowed) => allowed === plan)) return { ok: false, error: 'plan must be plus or pro' };

  const { days: dayLimits, uses: useLimits, linkDays, noteMax } = GIFT_LIMITS;
  if (!wholeBetween(body.days, dayLimits.min, dayLimits.max)) {
    return { ok: false, error: `days must be a whole number from ${dayLimits.min} to ${dayLimits.max}` };
  }
  const uses = body.uses === undefined ? useLimits.min : body.uses;
  if (!wholeBetween(uses, useLimits.min, useLimits.max)) {
    return { ok: false, error: `uses must be a whole number from ${useLimits.min} to ${useLimits.max}` };
  }
  const linkLife = body.link_days === undefined ? linkDays.default : body.link_days;
  if (!wholeBetween(linkLife, 1, linkDays.max)) return { ok: false, error: `link_days must be a whole number from 1 to ${linkDays.max}` };

  const note = body.note === undefined ? '' : body.note;
  if (typeof note !== 'string' || note.trim().length > noteMax) return { ok: false, error: `note must be text of at most ${noteMax} characters` };

  return {
    ok: true,
    value: {
      plan: plan as GiftPlan,
      days: body.days,
      maxUses: uses,
      redeemBy: new Date(now.getTime() + linkLife * DAY_MS).toISOString(),
      note: note.trim(),
    },
  };
}
