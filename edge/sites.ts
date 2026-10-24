import type { Env } from './env';
import { HttpError } from './http';

/**
 * A site's files live in R2 under `sites/<code>/<path>`; nothing about them is mirrored in D1. The caps are small on
 * purpose: every file is read whole on upload, every list is one R2 page, and the free R2 tier holds about a thousand
 * full sites.
 */
export const SITE_FILE_CAP = 1 << 20;
export const SITE_FILES_MAX = 64;
export const SITE_TOTAL_CAP = 10 << 20;
export const SITE_PATH_CAP = 200;
const SITE_SEGMENT_CAP = 100;

export const SITE_CSP = 'sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads';
export const SITE_PATH_INVALID = 'That path is not a safe site path';
export const SITE_FILE_TOO_LARGE = 'A file may be at most 1 MiB';
export const SITE_FULL = 'A site may hold at most 64 files';
export const SITE_TOO_LARGE = 'A site may hold at most 10 MiB';
export const SITE_UNAVAILABLE = 'Sites are not available on this server.';
export const SITES_PRO_ONLY = 'Sites are a Pro feature.';
export const SITE_NOT_FOUND = 'Site not found';
export const SITE_FILE_NOT_FOUND = 'File not found';

/** The part of R2 the site host uses. Tests stand in with an in-memory implementation. */
export interface SiteObject {
  key: string;
  size: number;
  uploaded: Date;
  httpEtag?: string;
}

export interface SiteObjectBody extends SiteObject {
  body: ReadableStream | null;
}

export interface SiteBucket {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | ReadableStream | Blob | null,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<SiteObjectBody | null>;
  head(key: string): Promise<SiteObject | null>;
  delete(keys: string | string[]): Promise<unknown>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ objects: SiteObject[]; truncated: boolean; cursor?: string }>;
}

export const DOMAIN_INVALID = 'Give a domain like cafe.example.com';
export const DOMAIN_OWN = 'That is a quickqr address, not a customer domain.';
export const DOMAIN_TAKEN = 'That domain is already attached to another site.';
export const DOMAIN_MISSING = 'Add a domain first.';

export type DomainCheck = { domain: string } | { error: string };

/**
 * A customer domain, lowercased, as a bare hostname. A scheme is accepted; a path, query, port, wildcard, or
 * credentials are rejected rather than silently dropped. The name must be a normal DNS name, not an IP literal, a
 * local name, or one of quickqr's own addresses.
 */
export function normalizeDomain(raw: string): DomainCheck {
  let value = raw.trim().toLowerCase();
  if (!value) return { error: DOMAIN_INVALID };
  if (!value.includes('://')) value = `https://${value}`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { error: DOMAIN_INVALID };
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password || url.port) return { error: DOMAIN_INVALID };
  if (url.pathname !== '/' || url.search || url.hash) return { error: DOMAIN_INVALID };
  const host = url.hostname.replace(/\.$/, '');
  if (!host || host.length > 253 || !host.includes('.') || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.startsWith('[')) return { error: DOMAIN_INVALID };
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return { error: DOMAIN_INVALID };
  if (host === 'quickqr.app' || host.endsWith('.quickqr.app')) return { error: DOMAIN_OWN };
  const labels = host.split('.');
  if (labels.length < 2 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return { error: DOMAIN_INVALID };
  return { domain: host };
}

/** Where a domain must forward: the site's public address, absolute even when this request is on another host. */
export function siteForwardTarget(env: Env, url: URL, code: string): string {
  const origin = (env.SITES_PUBLIC_URL || url.origin).replace(/\/+$/, '');
  return `${origin}/s/${code}/`;
}

export function domainInstructions(domain: string, target: string): string {
  return `At your DNS provider, forward https://${domain}/ to ${target} with URL forwarding (a 301 or 302 both work). A plain CNAME does not forward the root path, and an external apex domain needs a provider that offers forwarding.`;
}

/** True when a redirect location is the site's own address (or a path inside it) on the expected origin. */
export function forwardsToSite(location: string, target: string): boolean {
  try {
    const seen = new URL(location);
    const want = new URL(target);
    if (seen.origin !== want.origin) return false;
    const base = want.pathname.replace(/\/+$/, '');
    return seen.pathname === base || seen.pathname.startsWith(`${base}/`);
  } catch {
    return false;
  }
}

export interface SiteDomainView {
  domain: string | null;
  target: string;
  status: 'unset' | 'pending' | 'verified';
  verified_at: string | null;
  instructions: string | null;
}

export interface SiteFile {
  path: string;
  size: number;
  content_type: string;
  uploaded_at: string;
}

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  htm: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  map: 'application/json; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  svg: 'image/svg+xml',
  xml: 'application/xml; charset=utf-8',
  webmanifest: 'application/manifest+json',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  ico: 'image/x-icon',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  pdf: 'application/pdf',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

