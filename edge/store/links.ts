import type { Db } from '../db';
import { randomCode } from '../ids';
import { normalizeMenuDesign, type MenuDesign } from '../menuDesign';
import { LINK_KIND_LINK_PAGE, LINK_KIND_MENU, LINK_KIND_SITE, type Link, type MenuItem, type PageLink, type QRStyle, type StoredLink } from '../types';
import { StoreError } from './errors';

interface LinkRow {
  id: string;
  code: string;
  owner_id: string;
  title: string;
  destination_url: string;
  ad_style: string;
  is_active: number;
  kind: string;
  items: string | null;
  links: string | null;
  style: string | null;
  menu_design: string | null;
  published_site_code: string | null;
  domain: string | null;
  domain_verified_at: string | null;
  total_scans: number;
  created_at: string;
  updated_at: string;
}

function toStored(row: LinkRow): StoredLink {
  const link: StoredLink = {
    id: row.id,
    code: row.code,
    title: row.title,
    destination_url: row.destination_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    total_scans: row.total_scans,
    ad_style: row.ad_style,
    is_active: row.is_active === 1,
    owner_id: row.owner_id,
  };
  // The optional fields are left off the object when empty, as the Go server omits them from its JSON.
  if (row.kind) link.kind = row.kind;
  if (row.items) link.items = JSON.parse(row.items) as MenuItem[];
  if (row.links) link.links = JSON.parse(row.links) as PageLink[];
  if (row.style) link.style = JSON.parse(row.style) as QRStyle;
  if (row.menu_design) {
    try {
      const parsed = JSON.parse(row.menu_design) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
        link.design = normalizeMenuDesign(parsed);
      }
    } catch {
      // An old or malformed row is unbranded; a scan must still render.
    }
  }
  if (row.published_site_code) link.published_site_code = row.published_site_code;
  if (row.domain) link.domain = row.domain;
  if (row.domain_verified_at) link.domain_verified_at = row.domain_verified_at;
  return link;
}

/** What a client may see: everything but the owner. */
export function toPublicLink(link: StoredLink): Link {
  const copy: Partial<StoredLink> = { ...link };
  delete copy.owner_id;
  return copy as Link;
}

async function loadPublic(db: Db, code: string): Promise<Link> {
  const row = await db.prepare('SELECT * FROM links WHERE code = ?').bind(code).first<LinkRow>();
  if (!row) throw new StoreError('not_found');
  return toPublicLink(toStored(row));
}

export interface NewLink {
  code: string;
  title: string;
  destinationUrl: string;
  adStyle: string;
  ownerId: string;
}

export async function createLink(db: Db, input: NewLink, now = new Date()): Promise<Link> {
  if (!input.ownerId) throw new StoreError('owner_required');
  const ts = now.toISOString();
  const res = await db
    .prepare(
      "INSERT OR IGNORE INTO links (id, code, owner_id, title, destination_url, ad_style, is_active, kind, total_scans, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, '', 0, ?, ?)",
    )
    .bind(`lnk-${randomCode(8)}`, input.code, input.ownerId, input.title, input.destinationUrl, input.adStyle, ts, ts)
    .run();
  if (res.meta.changes === 0) throw new StoreError('conflict');
  return loadPublic(db, input.code);
}

/** The active link at this exact code, owner included. Callers decide who may see it. */
export async function getLink(db: Db, code: string): Promise<StoredLink | null> {
  const row = await db.prepare('SELECT * FROM links WHERE code = ? AND is_active = 1').bind(code).first<LinkRow>();
  return row ? toStored(row) : null;
}

/** The links a person created, newest first, ties broken by code. */
export async function listLinksByOwner(db: Db, ownerId: string): Promise<Link[]> {
  if (!ownerId) return [];
  const { results } = await db.prepare('SELECT * FROM links WHERE owner_id = ? ORDER BY created_at DESC, code ASC').bind(ownerId).all<LinkRow>();
  return results.map((row) => toPublicLink(toStored(row)));
}

/** Empty strings leave a field as it is. */
export async function updateLink(db: Db, code: string, destinationUrl: string, title: string, adStyle: string, now = new Date()): Promise<Link> {
  const res = await db
    .prepare(
      "UPDATE links SET destination_url = COALESCE(NULLIF(?, ''), destination_url), title = COALESCE(NULLIF(?, ''), title), ad_style = COALESCE(NULLIF(?, ''), ad_style), updated_at = ? WHERE code = ?",
    )
    .bind(destinationUrl, title, adStyle, now.toISOString(), code)
    .run();
  if (res.meta.changes === 0) throw new StoreError('not_found');
  return loadPublic(db, code);
}

/** A partial update: an absent field stays as it is. `style: null` clears the saved style. */
export interface LinkSettingsChange {
  title?: string;
  destinationUrl?: string;
  adStyle?: string;
  style?: QRStyle | null;
}

