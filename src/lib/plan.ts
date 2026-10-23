import type { User } from '@/types/auth';
import { PLANS } from './pricing';

/** A date as a person reads it: month by name (so day and month cannot be swapped), in their calendar unless told. */
export function formatDay(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone }).format(new Date(iso));
}

/**
 * What to call a person's plan. A server that does not send one (the Go server has no plans) or one this app does not
 * know is the free plan, which is always true of them. `timeZone` defaults to the viewer's own.
 */
export function describePlan(user: Pick<User, 'plan' | 'plan_until'>, timeZone?: string): { name: string; line: string } {
  const known = PLANS.find((plan) => plan.id === user.plan);
  const name = known?.name ?? 'Free';
  const line = known && known.id !== 'free' && user.plan_until ? `${name} plan until ${formatDay(user.plan_until, timeZone)}` : `${name} plan`;
  return { name, line };
}
