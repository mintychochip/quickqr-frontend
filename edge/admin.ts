import type { Env } from './env';

/**
 * Whether an address is on `ADMIN_EMAILS`: comma separated, matched whole and ignoring case and spaces. Unset, empty,
 * or only commas means nobody is an administrator. The list is a Pages secret and is read on every request, so it is
 * never in a file; sign-in refuses an email its provider has not verified, which is what makes an address worth trusting.
 */
export function isAdmin(env: Pick<Env, 'ADMIN_EMAILS'>, email: string): boolean {
  const wanted = email.trim().toLowerCase();
  if (wanted === '') return false;
  return (env.ADMIN_EMAILS ?? '').split(',').some((entry) => entry.trim().toLowerCase() === wanted);
}
