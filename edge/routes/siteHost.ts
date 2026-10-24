import type { AppDeps } from '../app';
import { html } from '../http';
import { renderLinkPage } from '../pages/linkPage';
import { renderMenu } from '../pages/menu';
import { renderNotFound } from '../pages/notFound';
import { type Ctx, type Router } from '../router';
import { canonicalSiteOrigin, getSiteFile, headSiteFile, siteContentType, sitePath, sitePathFromInternal, SITE_CSP, type SiteObjectBody } from '../sites';
import { getLink, menuCodeForPublishedSite } from '../store/links';
import { LINK_KIND_LINK_PAGE, LINK_KIND_MENU, LINK_KIND_SITE } from '../types';
import { publicNone } from './policies';
import { logScan } from './shared';

/**
 * Every `/s/` response carries the sandbox. A site's HTML runs in an opaque origin, so it cannot read the app's
 * session token in `localStorage`, set cookies, or navigate the top window. This is the rule that makes hosting
 * arbitrary HTML on quickqr.app safe; do not weaken it for a menu or a link page either, which are served here too.
 */
const HTML_HEADERS = {
  'Content-Security-Policy': SITE_CSP,
  'X-Content-Type-Options': 'nosniff',
  'Access-Control-Allow-Origin': '*',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

const UNAVAILABLE_PAGE = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sites are not available | quickqr.app</title>
<style>body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;color:#1b1b1f;background:#fff}main{max-width:32rem}h1{font-size:1.4rem;margin:0 0 .75rem}p{margin:0;color:#52525b;line-height:1.6}</style>
</head><body><main><h1>Sites are not available on this server</h1><p>Menus and link pages still work. The owner of this quickqr deployment has not connected a bucket for hosted sites.</p></main></body></html>`;

function redirect(location: string, status = 301): Response {
  return new Response(null, { status, headers: { Location: location } });
}

interface Target {
  code: string;
  /** The normalized file path, or null when the request tried to leave the site root. */
  path: string | null;
  /** The request is the site root, with or without its trailing slash. */
  root: boolean;
}

function target(c: Ctx): Target | null {
  const parts = c.url.pathname.split('/');
  const code = parts[2] ?? '';
  if (!code) return null;
  let decoded: string[];
  try {
    decoded = parts.slice(3).map(decodeURIComponent);
  } catch {
    return null;
  }
  if (decoded.some((segment) => segment.includes('/') || segment.includes('\\') || segment.includes('\u0000'))) return null;
  return {
    code,
    root: decoded.length === 0 || (decoded.length === 1 && decoded[0] === ''),
    path: sitePath(decoded.join('/')),
  };
}

function siteFile(object: SiteObjectBody, path: string, status: number): Response {
  const headers = new Headers({
    'Content-Type': siteContentType(path),
    'Content-Security-Policy': SITE_CSP,
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
    'Referrer-Policy': 'no-referrer',
    'Cache-Control': 'public, max-age=300',
    'Content-Length': String(object.size),
  });
  if (object.httpEtag) headers.set('ETag', object.httpEtag);
  return new Response(object.body, { status, headers });
}

async function serve(c: Ctx, deps: AppDeps): Promise<Response> {
  // One origin for hosted content: on the app's own origin, send the request to the sites host before anything else,
  // including a missing code, so a shared /s/ link settles on the same address. Local hosts are never redirected.
  const canonical = canonicalSiteOrigin(c.env, c.url, c.req.headers);
  if (canonical) return redirect(`${canonical}${sitePathFromInternal(c.url.pathname)}${c.url.search}`);

  const t = target(c);
  if (!t) return html(404, renderNotFound(''), HTML_HEADERS);

  // As at /r/, a code in the wrong case falls back to its stored lowercase form.
  let code = t.code;
  let link = await getLink(c.env.DB, code);
  if (!link && code !== code.toLowerCase()) {
    code = code.toLowerCase();
    link = await getLink(c.env.DB, code);
  }
  if (!link) return html(404, renderNotFound(code), HTML_HEADERS);

  // The canonical address ends in a slash, so relative files resolve under the site and not under /s/.
  if (t.root && !c.url.pathname.endsWith('/')) return redirect(`${c.url.pathname}/${c.url.search}`);

  const index = t.path === 'index.html';

  if (link.kind === LINK_KIND_MENU || link.kind === LINK_KIND_LINK_PAGE) {
    if (!index) return html(404, renderNotFound(link.code), HTML_HEADERS);
    logScan(c, link.code, deps);
    return html(200, link.kind === LINK_KIND_MENU ? renderMenu(link) : renderLinkPage(link), HTML_HEADERS);
  }

  // A plain dynamic link has no hosted page; /r/ is its address.
  if (link.kind !== LINK_KIND_SITE) return html(404, renderNotFound(link.code), HTML_HEADERS);

  const store = c.env.SITES;
  if (!store) return html(503, UNAVAILABLE_PAGE, HTML_HEADERS);
  if (!t.path) return html(404, renderNotFound(link.code), HTML_HEADERS);

  const file = await getSiteFile(store, link.code, t.path);
  if (file) {
    if (index) {
      // A published menu's site counts the scan as the menu's, the code its QR carries; a plain site counts itself.
      // The lookup must never reject a scan, so a database failure (or a database without 0005) falls back to the site.
      let scanCode = link.code;
      try {
        scanCode = (await menuCodeForPublishedSite(c.env.DB, link.code)) ?? link.code;
      } catch (err) {
        console.error('menu site lookup failed', err);
      }
      logScan(c, scanCode, deps);
    }
    return siteFile(file, t.path, 200);
  }

  // A directory requested without its trailing slash goes to the canonical address, so its relative files resolve
  // under the directory rather than one level up.
  const base = t.path.slice(t.path.lastIndexOf('/') + 1);
  if (!c.url.pathname.endsWith('/') && !base.includes('.')) {
    if (await headSiteFile(store, link.code, `${t.path}/index.html`)) return redirect(`${c.url.pathname}/${c.url.search}`);
  }

  const custom = await getSiteFile(store, link.code, '404.html');
  if (custom) return siteFile(custom, '404.html', 404);
  return html(404, renderNotFound(link.code), HTML_HEADERS);
}

export function registerSiteHostRoutes(router: Router, deps: AppDeps): void {
  router.handle('/s/', publicNone, (c) => serve(c, deps));
}
