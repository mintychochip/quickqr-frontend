import { escapeHtml } from '../pages/html';
import { renderPreviewFallback, TITLE_SUFFIX } from '../pages/preview';
import { renderPng } from '../qr/png';
import { encodeMatrix, type Matrix } from '../qr/matrix';
import { renderSvg } from '../qr/svg';
import type { Ctx, Router } from '../router';
import { publicEmbed } from './policies';

const MAX_TARGET_LENGTH = 2048;

/** The address cannot be used for a code. The message is shown to whoever asked, as plain text. */
export class TargetError extends Error {}

const byteLength = (text: string): number => new TextEncoder().encode(text).length;

/**
 * The address a code is made for. A missing scheme is https; anything but http(s) with a host is refused, so a code
 * from here can never open `javascript:` or `data:`. The checks run in Go's order, on the text as given, because the
 * URL parser is more forgiving than Go's (it reads `http:///x` as host `x`).
 */
export function normalizeTargetUrl(raw: string): string {
  raw = raw.trim();
  if (!raw) throw new TargetError('url is required');
  if (byteLength(raw) > MAX_TARGET_LENGTH) throw new TargetError('url is too long');

  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`;
  const scheme = candidate.slice(0, candidate.indexOf(':')).toLowerCase();
  if (scheme !== 'http' && scheme !== 'https') throw new TargetError('url must start with http:// or https://');

  const rest = candidate.slice(scheme.length + 1);
  const authority = rest.startsWith('//') ? (rest.slice(2).split(/[/?#]/)[0] ?? '') : '';
  if (!authority.slice(authority.lastIndexOf('@') + 1)) throw new TargetError('url must include a host');

  let href: string;
  try {
    href = new URL(candidate).href;
  } catch {
    throw new TargetError('url is not valid');
  }
  if (byteLength(href) > MAX_TARGET_LENGTH) throw new TargetError('url is too long');
  return href;
}

/** Go's url.QueryEscape: everything but letters, digits and `-_.~` is escaped, and a space is a plus. */
const queryEscape = (value: string): string =>
  encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+');

function displayHost(target: string): string {
  try {
    return new URL(target).hostname.replace(/^www\./, '') || 'your link';
  } catch {
    return 'your link';
  }
}

function truncate(value: string, max: number): string {
  const characters = Array.from(value);
  return characters.length <= max ? value : `${characters.slice(0, max - 1).join('')}…`;
}

const firstValue = (header: string | null): string => (header ?? '').split(',')[0]?.trim() ?? '';

/**
 * The address people used to reach this page, for the absolute links in its tags. A proxy in front reports its own view
 * in X-Forwarded-*; the page is sent `no-store` and only ever shows these to the one who sent them.
 */
function publicBaseUrl(c: Ctx): string {
  const proto = firstValue(c.req.headers.get('X-Forwarded-Proto'));
  const scheme = proto === 'http' || proto === 'https' ? proto : c.url.protocol.slice(0, -1);
  return `${scheme}://${firstValue(c.req.headers.get('X-Forwarded-Host')) || c.url.host}`;
}

/** The site's own index page, which the share page is built on. Null when it cannot be read. */
async function siteIndex(c: Ctx): Promise<string | null> {
  if (!c.env.ASSETS) return null;
  try {
    const res = await c.env.ASSETS.fetch(new Request(new URL('/', c.url)));
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

const TITLE_TAG = /<title>[\s\S]*?<\/title>/g;
const DESCRIPTION_TAG = /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/g;

const plain = (status: number, body: string): Response =>
  new Response(`${body}\n`, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' } });

export function registerEmbedRoutes(router: Router): void {
  router.handle('GET /qr', publicEmbed, async (c) => {
    let target = '';
    try {
      target = normalizeTargetUrl(c.url.searchParams.get('url') ?? '');
    } catch (err) {
      if (!(err instanceof TargetError)) throw err; // the page still loads, and the site itself explains what is wrong
    }

    const base = publicBaseUrl(c);
    let pageTitle = `Create a QR code${TITLE_SUFFIX}`;
    let description = 'Paste any link to get a scannable QR code. Share the page or copy an embed.';
    let card = 'summary';
    let canonical = `${base}/qr`;
    let imageUrl = '';
    const tags: string[] = [];
    if (target) {
      pageTitle = `QR code for ${displayHost(target)}${TITLE_SUFFIX}`;
      description = `Scan to open ${truncate(target, 240)}`;
      canonical += `?url=${queryEscape(target)}`;
      imageUrl = `${base}/qr.png?url=${queryEscape(target)}`;
      card = 'summary_large_image';
      tags.push(
        `<meta property="og:image" content="${escapeHtml(imageUrl)}">`,
        `<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">`,
        '<meta property="og:image:type" content="image/png">',
        '<meta property="og:image:width" content="1024">',
        '<meta property="og:image:height" content="1024">',
        '<meta property="og:image:alt" content="QR code">',
        `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`,
      );
    }
    const shortTitle = escapeHtml(pageTitle.slice(0, -TITLE_SUFFIX.length));
    tags.push(
      `<meta property="og:title" content="${shortTitle}">`,
      `<meta property="og:description" content="${escapeHtml(description)}">`,
      `<meta property="og:url" content="${escapeHtml(canonical)}">`,
      '<meta property="og:type" content="website">',
      '<meta property="og:site_name" content="quickqr.app">',
      `<meta name="twitter:card" content="${card}">`,
      `<meta name="twitter:title" content="${shortTitle}">`,
      `<meta name="twitter:description" content="${escapeHtml(description)}">`,
      `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    );
    const meta = tags.map((tag) => `\n    ${tag}`).join('');

    // The replacements are functions so a `$` in an address is never read as a replacement pattern.
    const index = await siteIndex(c);
    const page =
      index === null
        ? renderPreviewFallback(pageTitle, description, meta, target, imageUrl)
        : index
            .replace(TITLE_TAG, () => `<title>${escapeHtml(pageTitle)}</title>`)
            .replace(DESCRIPTION_TAG, () => `<meta name="description" content="${escapeHtml(description)}" />`)
            .replace('</head>', () => `${meta}\n  </head>`);
    return new Response(page, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  });

  const image = async (c: Ctx, render: (code: Matrix) => Promise<BodyInit>, headers: Record<string, string>): Promise<Response> => {
    let code: Matrix;
    try {
      code = encodeMatrix(normalizeTargetUrl(c.url.searchParams.get('url') ?? ''));
    } catch (err) {
      return plain(400, err instanceof TargetError ? err.message : 'This link is too long for a QR code');
    }
    return new Response(await render(code), {
      headers: { ...headers, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' },
    });
  };

  router.handle('GET /qr.png', publicEmbed, (c) =>
    image(c, renderPng, { 'Content-Type': 'image/png', 'Content-Disposition': 'inline; filename="quickqr.png"' }),
  );
  router.handle('GET /qr.svg', publicEmbed, (c) =>
    image(c, async (code) => renderSvg(code), { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Content-Disposition': 'inline; filename="quickqr.svg"' }),
  );
}
