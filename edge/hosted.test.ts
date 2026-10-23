import { describe, expect, spyOn, test } from 'bun:test';
import type { Link } from './types';
import { bearer, go, grantPlan, rig, signUp, withJson, type Rig } from './test/rig';

const MENU_INVALID = 'menu needs a title and at least one item with a name and a price';
const PAGE_INVALID = 'link page needs a title and at least one link with a name and a valid http(s) URL';
const MENUS_PRO_ONLY = 'Menus are a Pro feature.';

async function pair(): Promise<{ r: Rig; ada: { id: string; token: string }; bob: { id: string; token: string } }> {
  const r = rig();
  return { r, ada: await signUp(r, 'ada@example.com'), bob: await signUp(r, 'bob@example.com') };
}

/** The same two people, with ada on Pro: menu writes are a Pro feature. */
async function proPair(): Promise<{ r: Rig; ada: { id: string; token: string }; bob: { id: string; token: string } }> {
  const people = await pair();
  grantPlan(people.r, people.ada.id, 'pro');
  return people;
}

const post = async (r: Rig, path: string, token: string, body: unknown): Promise<Response> => go(r, path, withJson('POST', token, body));
const raw = (method: string, token: string, body: string): RequestInit => ({ method, headers: { Authorization: `Bearer ${token}` }, body });

