import { describe, expect, spyOn, test } from 'bun:test';
import { bearer, go, grantPlan, rig, signUp, withJson, type Rig } from './test/rig';
import type { TestBucket } from './test/bucket';

const menuBody = (title: string, price = '8.00') => ({ title, items: [{ name: 'Stew', price }] });
const createMenu = (r: Rig, token: string, title = 'Cafe menu', price = '8.00') =>
  go(r, '/api/menus', withJson('POST', token, menuBody(title, price)));

async function setup(): Promise<{ r: Rig; ada: { id: string; token: string }; bob: { id: string; token: string }; code: string; site: string }> {
  const r = rig();
  const ada = await signUp(r, 'ada@example.com');
  const bob = await signUp(r, 'bob@example.com');
  grantPlan(r, ada.id, 'pro');
  const created = await createMenu(r, ada.token);
  expect(created.status).toBe(201);
  const menu = (await created.json()) as { code: string };
  const published = await go(r, `/api/menus/${menu.code}/publish`, { ...bearer(ada.token), method: 'POST' });
  expect(published.status).toBe(200);
  const site = (await published.json()) as { site: string; url: string };
  return { r, ada, bob, code: menu.code, site: site.site };
}

const siteIndex = (r: Rig, site: string): string | null => (r.env.SITES as TestBucket).keys().find((key) => key === `sites/${site}/index.html`) ?? null;

