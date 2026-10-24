import type { AppDeps } from '../app';
import { bodyObject, errorJson, json, stringValue } from '../http';
import { mergeQRStyle } from '../qrStyle';
import type { Router } from '../router';
import { isStoreError } from '../store/errors';
import { updateLinkSettings, type LinkSettingsChange } from '../store/links';
import { refreshPublishedMenu } from './menuPublish';
import { LINK_KIND_MENU, LINK_KIND_SITE, type Link } from '../types';
import { publicRead, readPolicy, SCOPES, writePolicy } from './policies';
import { hasHttpScheme, ownedLink } from './shared';

const AD_STYLES: readonly string[] = ['interstitial_3s', 'sponsor_banner', 'direct'];
const SETTINGS = ['title', 'destination_url', 'ad_style', 'style'];
const NOT_FOUND = 'QR code not found';

const INDEX = {
  resource: 'qr',
  routes: [
    { method: 'GET', path: '/api/qr', about: 'List the QR routes.' },
    {
      method: 'POST',
      path: '/api/qr/style',
      about: 'Turn a prompt, notes, and photos into a style. Nothing is saved. The older path /api/qr/style-agent does the same thing.',
    },
    { method: 'POST', path: '/api/qr/context', about: 'Read a public site into a short note the style agent can use. Nothing is saved.' },
    { method: 'GET', path: '/api/qr/{code}/settings', about: 'Read the editable settings for one QR code.' },
    { method: 'PATCH', path: '/api/qr/{code}/settings', about: 'Change any settings you include. Fields you leave out stay as they are.' },
  ],
};

/** The settings a client may change, and which of them this link allows. A hosted page is served at a fixed address. */
function fields(link: Link) {
  const hosted = link.kind === LINK_KIND_MENU || link.kind === LINK_KIND_SITE;
  const noun = link.kind === LINK_KIND_SITE ? 'site' : 'menu';
  return [
    { name: 'title', type: 'string', editable: true, about: 'Name shown in the dashboard.' },
    { name: 'destination_url', type: 'url', editable: !hosted, about: hosted ? `A ${noun} keeps its public address.` : 'Where this code sends people.' },
    {
      name: 'ad_style',
      type: 'enum',
      editable: !hosted,
      values: AD_STYLES,
      about: hosted ? `A ${noun} is served as a page, not an ad redirect.` : 'What a scan shows before the destination.',
    },
    { name: 'style', type: 'object', editable: true, about: 'Colors and shape used when this code is drawn.' },
  ];
}

const settingsBody = (link: Link) => ({
  resource: 'qr.settings',
  code: link.code,
  kind: link.kind ?? '',
  settings: { title: link.title, destination_url: link.destination_url, ad_style: link.ad_style, style: link.style ?? null },
  fields: fields(link),
});

export function registerQrRoutes(router: Router, deps: AppDeps): void {
  router.handle('GET /api/qr', publicRead, () => json(200, INDEX));

  router.handle('GET /api/qr/{code}/settings', readPolicy(SCOPES.linksRead), async (c) => json(200, settingsBody(await ownedLink(c, c.param('code'), NOT_FOUND))));

  router.handle('PATCH /api/qr/{code}/settings', writePolicy(SCOPES.linksWrite), async (c) => {
    const code = c.param('code');
    const link = await ownedLink(c, code, NOT_FOUND);
    const body = bodyObject(await c.json());
    for (const key of Object.keys(body)) if (!SETTINGS.includes(key)) return errorJson(400, `Unknown setting: ${key}`);

    const hosted = link.kind === LINK_KIND_MENU || link.kind === LINK_KIND_SITE;
    const noun = link.kind === LINK_KIND_SITE ? 'site' : 'menu';
    const change: LinkSettingsChange = {};
    if ('title' in body) change.title = stringValue(body.title, 'title');
    if ('destination_url' in body) {
      if (hosted) return errorJson(400, `A ${noun} keeps its public address`);
      const destination = stringValue(body.destination_url, 'destination_url').trim();
      if (!destination) return errorJson(400, 'destination_url is required');
      change.destinationUrl = hasHttpScheme(destination) ? destination : `https://${destination}`;
    }
    if ('ad_style' in body) {
      if (hosted) return errorJson(400, `A ${noun} does not use an ad style`);
      const adStyle = stringValue(body.ad_style, 'ad_style');
      if (!AD_STYLES.includes(adStyle)) return errorJson(400, 'ad_style must be interstitial_3s, sponsor_banner, or direct');
      change.adStyle = adStyle;
    }
    if ('style' in body) change.style = mergeQRStyle(link.style, body.style);

    try {
      const updated = await updateLinkSettings(c.env.DB, code, change, deps.now());
      if (updated.kind === LINK_KIND_MENU) await refreshPublishedMenu(c.env.DB, c.env.SITES, updated, deps.now());
      return json(200, settingsBody(updated));
    } catch (err) {
      if (isStoreError(err, 'not_found')) return errorJson(404, NOT_FOUND);
      throw err;
    }
  });
}