export async function updateLinkSettings(db: Db, code: string, change: LinkSettingsChange, now = new Date()): Promise<Link> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (change.title !== undefined) {
    sets.push('title = ?');
    values.push(change.title.trim());
  }
  if (change.destinationUrl !== undefined) {
    sets.push('destination_url = ?');
    values.push(change.destinationUrl.trim());
  }
  if (change.adStyle !== undefined) {
    sets.push('ad_style = ?');
    values.push(change.adStyle);
  }
  if (change.style !== undefined) {
    sets.push('style = ?');
    values.push(change.style === null ? null : JSON.stringify(change.style));
  }
  sets.push('updated_at = ?');
  values.push(now.toISOString());
  const res = await db
    .prepare(`UPDATE links SET ${sets.join(', ')} WHERE code = ? AND is_active = 1`)
    .bind(...values, code)
    .run();
  if (res.meta.changes === 0) throw new StoreError('not_found');
  return loadPublic(db, code);
}

/** Deletes a link; its scans go with it. */
export async function deleteLink(db: Db, code: string): Promise<void> {
  const res = await db.prepare('DELETE FROM links WHERE code = ?').bind(code).run();
  if (res.meta.changes === 0) throw new StoreError('not_found');
}

function normalizeMenu(title: string, items: MenuItem[]): { title: string; items: MenuItem[] } {
  title = title.trim();
  if (!title || items.length === 0) throw new StoreError('invalid_menu');
  const out = items.map((item) => ({ name: item.name.trim(), price: item.price.trim() }));
  if (out.some((item) => !item.name || !item.price)) throw new StoreError('invalid_menu');
  return { title, items: out };
}

function normalizePage(title: string, links: PageLink[]): { title: string; links: PageLink[] } {
  title = title.trim();
  if (!title || links.length === 0) throw new StoreError('invalid_page');
  const out = links.map((entry) => ({ name: entry.name.trim(), url: entry.url.trim() }));
  for (const entry of out) {
    let parsed: URL | undefined;
    try {
      parsed = new URL(entry.url);
    } catch {
      parsed = undefined;
    }
    if (!entry.name || !parsed || !parsed.host || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) throw new StoreError('invalid_page');
  }
  return { title, links: out };
}

interface HostedKind {
  prefix: string;
  kind: string;
  /** A site answers at `/s/<code>/`; menus and link pages keep `/r/<code>`. */
  destination?: 'r' | 's';
  items?: MenuItem[];
  links?: PageLink[];
}

/** Hosted pages (menus, link pages) get their own six-character code, retried a few times if one is taken. */
async function createHosted(db: Db, ownerId: string, title: string, hosted: HostedKind, now: Date, design?: MenuDesign): Promise<Link> {
  const ts = now.toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode(6);
    const res = await db
      .prepare(
        'INSERT OR IGNORE INTO links (id, code, owner_id, title, destination_url, ad_style, is_active, kind, items, links, menu_design, total_scans, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 0, ?, ?)',
      )
      .bind(
        `${hosted.prefix}-${randomCode(8)}`,
        code,
        ownerId,
        title,
        `${hosted.destination === 's' ? `/${code}/` : `/r/${code}`}`,
        hosted.kind,
        hosted.kind,
        hosted.items ? JSON.stringify(hosted.items) : null,
        hosted.links ? JSON.stringify(hosted.links) : null,
        design ? JSON.stringify(design) : '{}',
        ts,
        ts,
      )
      .run();
    if (res.meta.changes === 1) return loadPublic(db, code);
  }
  throw new StoreError('conflict');
}

async function updateHosted(db: Db, code: string, kind: string, title: string, column: 'items' | 'links', value: unknown, now: Date, design?: MenuDesign | null): Promise<Link> {
  const sets = ['title = ?', `${column} = ?`];
  const values: unknown[] = [title, JSON.stringify(value)];
  if (design !== undefined) {
    sets.push('menu_design = ?');
    values.push(design === null ? '{}' : JSON.stringify(design));
  }
  sets.push('updated_at = ?');
  values.push(now.toISOString());
  const res = await db
    .prepare(`UPDATE links SET ${sets.join(', ')} WHERE code = ? AND is_active = 1 AND kind = ?`)
    .bind(...values, code, kind)
    .run();
  if (res.meta.changes === 0) throw new StoreError('not_found');
  return loadPublic(db, code);
}

export async function createMenu(db: Db, ownerId: string, title: string, items: MenuItem[], now = new Date(), design?: MenuDesign): Promise<Link> {
  if (!ownerId) throw new StoreError('owner_required');
  const menu = normalizeMenu(title, items);
  return createHosted(db, ownerId, menu.title, { prefix: 'menu', kind: LINK_KIND_MENU, items: menu.items }, now, design);
}

export async function updateMenu(db: Db, code: string, title: string, items: MenuItem[], now = new Date(), design?: MenuDesign | null): Promise<Link> {
  const menu = normalizeMenu(title, items);
  return updateHosted(db, code, LINK_KIND_MENU, menu.title, 'items', menu.items, now, design);
}