describe('publishing a menu as a static site', () => {
  test('publish writes the page, /r/ redirects to it, and the site index counts the menu scan', async () => {
    const { r, ada, code, site } = await setup();
    const key = siteIndex(r, site);
    expect(key).not.toBeNull();
    const stored = await (r.env.SITES as TestBucket).get(key as string);
    const html = await new Response(stored?.body).text();
    expect(html).toContain('Cafe menu');
    expect(html).toContain('8.00');

    const list = (await (await go(r, '/api/links', bearer(ada.token))).json()) as { links: Array<{ code: string; published_site_code?: string }> };
    expect(list.links.find((row) => row.code === code)?.published_site_code).toBe(site);

    const scan = await go(r, `/r/${code}`);
    expect(scan.status).toBe(302);
    expect(scan.headers.get('Location')).toBe(`/s/${site}/`);

    const page = await go(r, `/s/${site}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('Cafe menu');
    await r.settle();
    const recorded = r.db.sqlite.query('SELECT link_code FROM scans').all() as Array<{ link_code: string }>;
    expect(recorded.map((row) => row.link_code)).toEqual([code]);
    const totals = r.db.sqlite.query('SELECT code, total_scans FROM links WHERE code IN (?, ?)').all(code, site) as Array<{ code: string; total_scans: number }>;
    expect(totals.find((row) => row.code === code)?.total_scans).toBe(1);
    expect(totals.find((row) => row.code === site)?.total_scans).toBe(0);
  });

  test('an edit rewrites the published page and the scan still lands on the menu', async () => {
    const { r, ada, code, site } = await setup();
    const edit = await go(r, `/api/menus/${code}`, withJson('PUT', ada.token, menuBody('Cafe menu', '12.50')));
    expect(edit.status).toBe(200);
    expect(((await edit.json()) as { published_site_code?: string }).published_site_code).toBe(site);
    const stored = await (r.env.SITES as TestBucket).get(`sites/${site}/index.html`);
    expect(await new Response(stored?.body).text()).toContain('12.50');

    const page = await go(r, `/s/${site}/`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('12.50');
  });

  test('unpublish removes the files and the menu serves its dynamic page again', async () => {
    const { r, ada, code, site } = await setup();
    const removed = await go(r, `/api/menus/${code}/publish`, { ...bearer(ada.token), method: 'DELETE' });
    expect(removed.status).toBe(204);
    expect(siteIndex(r, site)).toBeNull();
    const row = r.db.sqlite.query('SELECT count(*) AS n FROM links WHERE code = ?').get(site) as { n: number };
    expect(row.n).toBe(0);
    const scan = await go(r, `/r/${code}`);
    expect(scan.status).toBe(200);
    expect(await scan.text()).toContain('Cafe menu');
  });

  test('deleting the menu removes its published site too', async () => {
    const { r, ada, code, site } = await setup();
    const removed = await go(r, `/api/links/${code}`, { ...bearer(ada.token), method: 'DELETE' });
    expect(removed.status).toBe(200);
    expect(siteIndex(r, site)).toBeNull();
    expect((r.db.sqlite.query('SELECT count(*) AS n FROM links WHERE code = ?').get(site) as { n: number }).n).toBe(0);
  });

  test('a missing site file falls back to the dynamic menu instead of redirecting nowhere', async () => {
    const { r, code, site } = await setup();
    await (r.env.SITES as TestBucket).delete(`sites/${site}/index.html`);
    const scan = await go(r, `/r/${code}`);
    expect(scan.status).toBe(200);
    expect(await scan.text()).toContain('Cafe menu');
  });

  test('a stranger gets 404 and a Free owner gets 403', async () => {
    const { r, ada, bob, code } = await setup();
    expect((await go(r, `/api/menus/${code}/publish`, { ...bearer(bob.token), method: 'POST' })).status).toBe(404);
    r.db.sqlite.query('DELETE FROM entitlements').run();
    const free = await go(r, `/api/menus/${code}/publish`, { ...bearer(ada.token), method: 'POST' });
    expect([free.status, await free.json()]).toEqual([403, { error: 'Menus are a Pro feature.' }]);
  });

  test('a failed menu lookup still serves the site and counts the scan against the site', async () => {
    const { r, site } = await setup();
    const log = spyOn(console, 'error').mockImplementation(() => {});
    const db = r.env.DB;
    r.env.DB = { ...db, prepare: ((sql: string) => {
      if (sql.includes('published_site_code')) throw new Error('db down');
      return db.prepare(sql);
    }) as typeof db.prepare };
    try {
      const page = await go(r, `/s/${site}/`);
      expect(page.status).toBe(200);
      await r.settle();
      const recorded = r.db.sqlite.query('SELECT link_code FROM scans').all() as Array<{ link_code: string }>;
      expect(recorded.map((row) => row.link_code)).toEqual([site]);
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  test('a failed rewrite removes the site and clears the menu pointer', async () => {
    const { r, ada, code, site } = await setup();
    const log = spyOn(console, 'error').mockImplementation(() => {});
    const bucket = r.env.SITES as TestBucket;
    r.env.SITES = { ...bucket, put: async () => { throw new Error('r2 down'); } };
    try {
      const edited = await go(r, `/api/menus/${code}`, withJson('PUT', ada.token, menuBody('Cafe menu', '12.50')));
      expect(edited.status).toBe(200);
      expect(((await edited.json()) as { published_site_code?: string }).published_site_code).toBeUndefined();
      expect(siteIndex(r, site)).toBeNull();
      expect((r.db.sqlite.query('SELECT count(*) AS n FROM links WHERE code = ?').get(site) as { n: number }).n).toBe(0);
      const scan = await go(r, `/r/${code}`);
      expect(scan.status).toBe(200);
      expect(await scan.text()).toContain('Cafe menu');
    } finally {
      log.mockRestore();
    }
  });

  test('a failed R2 write leaves no orphan site row', async () => {
    const { r, ada, code } = await setup();
    await go(r, `/api/menus/${code}/publish`, { ...bearer(ada.token), method: 'DELETE' });
    const log = spyOn(console, 'error').mockImplementation(() => {});
    const bucket = r.env.SITES as TestBucket;
    r.env.SITES = { ...bucket, put: async () => { throw new Error('r2 down'); } };
    try {
      const failed = await go(r, `/api/menus/${code}/publish`, { ...bearer(ada.token), method: 'POST' });
      expect([failed.status, await failed.json()]).toEqual([500, { error: 'Could not publish this menu.' }]);
      const sites = r.db.sqlite.query("SELECT count(*) AS n FROM links WHERE kind = 'site'").get() as { n: number };
      expect(sites.n).toBe(0);
      expect(bucket.keys().filter((key) => key.startsWith('sites/'))).toEqual([]);
    } finally {
      log.mockRestore();
    }
  });
});
