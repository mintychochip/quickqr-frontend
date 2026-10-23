export type Plan = 'free' | 'plus' | 'pro';

const PAID_RANK = { plus: 1, pro: 2 } as const;
type PaidPlan = keyof typeof PAID_RANK;

const isPaid = (plan: string): plan is PaidPlan => plan === 'plus' || plan === 'pro';

export interface PlanRow {
  plan: string;
  /** UTC ISO 8601 from `Date.toISOString()`, which sorts as text, so rows compare with `now` as strings. */
  ends_at: string;
}

/**
 * The plan a person has right now: the highest one with a row that has not ended, and the latest end among that
 * plan's live rows. A name this code does not know is ignored, so a bad row can never grant anything.
 */
export function bestPlan(rows: readonly PlanRow[], now: Date): { plan: Plan; until: string | null } {
  const nowIso = now.toISOString();
  let best: { plan: Plan; until: string | null } = { plan: 'free', until: null };
  for (const row of rows) {
    if (!isPaid(row.plan) || row.ends_at <= nowIso) continue;
    const outranks = best.plan === 'free' || PAID_RANK[row.plan] > PAID_RANK[best.plan as PaidPlan];
    const extends_ = row.plan === best.plan && best.until !== null && row.ends_at > best.until;
    if (outranks || extends_) best = { plan: row.plan, until: row.ends_at };
  }
  return best;
}
