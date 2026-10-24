import type { AppDeps } from '../app';
import type { Db } from '../db';
import { HttpError, errorJson, json } from '../http';
import { renderMenu } from '../pages/menu';
import type { Ctx, Router } from '../router';
import { createSite, deleteLink, getLink, setMenuPublishedSite, updateSite } from '../store/links';
import { StoreError } from '../store/errors';
import {
  SITE_UNAVAILABLE,
  headSiteFile,
  putSiteFile,
  siteForwardTarget,
  type SiteBucket,
} from '../sites';
import { LINK_KIND_MENU, LINK_KIND_SITE, type Link, type StoredLink } from '../types';
import { SCOPES, writePolicy } from './policies';
import { ownedLink, requirePro, userId } from './shared';

const PRO_ONLY = 'Menus are a Pro feature.';
const NOT_FOUND = 'Menu not found';
const PUBLISH_FAILED = 'Could not publish this menu.';

/** The bucket, or the same 503 the Sites routes give on a server without one. */
function bucket(c: Ctx): SiteBucket {
  if (!c.env.SITES) throw new HttpError(503, SITE_UNAVAILABLE);
  return c.env.SITES;
}

function fail(err: unknown): Response {
  if (err instanceof StoreError && err.code === 'not_found') return errorJson(404, NOT_FOUND);
  throw err;
}

/** Render `menu` into its published site, creating the site row on first publish. The pointer flips only after R2 accepted the file. */
async function writeMenuSite(c: Ctx, menu: StoredLink, now: Date): Promise<Link> {
  const store = bucket(c);
  const owner = menu.owner_id;
  let site: Link | null = null;
  if (menu.published_site_code) {
    const existing = await getLink(c.env.DB, menu.published_site_code);
    if (existing && existing.owner_id === owner && existing.kind === LINK_KIND_SITE && existing.is_active) site = existing;
  }
  let created = false;
  if (!site) {
    site = await createSite(c.env.DB, owner, menu.title, now);
    created = true;
  }
  try {
    await putSiteFile(store, site.code, 'index.html', new TextEncoder().encode(renderMenu(menu)));
  } catch (err) {
    // A site row whose file never landed would only be an orphan in the owner's Sites list.
    if (created) await deleteLink(c.env.DB, site.code).catch(() => undefined);
    console.error('menu publish failed', err);
    throw new HttpError(500, PUBLISH_FAILED);
  }
  if (site.title !== menu.title) await updateSite(c.env.DB, site.code, menu.title, now);
  if (menu.published_site_code !== site.code) await setMenuPublishedSite(c.env.DB, menu.code, site.code, now);
  return site;
}

/** Re-render a published menu after an edit; a failed write clears the pointer so /r/ serves the dynamic page. */
export async function refreshPublishedMenu(db: Db, bucket: SiteBucket | undefined, menu: Link, now = new Date()): Promise<void> {
  if (!menu.published_site_code) return;
  const site = await getLink(db, menu.published_site_code);
  if (!site || site.kind !== LINK_KIND_SITE || !site.is_active) {
    await setMenuPublishedSite(db, menu.code, null, now);
    return;
  }
  if (!bucket) {
    await deleteMenuSite(db, undefined, site.code).catch((err) => console.error('menu site cleanup failed', err));
    await setMenuPublishedSite(db, menu.code, null, now);
    return;
  }
  try {
    await putSiteFile(bucket, site.code, 'index.html', new TextEncoder().encode(renderMenu(menu)));
    if (site.title !== menu.title) await updateSite(db, site.code, menu.title, now);
  } catch (err) {
    console.error('menu republish failed', err);
    await deleteMenuSite(db, bucket, site.code).catch((cleanup) => console.error('menu site cleanup failed', cleanup));
    await setMenuPublishedSite(db, menu.code, null, now);
  }
}

/** Deletes the site row and its R2 files, files first so a retry never leaves an unreachable row. */
export async function deleteMenuSite(db: Db, bucket: SiteBucket | undefined, siteCode: string): Promise<void> {
  if (bucket) {
    const prefix = `sites/${siteCode}/`;
    const listed = await bucket.list({ prefix, limit: 1000 });
    if (listed.objects.length) await bucket.delete(listed.objects.map((object) => object.key));
  }
  await deleteLink(db, siteCode);
}

export function registerMenuPublishRoutes(router: Router, deps: AppDeps): void {
  router.handle('POST /api/menus/{code}/publish', writePolicy(SCOPES.linksWrite), async (c) => {
    // Ownership first: a stranger's code answers 404 whatever their plan and whatever they send.
    await ownedLink(c, c.param('code'), NOT_FOUND);
    await requirePro(c, deps, PRO_ONLY);
    try {
      const menu = await ownedLink(c, c.param('code'), NOT_FOUND);
      if (menu.kind !== LINK_KIND_MENU) return errorJson(404, NOT_FOUND);
      const site = await writeMenuSite(c, menu, deps.now());
      return json(200, { site: site.code, url: siteForwardTarget(c.env, c.url, site.code) });
    } catch (err) {
      return fail(err);
    }
  });

  router.handle('DELETE /api/menus/{code}/publish', writePolicy(SCOPES.linksWrite), async (c) => {
    await ownedLink(c, c.param('code'), NOT_FOUND);
    try {
      const menu = await ownedLink(c, c.param('code'), NOT_FOUND);
      if (menu.kind !== LINK_KIND_MENU) return errorJson(404, NOT_FOUND);
      const siteCode = menu.published_site_code;
      if (!siteCode) return new Response(null, { status: 204 });
      const site = await getLink(c.env.DB, siteCode);
      if (site && site.owner_id === userId(c) && site.kind === LINK_KIND_SITE) await deleteMenuSite(c.env.DB, c.env.SITES, siteCode);
      await setMenuPublishedSite(c.env.DB, menu.code, null, deps.now());
      return new Response(null, { status: 204 });
    } catch (err) {
      return fail(err);
    }
  });
}

/** The site a published menu serves from, when its row and index file are both there. Used by /r/ to fall back. */
export async function publishedMenuSite(c: Ctx, menu: StoredLink, bucket: SiteBucket | undefined): Promise<string | null> {
  const code = menu.published_site_code;
  if (!code) return null;
  const site = await getLink(c.env.DB, code);
  if (!site || site.owner_id !== menu.owner_id || site.kind !== LINK_KIND_SITE || !site.is_active) return null;
  if (!bucket || !(await headSiteFile(bucket, code, 'index.html'))) return null;
  return code;
}
