import type { AppDeps } from '../app';
import { bodyObject, errorJson, HttpError, json, readBytes, stringField } from '../http';
import type { Ctx, Router } from '../router';
import {
  deleteSiteFile,
  enforceSiteCaps,
  getSiteFile,
  headSiteFile,
  listSiteFiles,
  putSiteFile,
  siteContentType,
  sitePath,
  SITE_FILE_CAP,
  SITE_FILE_NOT_FOUND,
  SITE_NOT_FOUND,
  SITE_PATH_INVALID,
  SITES_PRO_ONLY,
  SITE_UNAVAILABLE,
  type SiteBucket,
} from '../sites';
import { StoreError } from '../store/errors';
import { createSite, toPublicLink, updateSite } from '../store/links';
import { LINK_KIND_SITE, type StoredLink } from '../types';
import { readPolicy, siteFileWritePolicy, SCOPES, writePolicy } from './policies';
import { ownedLink, requirePro, userId } from './shared';

/** A site that cannot be served is not created or edited: the answer is the same 503 the host gives. */
function bucket(c: Ctx): SiteBucket {
  if (!c.env.SITES) throw new HttpError(503, SITE_UNAVAILABLE);
  return c.env.SITES;
}

/** The caller's own site. A stranger's code answers 404 exactly like a missing one, and so does another kind's code. */
async function ownedSite(c: Ctx, code: string): Promise<StoredLink> {
  const link = await ownedLink(c, code, SITE_NOT_FOUND);
  if (link.kind !== LINK_KIND_SITE) throw new HttpError(404, SITE_NOT_FOUND);
  return link;
}

function requestedPath(c: Ctx): string {
  const path = sitePath(c.url.searchParams.get('path') ?? '');
  if (!path) throw new HttpError(400, SITE_PATH_INVALID);
  return path;
}

/** The store's errors for the two site writes; anything else is the router's 500. */
function siteFailure(err: unknown): Response {
  if (err instanceof StoreError) {
    if (err.code === 'not_found') return errorJson(404, SITE_NOT_FOUND);
    if (err.code === 'conflict') return errorJson(409, 'Could not allocate a site code');
    if (err.code === 'invalid_site') return errorJson(400, err.message);
  }
  throw err;
}

export function registerSiteRoutes(router: Router, deps: AppDeps): void {
  router.handle('POST /api/sites', writePolicy(SCOPES.linksWrite), async (c) => {
    const owner = userId(c);
    // The plan is checked before the body, so a Free owner's malformed body is a 403, as it is for menus.
    await requirePro(c, deps, SITES_PRO_ONLY);
    bucket(c);
    const body = bodyObject(await c.json());
    const title = stringField(body, 'title');
    try {
      return json(201, await createSite(c.env.DB, owner, title, deps.now()));
    } catch (err) {
      return siteFailure(err);
    }
  });

  router.handle('PUT /api/sites/{code}', writePolicy(SCOPES.linksWrite), async (c) => {
    const code = c.param('code');
    await ownedSite(c, code);
    await requirePro(c, deps, SITES_PRO_ONLY);
    bucket(c);
    const body = bodyObject(await c.json());
    const title = stringField(body, 'title');
    try {
      return json(200, await updateSite(c.env.DB, code, title, deps.now()));
    } catch (err) {
      return siteFailure(err);
    }
  });

  router.handle('GET /api/sites/{code}', readPolicy(SCOPES.linksRead), async (c) => {
    const site = await ownedSite(c, c.param('code'));
    return json(200, { site: toPublicLink(site), files: await listSiteFiles(bucket(c), site.code) });
  });

  router.handle('PUT /api/sites/{code}/files', siteFileWritePolicy, async (c) => {
    const site = await ownedSite(c, c.param('code'));
    await requirePro(c, deps, SITES_PRO_ONLY);
    const store = bucket(c);
    const path = requestedPath(c);
    // One byte over the cap is read so the file-size rule, not the transport's, names the limit; a much larger body
    // is a 413 before it is read.
    const bytes = await readBytes(c.req, SITE_FILE_CAP + 1);
    await enforceSiteCaps(store, site.code, path, bytes.byteLength);
    await putSiteFile(store, site.code, path, bytes);
    return json(200, { path, size: bytes.byteLength, content_type: siteContentType(path) });
  });

  router.handle('GET /api/sites/{code}/files', readPolicy(SCOPES.linksRead), async (c) => {
    const site = await ownedSite(c, c.param('code'));
    const path = requestedPath(c);
    const file = await getSiteFile(bucket(c), site.code, path);
    if (!file) throw new HttpError(404, SITE_FILE_NOT_FOUND);
    const headers: Record<string, string> = {
      'Content-Type': siteContentType(path),
      'Content-Length': String(file.size),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    if (file.httpEtag) headers.ETag = file.httpEtag;
    return new Response(file.body, { status: 200, headers });
  });

  router.handle('DELETE /api/sites/{code}/files', writePolicy(SCOPES.linksWrite), async (c) => {
    const site = await ownedSite(c, c.param('code'));
    await requirePro(c, deps, SITES_PRO_ONLY);
    const store = bucket(c);
    const path = requestedPath(c);
    if (!(await headSiteFile(store, site.code, path))) throw new HttpError(404, SITE_FILE_NOT_FOUND);
    await deleteSiteFile(store, site.code, path);
    return new Response(null, { status: 204 });
  });
}
