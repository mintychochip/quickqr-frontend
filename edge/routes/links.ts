import type { AppDeps } from '../app';
import { bodyObject, errorJson, json, stringField } from '../http';
import { randomCode } from '../ids';
import type { Router } from '../router';
import { isStoreError } from '../store/errors';
import { createLink, deleteLink, listLinksByOwner, toPublicLink, updateLink } from '../store/links';
import { getActiveSponsor, getAnalytics, getAnalyticsForOwner } from '../store/scans';
import { publicNone, publicRead, readPolicy, SCOPES, writePolicy } from './policies';
import { hasHttpScheme, ownedLink, userId } from './shared';

const DEFAULT_TITLE = 'Dynamic QR Link';
const DEFAULT_AD_STYLE = 'interstitial_3s';

export function registerLinkRoutes(router: Router, deps: AppDeps): void {
  router.handle('GET /healthz', publicNone, () =>
    json(200, { status: 'healthy', service: 'quickqr2-api', time: deps.now().toISOString().replace(/\.\d{3}Z$/, 'Z') }),
  );

  router.handle('GET /api/sponsors/active', publicRead, async (c) => json(200, { sponsor: await getActiveSponsor(c.env.DB) }));

  // There is no LAN to point a phone at on the edge: the answer Go gives a machine with no private address.
  router.handle('GET /api/scan-host', publicRead, () => json(200, { host: '' }));

  router.handle('POST /api/links', writePolicy(SCOPES.linksWrite), async (c) => {
    const owner = userId(c);
    const body = bodyObject(await c.json());
    // Every field is read before any is judged, so a wrong type is "Invalid request body" whichever field it is in.
    const requestedCode = stringField(body, 'code');
    const requestedTitle = stringField(body, 'title');
    const destination = stringField(body, 'destination_url').trim();
    const requestedStyle = stringField(body, 'ad_style');
    if (!destination) return errorJson(400, 'destination_url is required');

    try {
      const link = await createLink(
        c.env.DB,
        {
          code: requestedCode.trim() || randomCode(6),
          title: requestedTitle.trim() || DEFAULT_TITLE,
          destinationUrl: hasHttpScheme(destination) ? destination : `https://${destination}`,
          adStyle: requestedStyle || DEFAULT_AD_STYLE,
          ownerId: owner,
        },
        deps.now(),
      );
      return json(201, link);
    } catch (err) {
      if (isStoreError(err, 'conflict')) return errorJson(409, 'Code already exists. Please choose a different custom slug.');
      throw err;
    }
  });

  router.handle('GET /api/links', readPolicy(SCOPES.linksRead), async (c) => {
    const links = await listLinksByOwner(c.env.DB, userId(c));
    return json(200, { links, count: links.length });
  });

  router.handle('GET /api/links/{code}', readPolicy(SCOPES.linksRead), async (c) => json(200, toPublicLink(await ownedLink(c, c.param('code')))));

  router.handle('PUT /api/links/{code}', writePolicy(SCOPES.linksWrite), async (c) => {
    const code = c.param('code');
    await ownedLink(c, code);
    const body = bodyObject(await c.json());
    const destination = stringField(body, 'destination_url').trim();
    const title = stringField(body, 'title');
    const adStyle = stringField(body, 'ad_style');
    try {
      const updated = await updateLink(c.env.DB, code, destination && !hasHttpScheme(destination) ? `https://${destination}` : destination, title, adStyle, deps.now());
      return json(200, updated);
    } catch (err) {
      if (isStoreError(err, 'not_found')) return errorJson(404, 'Link not found');
      throw err;
    }
  });

  router.handle('DELETE /api/links/{code}', writePolicy(SCOPES.linksWrite), async (c) => {
    const code = c.param('code');
    await ownedLink(c, code);
    try {
      await deleteLink(c.env.DB, code);
    } catch (err) {
      if (isStoreError(err, 'not_found')) return errorJson(404, 'Link not found');
      throw err;
    }
    return json(200, { message: 'deleted' });
  });

  router.handle('GET /api/links/{code}/analytics', readPolicy(SCOPES.analyticsRead), async (c) => {
    await ownedLink(c, c.param('code'));
    return json(200, await getAnalytics(c.env.DB, c.param('code'), deps.now()));
  });

  router.handle('GET /api/analytics/global', readPolicy(SCOPES.analyticsRead), async (c) =>
    json(200, await getAnalyticsForOwner(c.env.DB, userId(c), deps.now())),
  );
}