/** Points a menu at its published static site, or clears the pointer. */
export async function setMenuPublishedSite(db: Db, code: string, siteCode: string | null, now = new Date()): Promise<Link> {
  const res = await db
    .prepare('UPDATE links SET published_site_code = ?, updated_at = ? WHERE code = ? AND is_active = 1 AND kind = ?')
    .bind(siteCode, now.toISOString(), code, LINK_KIND_MENU)
    .run();
  if (res.meta.changes === 0) throw new StoreError('not_found');
  return loadPublic(db, code);
}

/** The active menu that published a site, if any; a site scan counts as that menu's scan. */
export async function menuCodeForPublishedSite(db: Db, siteCode: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT code FROM links WHERE published_site_code = ? AND kind = ? AND is_active = 1 LIMIT 1')
    .bind(siteCode, LINK_KIND_MENU)
    .first<{ code: string }>();
  return row?.code ?? null;
}

/** Called when a site itself is deleted, so a menu that pointed at it falls back to its dynamic page. */
export async function clearMenusPublishedSite(db: Db, siteCode: string, now = new Date()): Promise<void> {
  await db
    .prepare('UPDATE links SET published_site_code = NULL, updated_at = ? WHERE published_site_code = ?')
    .bind(now.toISOString(), siteCode)
    .run();
}

export async function createPage(db: Db, ownerId: string, title: string, links: PageLink[], now = new Date()): Promise<Link> {
  if (!ownerId) throw new StoreError('owner_required');
  const page = normalizePage(title, links);
  return createHosted(db, ownerId, page.title, { prefix: 'page', kind: LINK_KIND_LINK_PAGE, links: page.links }, now);
}

export async function updatePage(db: Db, code: string, title: string, links: PageLink[], now = new Date()): Promise<Link> {
  const page = normalizePage(title, links);
  return updateHosted(db, code, LINK_KIND_LINK_PAGE, page.title, 'links', page.links, now);
}

/** A site is a hosted prefix of files in R2; the link row only names it and carries the counters. */
export async function createSite(db: Db, ownerId: string, title: string, now = new Date()): Promise<Link> {
  if (!ownerId) throw new StoreError('owner_required');
  const clean = title.trim();
  if (!clean) throw new StoreError('invalid_site');
  return createHosted(db, ownerId, clean, { prefix: 'site', kind: LINK_KIND_SITE, destination: 's' }, now);
}

/** Attaches one customer domain to a site; an unchanged name keeps its last successful check. */
export async function setSiteDomain(db: Db, code: string, domain: string, now = new Date()): Promise<Link> {
  const current = await db
    .prepare('SELECT domain, domain_verified_at FROM links WHERE code = ? AND kind = ? AND is_active = 1')
    .bind(code, LINK_KIND_SITE)
    .first<{ domain: string | null; domain_verified_at: string | null }>();
  if (!current) throw new StoreError('not_found');
  const taken = await db.prepare('SELECT code FROM links WHERE domain = ? AND code <> ? AND is_active = 1').bind(domain, code).first<{ code: string }>();
  if (taken) throw new StoreError('domain_taken');
  const verifiedAt = current.domain === domain ? current.domain_verified_at : null;
  try {
    await db
      .prepare('UPDATE links SET domain = ?, domain_verified_at = ?, updated_at = ? WHERE code = ? AND kind = ? AND is_active = 1')
      .bind(domain, verifiedAt, now.toISOString(), code, LINK_KIND_SITE)
      .run();
  } catch (err) {
    // The pre-check above loses a race only if two sites claim one name at once; the unique index still decides.
    if (err instanceof Error && /UNIQUE constraint failed/i.test(err.message)) throw new StoreError('domain_taken');
    throw err;
  }
  return loadPublic(db, code);
}

/** Clears the domain and its check. A site without a domain answers 204 for a second delete. */
export async function clearSiteDomain(db: Db, code: string, now = new Date()): Promise<Link> {
  const res = await db
    .prepare('UPDATE links SET domain = NULL, domain_verified_at = NULL, updated_at = ? WHERE code = ? AND kind = ? AND is_active = 1')
    .bind(now.toISOString(), code, LINK_KIND_SITE)
    .run();
  if (res.meta.changes === 0) throw new StoreError('not_found');
  return loadPublic(db, code);
}

/** Records the outcome of a forwarding check: the instant it passed, or null when it did not. */
export async function markSiteDomainVerified(db: Db, code: string, verifiedAt: string | null, now = new Date()): Promise<void> {
  await db
    .prepare('UPDATE links SET domain_verified_at = ?, updated_at = ? WHERE code = ? AND kind = ? AND is_active = 1 AND domain IS NOT NULL')
    .bind(verifiedAt, now.toISOString(), code, LINK_KIND_SITE)
    .run();
}

export async function updateSite(db: Db, code: string, title: string, now = new Date()): Promise<Link> {
  const clean = title.trim();
  if (!clean) throw new StoreError('invalid_site');
  const res = await db
    .prepare('UPDATE links SET title = ?, updated_at = ? WHERE code = ? AND is_active = 1 AND kind = ?')
    .bind(clean, now.toISOString(), code, LINK_KIND_SITE)
    .run();
  if (res.meta.changes === 0) throw new StoreError('not_found');
  return loadPublic(db, code);
}