/** The type is decided by the extension, never by the upload's Content-Type. */
export function siteContentType(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
  return TYPES[ext] ?? 'application/octet-stream';
}

/**
 * A site path relative to its root, or null when it is not safe. The empty path and a bare `/` are the index. A
 * trailing slash means a directory and reads as its index.
 */
export function sitePath(raw: string): string | null {
  let path = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  if (path === '') return 'index.html';
  if (path.length > SITE_PATH_CAP) return null;
  if (path.includes('//')) return null;
  if (path.endsWith('/')) path += 'index.html';
  for (const segment of path.split('/')) {
    if (!segment || segment.length > SITE_SEGMENT_CAP) return null;
    if (segment === '.' || segment === '..') return null;
    for (const character of segment) {
      const code = character.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f || character === '?' || character === '#') return null;
    }
  }
  return path;
}

/** True for a host that can only be a local development server; it never redirects to the public sites origin. */
export function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/**
 * The public sites origin to send a request to, without a trailing slash, or '' when this server has none, the
 * request is already there, or it is local. The sites host is canonical: the app's own origin answers `/s/` with a
 * 301 to it, so hosted content always keeps one origin.
 */
export function isProxyRequest(env: Env, headers: Headers): boolean {
  const key = env.SITES_PROXY_KEY;
  return Boolean(key) && headers.get('X-Quickqr-Proxy-Key') === key;
}

/**
 * The public sites origin to send a request to, without a trailing slash, or '' when this server has none, the
 * request is already there, it is local, or it came through the sites host Worker. The Worker's key lets the Pages
 * origin serve instead of redirecting to itself.
 */
export function canonicalSiteOrigin(env: Env, url: URL, headers?: Headers): string {
  if (headers && isProxyRequest(env, headers)) return '';
  const origin = (env.SITES_PUBLIC_URL ?? '').replace(/\/+$/, '');
  if (!origin || isLocalHost(url.hostname)) return '';
  try {
    // Hostnames, not hosts: a local run reaches the sites name on a test port, and the public origin is always 443.
    return new URL(origin).hostname === url.hostname ? '' : origin;
  } catch {
    return '';
  }
}

/** The public address of a site, absolute when this server has a different public sites origin. */
export function sitePublicUrl(env: Env, url: URL, code: string, headers?: Headers): string {
  const origin = canonicalSiteOrigin(env, url, headers);
  return origin ? `${origin}/s/${code}/` : `/s/${code}/`;
}

export const sitePrefix = (code: string): string => `sites/${code}/`;
export const siteKey = (code: string, path: string): string => `${sitePrefix(code)}${path}`;

/** Every file a site has, sorted by path. R2 lists by key, so paging is on one prefix. */
export async function listSiteFiles(bucket: SiteBucket, code: string): Promise<SiteFile[]> {
  const prefix = sitePrefix(code);
  const files: SiteFile[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, limit: 1000, cursor });
    for (const object of page.objects) {
      const path = object.key.slice(prefix.length);
      if (!path) continue;
      files.push({
        path,
        size: object.size,
        content_type: siteContentType(path),
        uploaded_at: (object.uploaded ?? new Date(0)).toISOString(),
      });
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export function headSiteFile(bucket: SiteBucket, code: string, path: string): Promise<SiteObject | null> {
  return bucket.head(siteKey(code, path));
}

export function getSiteFile(bucket: SiteBucket, code: string, path: string): Promise<SiteObjectBody | null> {
  return bucket.get(siteKey(code, path));
}

/** Rejects a write that would pass a cap, counting the file being replaced at its new size. */
export async function enforceSiteCaps(bucket: SiteBucket, code: string, path: string, size: number): Promise<void> {
  if (size > SITE_FILE_CAP) throw new HttpError(413, SITE_FILE_TOO_LARGE);
  const files = await listSiteFiles(bucket, code);
  const existing = files.find((file) => file.path === path);
  if (files.length + (existing ? 0 : 1) > SITE_FILES_MAX) throw new HttpError(413, SITE_FULL);
  const total = files.reduce((sum, file) => sum + file.size, 0) - (existing?.size ?? 0) + size;
  if (total > SITE_TOTAL_CAP) throw new HttpError(413, SITE_TOO_LARGE);
}

export async function putSiteFile(bucket: SiteBucket, code: string, path: string, bytes: Uint8Array): Promise<void> {
  await bucket.put(siteKey(code, path), bytes, {
    httpMetadata: { contentType: siteContentType(path), cacheControl: 'public, max-age=300' },
  });
}

export async function deleteSiteFile(bucket: SiteBucket, code: string, path: string): Promise<void> {
  await bucket.delete(siteKey(code, path));
}

/** Removes every file of one site. Idempotent: a code with no files is not an error. */
export async function purgeSite(bucket: SiteBucket, code: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: sitePrefix(code), limit: 1000, cursor });
    const keys = page.objects.map((object) => object.key);
    if (keys.length > 0) await bucket.delete(keys);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