describe('menus', () => {
  const soup = { name: 'Soup', price: '6.00' };

  test('need a session', async () => {
    const r = rig();
    for (const init of [{ method: 'POST', body: '{}' }, { method: 'POST', ...bearer('stale'), body: '{}' }]) {
      const res = await go(r, '/api/menus', init);
      expect([res.status, await res.json()]).toEqual([401, { error: 'Sign in to continue.' }]);
    }
    expect((await go(r, '/api/menus/abc123', { method: 'PUT', body: '{}' })).status).toBe(401);
  });

  test('need Pro: Free and Plus are refused, and an update stops when Pro ends', async () => {
    const { r, ada } = await pair();
    const body = { title: 'Lunch', items: [soup] };
    const refused = [403, { error: MENUS_PRO_ONLY }];
    const free = await post(r, '/api/menus', ada.token, body);
    expect([free.status, await free.json()]).toEqual(refused);
    expect(r.db.sqlite.query('SELECT count(*) AS n FROM links').get()).toEqual({ n: 0 });

    grantPlan(r, ada.id, 'plus');
    const plus = await post(r, '/api/menus', ada.token, body);
    expect([plus.status, await plus.json()]).toEqual(refused);
    // The plan is checked before the body, so a broken body does not become a 400 for a Free owner.
    const malformed = await go(r, '/api/menus', raw('POST', ada.token, '{'));
    expect(malformed.status).toBe(403);
    expect(r.db.sqlite.query('SELECT count(*) AS n FROM links').get()).toEqual({ n: 0 });

    grantPlan(r, ada.id, 'pro');
    const menu = (await (await post(r, '/api/menus', ada.token, body)).json()) as Link;
    r.db.sqlite.query("DELETE FROM entitlements WHERE user_id = ? AND plan = 'pro'").run(ada.id);
    const update = await go(r, `/api/menus/${menu.code}`, withJson('PUT', ada.token, { title: 'Hijack', items: [soup] }));
    expect([update.status, await update.json()]).toEqual(refused);
    expect(((await (await go(r, `/api/links/${menu.code}`, bearer(ada.token))).json()) as Link).title).toBe('Lunch');
  });

  test('a plan that cannot be read refuses menu writes rather than granting them', async () => {
    const { r, ada } = await pair();
    r.db.sqlite.exec('DROP TABLE entitlements'); // a database the 0002 migration has not reached yet
    const logged = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await post(r, '/api/menus', ada.token, { title: 'Lunch', items: [soup] });
      expect([res.status, await res.json()]).toEqual([403, { error: MENUS_PRO_ONLY }]);
      expect(r.db.sqlite.query('SELECT count(*) AS n FROM links').get()).toEqual({ n: 0 });
      expect(logged).toHaveBeenCalled();
    } finally {
      logged.mockRestore();
    }
  });

  test('are created with their own code, hosted at /r/<code>', async () => {
    const { r, ada } = await proPair();
    const res = await post(r, '/api/menus', ada.token, { title: '  Lunch ', items: [{ name: ' Soup ', price: ' 6.00 ' }] });
    expect(res.status).toBe(201);
    const menu = (await res.json()) as Link;
    expect(menu).toEqual({
      id: expect.stringMatching(/^menu-[2-9a-hjkmnp-z]{8}$/),
      code: expect.stringMatching(/^[2-9a-hjkmnp-z]{6}$/),
      title: 'Lunch',
      destination_url: `/r/${menu.code}`,
      created_at: expect.any(String),
      updated_at: expect.any(String),
      total_scans: 0,
      ad_style: 'menu',
      is_active: true,
      kind: 'menu',
      items: [soup],
    });
    expect(r.db.sqlite.query('SELECT owner_id FROM links WHERE code = ?').get(menu.code)).toEqual({ owner_id: ada.id });
  });

  test('refuse a menu without a title, or without a priced and named item', async () => {
    const { r, ada } = await proPair();
    const bad: unknown[] = [
      {},
      null,
      { title: 'x' },
      { title: 'x', items: null },
      { title: 'x', items: [] },
      { title: '  ', items: [soup] },
      { title: 'x', items: [{ name: 'Soup', price: ' ' }] },
      { title: 'x', items: [{ name: '', price: '1' }] },
      { title: 'x', items: [soup, { name: 'Tea' }] },
    ];
    for (const body of bad) {
      const res = await post(r, '/api/menus', ada.token, body);
      expect([res.status, await res.json()]).toEqual([400, { error: MENU_INVALID }]);
    }
    expect(r.db.sqlite.query('SELECT count(*) AS n FROM links').get()).toEqual({ n: 0 });
  });

  test('refuse a body of the wrong shape or size', async () => {
    const { r, ada } = await proPair();
    for (const body of ['{', '[]', '"x"', '{"title":5}', '{"title":"x","items":"soup"}', '{"title":"x","items":[5]}', '{"title":"x","items":[{"name":5,"price":"1"}]}', '{"title":"x","items":{"name":"a"}}']) {
      const res = await go(r, '/api/menus', raw('POST', ada.token, body));
      expect([res.status, await res.json()]).toEqual([400, { error: 'Invalid request body' }]);
    }
    const big = await go(r, '/api/menus', raw('POST', ada.token, JSON.stringify({ title: 'x', items: [{ name: 'y'.repeat(70 * 1024), price: '1' }] })));
    expect([big.status, await big.json()]).toEqual([413, { error: 'Request body too large' }]);
  });

  test('are updated by their owner, keeping the code and the address', async () => {
    const { r, ada } = await proPair();
    const before = (await (await post(r, '/api/menus', ada.token, { title: 'Lunch', items: [soup] })).json()) as Link;
    r.advance(5000);
    const res = await go(r, `/api/menus/${before.code}`, withJson('PUT', ada.token, { title: 'Dinner', items: [{ name: 'Steak', price: '24' }] }));
    expect(res.status).toBe(200);
    const after = (await res.json()) as Link;
    expect(after).toMatchObject({ id: before.id, code: before.code, destination_url: before.destination_url, created_at: before.created_at, title: 'Dinner', kind: 'menu', items: [{ name: 'Steak', price: '24' }] });
    expect(after.updated_at > before.updated_at).toBe(true);
  });

  test('are not touched by an invalid update', async () => {
    const { r, ada } = await proPair();
    const menu = (await (await post(r, '/api/menus', ada.token, { title: 'Lunch', items: [soup] })).json()) as Link;
    const res = await go(r, `/api/menus/${menu.code}`, withJson('PUT', ada.token, { title: '', items: [soup] }));
    expect([res.status, await res.json()]).toEqual([400, { error: MENU_INVALID }]);
    expect(((await (await go(r, `/api/links/${menu.code}`, bearer(ada.token))).json()) as Link).title).toBe('Lunch');
  });

  test('cannot be updated by someone else, whatever the body, and a missing menu reads the same', async () => {
    const { r, ada, bob } = await proPair();
    const menu = (await (await post(r, '/api/menus', ada.token, { title: 'Lunch', items: [soup] })).json()) as Link;
    const expected = [404, { error: 'Menu not found' }];
    for (const init of [withJson('PUT', bob.token, { title: 'hijack', items: [soup] }), raw('PUT', bob.token, '{'), withJson('PUT', bob.token, null)]) {
      const res = await go(r, `/api/menus/${menu.code}`, init);
      expect([res.status, await res.json()]).toEqual(expected);
    }
    const missing = await go(r, '/api/menus/nothing', withJson('PUT', ada.token, { title: 'x', items: [soup] }));
    expect([missing.status, await missing.json()]).toEqual(expected);
    expect(((await (await go(r, `/api/links/${menu.code}`, bearer(ada.token))).json()) as Link).title).toBe('Lunch');
  });

  test('are the only thing /api/menus edits: a plain link or a link page is a missing menu', async () => {
    const { r, ada } = await proPair();
    const link = (await (await post(r, '/api/links', ada.token, { code: 'plain', destination_url: 'a.co' })).json()) as Link;
    const page = (await (await post(r, '/api/pages', ada.token, { title: 'Me', links: [{ name: 'Site', url: 'https://a.co' }] })).json()) as Link;
    for (const code of [link.code, page.code]) {
      const res = await go(r, `/api/menus/${code}`, withJson('PUT', ada.token, { title: 'x', items: [soup] }));
      expect([res.status, await res.json()]).toEqual([404, { error: 'Menu not found' }]);
    }
    expect(((await (await go(r, '/api/links/plain', bearer(ada.token))).json()) as Link).destination_url).toBe('https://a.co');
  });

  test('show up in the owner\'s link list, and delete like any link', async () => {
    const { r, ada } = await proPair();
    const menu = (await (await post(r, '/api/menus', ada.token, { title: 'Lunch', items: [soup] })).json()) as Link;
    const list = (await (await go(r, '/api/links', bearer(ada.token))).json()) as { links: Link[] };
    expect(list.links.map((l) => [l.code, l.kind])).toEqual([[menu.code, 'menu']]);
    expect((await go(r, `/api/links/${menu.code}`, { method: 'DELETE', ...bearer(ada.token) })).status).toBe(200);
    expect(await (await go(r, '/api/links', bearer(ada.token))).json()).toEqual({ links: [], count: 0 });
  });
});

