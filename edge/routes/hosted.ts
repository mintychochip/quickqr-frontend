import type { AppDeps } from '../app';
import type { Db } from '../db';
import { bodyObject, errorJson, json, objectList, stringField } from '../http';
import type { Ctx, Router } from '../router';
import { StoreError } from '../store/errors';
import { createMenu, createPage, updateMenu, updatePage } from '../store/links';
import type { Link, MenuItem, PageLink } from '../types';
import { SCOPES, writePolicy } from './policies';
import { ownedLink, requirePro, userId } from './shared';

/** One answer for both menu writes a plan refuses, so the app can show the same sentence the gate uses. */
const MENUS_PRO_ONLY = 'Menus are a Pro feature.';

/** What differs between the two kinds of hosted page: the routes, the list a body carries, and what is said when it fails. */
interface Hosted<Entry> {
  path: string;
  field: 'items' | 'links';
  notFound: string;
  noCode: string;
  /** Menus are a Pro feature; link pages stay in every plan. */
  requiresPro?: boolean;
  entry(fields: Record<string, unknown>): Entry;
  create(db: Db, ownerId: string, title: string, entries: Entry[], now: Date): Promise<Link>;
  update(db: Db, code: string, title: string, entries: Entry[], now: Date): Promise<Link>;
}

function registerHosted<Entry>(router: Router, deps: AppDeps, spec: Hosted<Entry>): void {
  const read = async (c: Ctx) => {
    const body = bodyObject(await c.json());
    return { title: stringField(body, 'title'), entries: objectList(body, spec.field).map((fields) => spec.entry(fields)) };
  };

  const fail = (err: unknown): Response => {
    if (err instanceof StoreError) {
      if (err.code === 'not_found') return errorJson(404, spec.notFound);
      if (err.code === 'conflict') return errorJson(409, spec.noCode);
      if (err.code === 'invalid_menu' || err.code === 'invalid_page') return errorJson(400, err.message);
    }
    throw err;
  };

  router.handle(`POST ${spec.path}`, writePolicy(SCOPES.linksWrite), async (c) => {
    const owner = userId(c);
    if (spec.requiresPro) await requirePro(c, deps, MENUS_PRO_ONLY);
    const { title, entries } = await read(c);
    try {
      return json(201, await spec.create(c.env.DB, owner, title, entries, deps.now()));
    } catch (err) {
      return fail(err);
    }
  });

  router.handle(`PUT ${spec.path}/{code}`, writePolicy(SCOPES.linksWrite), async (c) => {
    const code = c.param('code');
    // Ownership first: a stranger's code answers 404 whatever their plan and whatever they send.
    await ownedLink(c, code, spec.notFound);
    if (spec.requiresPro) await requirePro(c, deps, MENUS_PRO_ONLY);
    const { title, entries } = await read(c);
    try {
      return json(200, await spec.update(c.env.DB, code, title, entries, deps.now()));
    } catch (err) {
      return fail(err);
    }
  });
}

export function registerHostedRoutes(router: Router, deps: AppDeps): void {
  registerHosted<MenuItem>(router, deps, {
    path: '/api/menus',
    field: 'items',
    notFound: 'Menu not found',
    noCode: 'Could not allocate a menu code',
    requiresPro: true,
    entry: (fields) => ({ name: stringField(fields, 'name'), price: stringField(fields, 'price') }),
    create: createMenu,
    update: updateMenu,
  });
  registerHosted<PageLink>(router, deps, {
    path: '/api/pages',
    field: 'links',
    notFound: 'Link page not found',
    noCode: 'Could not allocate a page code',
    entry: (fields) => ({ name: stringField(fields, 'name'), url: stringField(fields, 'url') }),
    create: createPage,
    update: updatePage,
  });
}
