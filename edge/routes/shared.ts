import { HttpError } from '../http';
import { SIGN_IN_REQUIRED, type Ctx } from '../router';
import { getLink } from '../store/links';
import type { StoredLink } from '../types';

/** The signed-in person's id. Routes that need one are registered with an `any` policy, so this is a guard, not a gate. */
export function userId(c: Ctx): string {
  if (!c.principal) throw new HttpError(401, SIGN_IN_REQUIRED);
  return c.principal.userId;
}

/**
 * The caller's own link. Someone else's code and a code that does not exist are the same 404, so codes cannot be
 * probed. Routes call this before they read the request body for the same reason.
 */
export async function ownedLink(c: Ctx, code: string, notFound = 'Link not found'): Promise<StoredLink> {
  const owner = userId(c);
  const link = await getLink(c.env.DB, code);
  if (!link || link.owner_id !== owner) throw new HttpError(404, notFound);
  return link;
}

/** Go checked the prefix exactly, so `HTTPS://x` is not recognised. The docs promise only this rule. */
export const hasHttpScheme = (address: string): boolean => address.startsWith('http://') || address.startsWith('https://');