describe('link pages', () => {
  const site = { name: 'Site', url: 'https://example.com' };

  test('need a session', async () => {
    const r = rig();
    expect((await go(r, '/api/pages', { method: 'POST', body: '{}' })).status).toBe(401);
    expect((await go(r, '/api/pages/abc123', { method: 'PUT', ...bearer('stale'), body: '{}' })).status).toBe(401);
  });

  test('are created with their own code, hosted at /r/<code>', async () => {
    const { r, ada } = await pair();
    const res = await post(r, '/api/pages', ada.token, { title: ' Find me ', links: [{ name: ' Site ', url: ' https://example.com/a ' }] });
    expect(res.status).toBe(201);
    const page = (await res.json()) as Link;
    expect(page).toEqual({
      id: expect.stringMatching(/^page-[2-9a-hjkmnp-z]{8}$/),
      code: expect.stringMatching(/^[2-9a-hjkmnp-z]{6}$/),
      title: 'Find me',
      destination_url: `/r/${page.code}`,
      created_at: expect.any(String),
      updated_at: expect.any(String),
      total_scans: 0,
      ad_style: 'linkpage',
      is_active: true,
      kind: 'linkpage',
      links: [{ name: 'Site', url: 'https://example.com/a' }],
    });
  });

  test('refuse a page without a title, or with a link that is not named and plain http(s)', async () => {
    const { r, ada } = await pair();
    const bad: unknown[] = [
      {},
      { title: 'x' },
      { title: 'x', links: [] },
      { title: '', links: [site] },
      { title: 'x', links: [{ name: '', url: 'https://a.co' }] },
      { title: 'x', links: [{ name: 'a', url: 'javascript:alert(1)' }] },
      { title: 'x', links: [{ name: 'a', url: 'ftp://a.co' }] },
      { title: 'x', links: [{ name: 'a', url: 'example.com' }] },
      { title: 'x', links: [{ name: 'a', url: 'https://' }] },
      { title: 'x', links: [site, { name: 'b', url: 'data:text/html,hi' }] },
    ];
    for (const body of bad) {
      const res = await post(r, '/api/pages', ada.token, body);
      expect([res.status, await res.json()]).toEqual([400, { error: PAGE_INVALID }]);
    }
  });

  test('refuse a body of the wrong shape or size', async () => {
    const { r, ada } = await pair();
    for (const body of ['{', '{"links":"x"}', '{"title":"x","links":[1]}', '{"title":"x","links":[{"url":7}]}']) {
      const res = await go(r, '/api/pages', raw('POST', ada.token, body));
      expect([res.status, await res.json()]).toEqual([400, { error: 'Invalid request body' }]);
    }
    const big = await go(r, '/api/pages', raw('POST', ada.token, JSON.stringify({ title: 'x'.repeat(70 * 1024), links: [site] })));
    expect(big.status).toBe(413);
  });

  test('are updated by their owner only, and "Link page not found" covers every other case', async () => {
    const { r, ada, bob } = await proPair();
    const page = (await (await post(r, '/api/pages', ada.token, { title: 'Me', links: [site] })).json()) as Link;
    const menu = (await (await post(r, '/api/menus', ada.token, { title: 'Lunch', items: [{ name: 'Soup', price: '6' }] })).json()) as Link;

    const ok = await go(r, `/api/pages/${page.code}`, withJson('PUT', ada.token, { title: 'Me, again', links: [{ name: 'Blog', url: 'http://blog.example' }] }));
    expect([ok.status, await ok.json()]).toEqual([200, expect.objectContaining({ code: page.code, title: 'Me, again', links: [{ name: 'Blog', url: 'http://blog.example' }] })]);

    const notFound = [404, { error: 'Link page not found' }];
    for (const [code, init] of [
      [page.code, withJson('PUT', bob.token, { title: 'x', links: [site] })],
      [page.code, raw('PUT', bob.token, '{')],
      [menu.code, withJson('PUT', ada.token, { title: 'x', links: [site] })],
      ['nothing', withJson('PUT', ada.token, { title: 'x', links: [site] })],
    ] as const) {
      const res = await go(r, `/api/pages/${code}`, init);
      expect([res.status, await res.json()]).toEqual(notFound);
    }
    const invalid = await go(r, `/api/pages/${page.code}`, withJson('PUT', ada.token, { title: 'x', links: [] }));
    expect([invalid.status, await invalid.json()]).toEqual([400, { error: PAGE_INVALID }]);
    expect(((await (await go(r, `/api/links/${page.code}`, bearer(ada.token))).json()) as Link).title).toBe('Me, again');
  });
});
