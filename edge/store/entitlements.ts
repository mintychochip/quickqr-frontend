import type { Db, Stmt } from '../db';
import { bestPlan, type Plan, type PlanRow } from '../plans';

/** The statement that reads a person's entitlements that have not ended, so a caller can batch it with other reads. */
export function liveEntitlements(db: Db, userId: string, now: Date): Stmt {
  return db.prepare('SELECT plan, ends_at FROM entitlements WHERE user_id = ? AND ends_at > ?').bind(userId, now.toISOString());
}

/**
 * The plan a person has right now, and when it ends. A lookup that fails reads as Free instead of failing the request:
 * `GET /api/auth/me` is how the app decides whether anyone is signed in, and it signs a person out on any answer but 200,
 * so code deployed ahead of the 0002 migration would otherwise sign everyone out. Free is also the safe way to be wrong,
 * because it never grants a paid feature.
 */
export async function effectivePlan(db: Db, userId: string, now: Date): Promise<{ plan: Plan; until: string | null }> {
  try {
    const { results } = await liveEntitlements(db, userId, now).all<PlanRow>();
    return bestPlan(results, now);
  } catch (err) {
    console.error('plan lookup failed, reading the person as Free', err);
    return { plan: 'free', until: null };
  }
}
