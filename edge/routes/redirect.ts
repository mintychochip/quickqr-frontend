import type { AppDeps } from '../app';
import { html } from '../http';
import { renderInterstitial } from '../pages/interstitial';
import { renderLinkPage } from '../pages/linkPage';
import { renderMenu } from '../pages/menu';
import { renderNotFound } from '../pages/notFound';
import { notFound, type Ctx, type Router } from '../router';
import { sitePublicUrl } from '../sites';
import { getLink } from '../store/links';
import { readPause } from '../store/scans';
import { LINK_KIND_LINK_PAGE, LINK_KIND_MENU, LINK_KIND_SITE } from '../types';
import { publicNone } from './policies';
import { logScan } from './shared';

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

/**
 * A destination as a header value: anything outside printable ASCII is percent-encoded as UTF-8. A header cannot carry
 * other characters, and a CR or LF in one would let a stored address add headers of its own.
 */
function locationHeader(destination: string): string {
  const encoder = new TextEncoder();
  return Array.from(destination, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x20 && code <= 0x7e) return ch;
    return Array.from(encoder.encode(ch), (byte) => `%${byte.toString(16).toUpperCase().padStart(2, '0')}`).join('');
  }).join('');
}

export function registerRedirectRoutes(router: Router, deps: AppDeps): void {
  const gateway = async (c: Ctx): Promise<Response> => {
    const parts = decodeURIComponent(c.url.pathname).replace(/^\/+|\/+$/g, '').split('/');
    if (parts.length < 2 || parts[0]?.toLowerCase() !== 'r') return notFound();

    let code = parts[1] ?? '';
    let link = await getLink(c.env.DB, code);
    if (!link && code !== code.toLowerCase()) {
      code = code.toLowerCase();
      link = await getLink(c.env.DB, code);
    }
    if (!link) return html(404, renderNotFound(code));

    // A site is hosted at its own address so relative files resolve; the index request there records the scan, so
    // this redirect does not log one twice. /s/ is where a site's bytes and its scan counting both live.
    if (link.kind === LINK_KIND_SITE) {
      return new Response(null, { status: 302, headers: { Location: locationHeader(sitePublicUrl(c.env, c.url, link.code)) } });
    }

    // Recording must never hold up or break a scan, so it runs after the response and its failure is only logged.
    logScan(c, code, deps);

    if (link.kind === LINK_KIND_MENU) return html(200, renderMenu(link), NO_CACHE);
    if (link.kind === LINK_KIND_LINK_PAGE) return html(200, renderLinkPage(link), NO_CACHE);
    // The pause is for owners on the free plan, and a plan (a gift, today) takes it away. Only a scan that would show
    // the pause asks for the owner's plan, and it rides in the same round trip as the sponsor.
    const wantsDirect = c.url.searchParams.get('direct') === '1' || link.ad_style === 'direct';
    const pause = wantsDirect ? null : await readPause(c.env.DB, link.owner_id, deps.now());
    if (!pause || pause.plan !== 'free') {
      return new Response(null, { status: 302, headers: { Location: locationHeader(link.destination_url) } });
    }
    return html(200, renderInterstitial(link, pause.sponsor), NO_CACHE);
  };

  router.handle('/r/', publicNone, gateway);
  router.handle('/R/', publicNone, gateway);
}
