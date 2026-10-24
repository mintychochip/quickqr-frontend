import type { AppDeps } from '../app';
import { HttpError } from '../http';
import { SIGN_IN_REQUIRED, type Ctx } from '../router';
import { effectivePlan } from '../store/entitlements';
import { getLink } from '../store/links';
import { isProxyRequest } from '../sites';
import { recordScan } from '../store/scans';
import type { StoredLink } from '../types';
import { detectBrowser, detectDevice } from '../useragent';

/** The signed-in person's id. Routes that need one are registered with an `any` policy, so this is a guard, not a gate. */
export function userId(c: Ctx): string {
  if (!c.principal) throw new HttpError(401, SIGN_IN_REQUIRED);
  return c.principal.userId;
}

/** The signed-in person's email. Like `userId`, a guard for routes whose policy already requires a session. */
export function signedInEmail(c: Ctx): string {
  if (!c.principal) throw new HttpError(401, SIGN_IN_REQUIRED);
  return c.principal.email;
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

/**
 * The hosted backend's Pro rule for a hosted write. The session and ownership checks are the router's and
 * `ownedLink`'s job; this reads the same plan `GET /api/auth/me` reports. A read that fails counts as Free, so a
 * database without 0002 refuses the write instead of granting it.
 */
export async function requirePro(c: Ctx, deps: AppDeps, message: string): Promise<void> {
  const { plan } = await effectivePlan(c.env.DB, userId(c), deps.now());
  if (plan !== 'pro') throw new HttpError(403, message);
}

/**
 * Records a scan after the response, so it never holds up or breaks the visit. `/r/` and `/s/` both use this: a site
 * logs its index there, and `/r/` does not log a site again before redirecting to it.
 */
function scanAddress(c: Ctx): string {
  // Only the sites host Worker may name the client: it holds the shared key and copies the address Cloudflare gave it.
  if (isProxyRequest(c.env, c.req.headers)) {
    const forwarded = c.req.headers.get('X-Quickqr-Client-IP') ?? '';
    if (forwarded) return forwarded;
  }
  return c.req.headers.get('CF-Connecting-IP') ?? '';
}

export function logScan(c: Ctx, code: string, deps: AppDeps): void {
  const userAgent = c.req.headers.get('User-Agent') ?? '';
  c.exec.waitUntil(
    recordScan(
      c.env.DB,
      {
        linkCode: code,
        timestamp: deps.now(),
        ip: scanAddress(c),
        userAgent,
        deviceType: detectDevice(userAgent),
        browser: detectBrowser(userAgent),
        referrer: c.req.headers.get('Referer') || 'Direct Scan',
        country: 'US',
        city: 'Local',
      },
      c.env.SCAN_HASH_KEY,
    ).catch((err) => console.error('scan not recorded', err)),
  );
}

/** Go checked the prefix exactly, so `HTTPS://x` is not recognised. The docs promise only this rule. */
export const hasHttpScheme = (address: string): boolean => address.startsWith('http://') || address.startsWith('https://');
