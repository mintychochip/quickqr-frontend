import type { AppDeps } from '../app';
import { giftLink, isGiftToken, newGiftToken, parseNewGift } from '../gifts';
import { bodyObject, errorJson, json } from '../http';
import { sha256Hex } from '../ids';
import type { Router } from '../router';
import { createGrant, listGrants, redeemGrant, revokeGrant } from '../store/gifts';
import { adminRead, adminWrite, sessionWrite } from './policies';
import { signedInEmail, userId } from './shared';

/** One answer for every link that does not work, so nobody can tell a wrong token from a used, expired, or revoked one. */
const NOT_VALID = 'This gift link is not valid.';

/** The answer that carries a token must never be stored by a browser or a proxy. */
const NO_STORE = { 'Cache-Control': 'no-store' };

export function registerGiftRoutes(router: Router, deps: AppDeps): void {
  router.handle('POST /api/gifts/redeem', sessionWrite, async (c) => {
    const person = userId(c);
    const body = bodyObject(await c.json());
    if (!isGiftToken(body.token)) return errorJson(404, NOT_VALID);

    const result = await redeemGrant(c.env.DB, await sha256Hex(body.token), person, deps.now());
    if (result.kind === 'invalid') return errorJson(404, NOT_VALID);
    return json(200, { plan: result.plan, until: result.until, granted: result.kind === 'granted' }, NO_STORE);
  });

  router.handle('POST /api/admin/gifts', adminWrite, async (c) => {
    const parsed = parseNewGift(await c.json(), deps.now());
    if (!parsed.ok) return errorJson(400, parsed.error);

    // The token exists only here: the database keeps its hash, so this answer is the one chance to copy the link.
    const token = newGiftToken();
    const grant = await createGrant(c.env.DB, { ...parsed.value, tokenHash: await sha256Hex(token), createdBy: signedInEmail(c) }, deps.now());
    return json(201, { ...grant, token, link: giftLink(c.env.APP_PUBLIC_URL ?? c.url.origin, token) }, NO_STORE);
  });

  router.handle('GET /api/admin/gifts', adminRead, async (c) => json(200, { gifts: await listGrants(c.env.DB, deps.now()) }));

  router.handle('POST /api/admin/gifts/{id}/revoke', adminWrite, async (c) => {
    const grant = await revokeGrant(c.env.DB, c.param('id'), deps.now());
    return grant ? json(200, grant) : errorJson(404, 'Gift not found');
  });
}
