/**
 * The plans on the home page. This file is the only place a price or an allowance is written down;
 * docs/superpowers/specs/2026-10-22-pricing-plans-design.md says why each number is what it is.
 */

export type PlanId = 'free' | 'plus' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** US dollars. Null for the plan that costs nothing. */
  price: { monthly: number; yearly: number } | null;
  /** A live plan can be used today. One that is not live cannot be bought yet. */
  live: boolean;
  features: string[];
}

/**
 * Scans a month a paid plan may serve without the sponsor screen. Past it the sponsor screen returns until the next
 * calendar month and no code stops. This caps the sponsor revenue given up, not cost: a scan costs about $0.0000044.
 */
export const AD_FREE_SCANS = { plus: 50_000, pro: 500_000 } as const;

export const PLANS: readonly Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Print it once. It keeps working.',
    price: null,
    live: true,
    features: [
      'Unlimited static codes, no account',
      'Dynamic codes that never expire and can be re-pointed',
      'A short sponsor screen on each scan',
      'Scan counts, device mix, and referrers',
      'Hosted link pages',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    tagline: 'Skip the sponsor screen.',
    price: { monthly: 5, yearly: 50 },
    live: false,
    features: [
      'Everything in Free',
      'No sponsor screen on your codes',
      `Up to ${AD_FREE_SCANS.plus.toLocaleString('en-US')} scans a month, then the sponsor screen returns until the next month`,
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'Hosted sites and ad-free pages.',
    price: { monthly: 15, yearly: 150 },
    live: false,
    features: [
      'Everything in Plus',
      'Hosted sites and menus you can edit any time',
      'No sponsor line on your menus and link pages',
      'No quickqr branding on them',
      `Up to ${AD_FREE_SCANS.pro.toLocaleString('en-US')} scans a month`,
    ],
  },
];

/** Printed under the plans. It stays true only while no code is ever disabled for lack of payment. */
export const PLEDGE =
  'If a paid plan ends, your codes keep working. The sponsor screen comes back; your links, sites, menus, and scan history stay as they are.';

/** Months of the year you do not pay for on the yearly price. */
export function monthsFree(price: { monthly: number; yearly: number }): number {
  return Math.round(12 - price.yearly / price.monthly);
}

/** The yearly price as a monthly figure, for the annual side of the toggle: $50 a year is $4.17 a month. */
export function monthlyEquivalent(price: { monthly: number; yearly: number }): number {
  return Math.round((price.yearly / 12) * 100) / 100;
}

/** A price as it is shown: whole dollars stay whole, anything with cents keeps two. */
export function money(value: number): string {
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`;
}
