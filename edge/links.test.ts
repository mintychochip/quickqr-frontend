import { describe, expect, test } from 'bun:test';
import type { Link } from './types';
import { recordScan } from './store/scans';
import { bearer, configured, go, rig, signUp, withJson, type Rig } from './test/rig';

interface Pair {
  r: Rig;
  ada: { id: string; token: string };
  bob: { id: string; token: string };
}

async function pair(): Promise<Pair> {
  const r = rig();
  return { r, ada: await signUp(r, 'ada@example.com'), bob: await signUp(r, 'bob@example.com') };
}

const create = async (r: Rig, token: string, body: unknown): Promise<Response> => go(r, '/api/links', withJson('POST', token, body));
const made = async (r: Rig, token: string, body: unknown): Promise<Link> => (await create(r, token, body)).json() as Promise<Link>;

describe('health, sponsors, and scan host are public', () => {
  test('health says when it answered', async () => {
    const res = await go(rig(), '/healthz');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'healthy', service: 'quickqr2-api', time: expect.stringMatching(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/) });
  });

  test('the active sponsor is the seeded one, and none is null', async () => {
    const r = rig();
    const body = (await (await go(r, '/api/sponsors/active')).json()) as { sponsor: { id: string } };
    expect(body.sponsor.id).toBe('spn-fieldnote');
    r.db.sqlite.exec('UPDATE sponsors SET active = 0');
    expect(await (await go(r, '/api/sponsors/active')).json()).toEqual({ sponsor: null });
  });

  test('there is no LAN on the edge, so the scan host is empty', async () => {
    const res = await go(rig(), '/api/scan-host');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ host: '' });
  });
});

describe('creating a link', () => {
  test('needs a session', async () => {
    const r = rig();
    for (const init of [{ method: 'POST', body: '{"destination_url":"a.co"}' }, { method: 'POST', ...bearer('stale'), body: '{"destination_url":"a.co"}' }]) {
      const res = await go(r, '/api/links', init);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Sign in to continue.' });
    }
  });

  test('fills in the code, title, ad style, and https, and never shows the owner', async () => {
    const { r, ada } = await pair();
    const res = await create(r, ada.token, { destination_url: '  example.com/menu  ' });
    expect(res.status).toBe(201);
    const link = (await res.json()) as Link;
    expect(link).toEqual({
      id: expect.stringMatching(/^lnk-[2-9a-hjkmnp-z]{8}$/),
      code: expect.stringMatching(/^[2-9a-hjkmnp-z]{6}$/),
      title: 'Dynamic QR Link',
      destination_url: 'https://example.com/menu',
      created_at: expect.stringMatching(/^\d{4}-/),
      updated_at: expect.stringMatching(/^\d{4}-/),
      total_scans: 0,
      ad_style: 'interstitial_3s',
      is_active: true,
    });
    expect(link).not.toHaveProperty('owner_id');
    expect(r.db.sqlite.query('SELECT owner_id FROM links WHERE code = ?').get(link.code)).toEqual({ owner_id: ada.id });
  });

  test('keeps what was asked for, trimmed, and leaves an http(s) address alone', async () => {
    const { r, ada } = await pair();
    const link = await made(r, ada.token, { code: '  summer  ', title: '  Summer menu ', destination_url: 'http://example.com/a', ad_style: 'direct' });
    expect(link).toMatchObject({ code: 'summer', title: 'Summer menu', destination_url: 'http://example.com/a', ad_style: 'direct' });
  });

  test('ignores fields a person must not set', async () => {
    const { r, ada, bob } = await pair();
    const link = await made(r, ada.token, { destination_url: 'a.co', owner_id: bob.id, id: 'lnk-chosen', total_scans: 99, is_active: false, created_at: '2001-01-01T00:00:00Z' });
    expect(link.id).not.toBe('lnk-chosen');
    expect(link.total_scans).toBe(0);
    expect(link.is_active).toBe(true);
    expect(link.created_at.startsWith('2001')).toBe(false);
    expect(r.db.sqlite.query('SELECT owner_id FROM links WHERE code = ?').get(link.code)).toEqual({ owner_id: ada.id });
  });

  test('a destination is required', async () => {
    const { r, ada } = await pair();
    for (const body of [{}, { destination_url: '' }, { destination_url: '   ' }, { title: 'x' }, null]) {
      const res = await create(r, ada.token, body);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'destination_url is required' });
    }
  });

  test('a code that is taken is a conflict, even when another person holds it', async () => {
    const { r, ada, bob } = await pair();
    expect((await create(r, ada.token, { code: 'taken', destination_url: 'a.co' })).status).toBe(201);
    for (const token of [ada.token, bob.token]) {
      const res = await create(r, token, { code: 'taken', destination_url: 'b.co' });
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({ error: 'Code already exists. Please choose a different custom slug.' });
    }
    expect((await (await go(r, '/api/links/taken', bearer(ada.token))).json() as Link).destination_url).toBe('https://a.co');
  });

  test('codes are case-sensitive and exact', async () => {
    const { r, ada } = await pair();
    expect((await create(r, ada.token, { code: 'Menu', destination_url: 'a.co' })).status).toBe(201);
    expect((await create(r, ada.token, { code: 'menu', destination_url: 'b.co' })).status).toBe(201);
  });

  test('a body that is not the right shape is a 400, and one over 64 KiB is a 413', async () => {
    const { r, ada } = await pair();
    const raw = (body: string): RequestInit => ({ method: 'POST', headers: { Authorization: `Bearer ${ada.token}` }, body });
    for (const body of ['{', '', 'nope', '[]', '"x"', '5', '{"destination_url":5}', '{"title":["a"]}', '{"destination_url":"a.co","ad_style":{}}']) {
      const res = await go(r, '/api/links', raw(body));
      expect([res.status, await res.json()]).toEqual([400, { error: 'Invalid request body' }]);
    }
    const big = await go(r, '/api/links', raw(JSON.stringify({ destination_url: 'a.co', title: 'x'.repeat(70 * 1024) })));
    expect([big.status, await big.json()]).toEqual([413, { error: 'Request body too large' }]);
    expect(r.db.sqlite.query('SELECT count(*) AS n FROM links').get()).toEqual({ n: 0 });
  });
});

describe('reading links', () => {
  test('the list is the caller\'s own, newest first, with a count', async () => {
    const { r, ada, bob } = await pair();
    await made(r, ada.token, { code: 'first', destination_url: 'a.co' });
    r.advance(5000);
    await made(r, ada.token, { code: 'second', destination_url: 'b.co' });
    await made(r, bob.token, { code: 'bobs', destination_url: 'c.co' });
    const body = (await (await go(r, '/api/links', bearer(ada.token))).json()) as { links: Link[]; count: number };
    expect(body.links.map((l) => l.code)).toEqual(['second', 'first']);
    expect(body.count).toBe(2);
    expect(body.links.every((l) => !('owner_id' in l))).toBe(true);
  });

  test('a person with no links gets an empty list, not null', async () => {
    const { r, ada } = await pair();
    expect(await (await go(r, '/api/links', bearer(ada.token))).json()).toEqual({ links: [], count: 0 });
  });

  test('a link is visible to its owner only; everyone else is told it does not exist', async () => {
    const { r, ada, bob } = await pair();
    await made(r, ada.token, { code: 'mine', title: 'Mine', destination_url: 'a.co' });
    const own = await go(r, '/api/links/mine', bearer(ada.token));
    expect([own.status, ((await own.json()) as Link).title]).toEqual([200, 'Mine']);
    const callers: [string, RequestInit, number][] = [
      ['someone else', bearer(bob.token), 404],
      ['a stale token', bearer('stale'), 401],
      ['no token', {}, 401],
    ];
    for (const [who, init, status] of callers) expect([who, (await go(r, '/api/links/mine', init)).status]).toEqual([who, status]);
    const foreign = await go(r, '/api/links/mine', bearer(bob.token));
    const missing = await go(r, '/api/links/nothing-here', bearer(bob.token));
    expect([foreign.status, await foreign.json()]).toEqual([404, { error: 'Link not found' }]);
    expect([missing.status, await missing.json()]).toEqual([404, { error: 'Link not found' }]);
  });
});

describe('updating a link', () => {
  test('changes only what is sent, adds https, and keeps the code', async () => {
    const { r, ada } = await pair();
    const before = await made(r, ada.token, { code: 'upd', title: 'Old', destination_url: 'old.example', ad_style: 'direct' });
    r.advance(5000);
    const res = await go(r, '/api/links/upd', withJson('PUT', ada.token, { destination_url: ' new.example/path ' }));
    expect(res.status).toBe(200);
    const after = (await res.json()) as Link;
    expect(after).toMatchObject({ code: 'upd', title: 'Old', destination_url: 'https://new.example/path', ad_style: 'direct', id: before.id, created_at: before.created_at });
    expect(after.updated_at > before.updated_at).toBe(true);
    const retitled = (await (await go(r, '/api/links/upd', withJson('PUT', ada.token, { title: 'New', ad_style: 'interstitial_3s' }))).json()) as Link;
    expect(retitled).toMatchObject({ title: 'New', ad_style: 'interstitial_3s', destination_url: 'https://new.example/path' });
  });

  test('an empty update succeeds and changes nothing but the time', async () => {
    const { r, ada } = await pair();
    await made(r, ada.token, { code: 'same', title: 'T', destination_url: 'a.co' });
    const res = await go(r, '/api/links/same', withJson('PUT', ada.token, {}));
    expect([res.status, await res.json()]).toEqual([200, expect.objectContaining({ title: 'T', destination_url: 'https://a.co' })]);
  });

  test('only the owner may; someone else gets 404 even with a broken body, so existence is not revealed', async () => {
    const { r, ada, bob } = await pair();
    await made(r, ada.token, { code: 'locked', destination_url: 'a.co' });
    for (const body of [{ title: 'hijack' }, null]) {
      const res = await go(r, '/api/links/locked', withJson('PUT', bob.token, body));
      expect([res.status, await res.json()]).toEqual([404, { error: 'Link not found' }]);
    }
    const broken = await go(r, '/api/links/locked', { method: 'PUT', headers: { Authorization: `Bearer ${bob.token}` }, body: '{' });
    expect(broken.status).toBe(404);
    expect(((await (await go(r, '/api/links/locked', bearer(ada.token))).json()) as Link).title).toBe('Dynamic QR Link');
    expect((await go(r, '/api/links/locked', { method: 'PUT', body: '{}' })).status).toBe(401);
  });

  test('a broken body from the owner is a 400, and a huge one a 413', async () => {
    const { r, ada } = await pair();
    await made(r, ada.token, { code: 'owner', destination_url: 'a.co' });
    const put = (body: string): RequestInit => ({ method: 'PUT', headers: { Authorization: `Bearer ${ada.token}` }, body });
    expect((await go(r, '/api/links/owner', put('{'))).status).toBe(400);
    expect((await go(r, '/api/links/owner', put('{"title":1}'))).status).toBe(400);
    expect((await go(r, '/api/links/owner', put(JSON.stringify({ title: 'x'.repeat(70 * 1024) })))).status).toBe(413);
  });
});

describe('deleting a link', () => {
  test('removes it and its scans, for its owner only', async () => {
    const { r, ada, bob } = await pair();
    await made(r, ada.token, { code: 'gone', destination_url: 'a.co' });
    await recordScan(r.db, { linkCode: 'gone', timestamp: new Date(), ip: '203.0.113.9', userAgent: 'x', deviceType: 'Mobile', browser: 'Safari', referrer: 'Direct Scan', country: 'US', city: 'Local' }, configured.SCAN_HASH_KEY);

    const denied = await go(r, '/api/links/gone', { method: 'DELETE', ...bearer(bob.token) });
    expect([denied.status, await denied.json()]).toEqual([404, { error: 'Link not found' }]);
    expect((await go(r, '/api/links/gone', { method: 'DELETE' })).status).toBe(401);
    expect((await go(r, '/api/links/gone', bearer(ada.token))).status).toBe(200);

    const done = await go(r, '/api/links/gone', { method: 'DELETE', ...bearer(ada.token) });
    expect([done.status, await done.json()]).toEqual([200, { message: 'deleted' }]);
    expect((await go(r, '/api/links/gone', bearer(ada.token))).status).toBe(404);
    expect((await go(r, '/api/links/gone', { method: 'DELETE', ...bearer(ada.token) })).status).toBe(404);
    expect(r.db.sqlite.query('SELECT count(*) AS n FROM scans').get()).toEqual({ n: 0 });
  });

  test('the code is free to use again afterwards', async () => {
    const { r, ada, bob } = await pair();
    await made(r, ada.token, { code: 'reuse', destination_url: 'a.co' });
    await go(r, '/api/links/reuse', { method: 'DELETE', ...bearer(ada.token) });
    expect((await create(r, bob.token, { code: 'reuse', destination_url: 'b.co' })).status).toBe(201);
  });
});

describe('analytics', () => {
  const scan = (code: string, ip: string, device = 'Mobile') => ({
    linkCode: code,
    timestamp: new Date(),
    ip,
    userAgent: 'UA',
    deviceType: device,
    browser: 'Safari',
    referrer: 'Direct Scan',
    country: 'US',
    city: 'Local',
  });

  test('a link\'s analytics are its owner\'s, with the prefix instead of the address', async () => {
    const { r, ada, bob } = await pair();
    await made(r, ada.token, { code: 'stats', destination_url: 'a.co' });
    await recordScan(r.db, scan('stats', '203.0.113.9'), configured.SCAN_HASH_KEY);
    await recordScan(r.db, scan('stats', '203.0.113.77', 'Desktop'), configured.SCAN_HASH_KEY);

    const res = await go(r, '/api/links/stats/analytics', bearer(ada.token));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { link_code: string; total_scans: number; unique_devices: number; device_breakdown: Record<string, number>; recent_scans: { ip: string }[]; hourly_timeline: unknown[] };
    expect(body).toMatchObject({ link_code: 'stats', total_scans: 2, unique_devices: 2, device_breakdown: { Mobile: 1, Desktop: 1 } });
    expect(body.recent_scans.map((s) => s.ip)).toEqual(['203.0.113.0/24', '203.0.113.0/24']);
    expect(body.hourly_timeline).toHaveLength(6);
    expect(JSON.stringify(body)).not.toContain('203.0.113.9');

    const foreign = await go(r, '/api/links/stats/analytics', bearer(bob.token));
    expect([foreign.status, await foreign.json()]).toEqual([404, { error: 'Link not found' }]);
    expect((await go(r, '/api/links/stats/analytics')).status).toBe(401);
  });

  test('global analytics cover the caller\'s links only', async () => {
    const { r, ada, bob } = await pair();
    await made(r, ada.token, { code: 'a1', destination_url: 'a.co' });
    await made(r, ada.token, { code: 'a2', destination_url: 'a.co' });
    await made(r, bob.token, { code: 'b1', destination_url: 'b.co' });
    for (const code of ['a1', 'a1', 'a2', 'b1', 'b1', 'b1']) await recordScan(r.db, scan(code, '198.51.100.4'), configured.SCAN_HASH_KEY);

    const mine = (await (await go(r, '/api/analytics/global', bearer(ada.token))).json()) as { total_scans: number; link_code?: string };
    expect(mine.total_scans).toBe(3);
    expect(mine).not.toHaveProperty('link_code');
    expect(((await (await go(r, '/api/analytics/global', bearer(bob.token))).json()) as { total_scans: number }).total_scans).toBe(3);
    expect((await go(r, '/api/analytics/global')).status).toBe(401);
  });

  describe('trends for the dashboard', () => {
    type Trends = { hours: string[]; links: { code: string; counts: number[] }[]; error?: string };
    const trends = async (r: Rig, token?: string): Promise<{ status: number; body: Trends }> => {
      const res = await go(r, '/api/analytics/trends', token ? bearer(token) : {});
      return { status: res.status, body: (await res.json()) as Trends };
    };
    const scanNow = (r: Rig, code: string) => recordScan(r.db, { ...scan(code, '198.51.100.4'), timestamp: r.now() }, configured.SCAN_HASH_KEY);

    test("answer with the caller's links only, six hours of counts each, in one request", async () => {
      const { r, ada, bob } = await pair();
      for (const code of ['a1', 'a2', 'quiet']) await made(r, ada.token, { code, destination_url: 'a.co' });
      await made(r, bob.token, { code: 'b1', destination_url: 'b.co' });
      for (const code of ['a1', 'a1', 'a2', 'b1', 'b1', 'b1']) await scanNow(r, code);

      const mine = await trends(r, ada.token);
      expect(mine.status).toBe(200);
      expect(mine.body.hours).toHaveLength(6);
      expect(mine.body.hours[5]).toBe(`${r.now().toISOString().slice(0, 13)}:00:00Z`);
      expect(mine.body.links).toEqual([
        { code: 'a1', counts: [0, 0, 0, 0, 0, 2] },
        { code: 'a2', counts: [0, 0, 0, 0, 0, 1] },
      ]); // "quiet" had no scans, and bob's link is not here
      expect((await trends(r, bob.token)).body.links).toEqual([{ code: 'b1', counts: [0, 0, 0, 0, 0, 3] }]);
    });

    test('need a session', async () => {
      const r = rig();
      expect(await trends(r)).toMatchObject({ status: 401, body: { error: 'Sign in to continue.' } });
      expect((await trends(r, 'stale-token-value')).status).toBe(401);
    });

    test("move with the app's clock: two hours later the scan is two buckets back, and after six it is gone", async () => {
      const { r, ada } = await pair();
      await made(r, ada.token, { code: 'clock', destination_url: 'a.co' });
      await scanNow(r, 'clock');
      r.advance(2 * 3_600_000);
      expect((await trends(r, ada.token)).body.links).toEqual([{ code: 'clock', counts: [0, 0, 0, 1, 0, 0] }]);
      r.advance(4 * 3_600_000);
      expect((await trends(r, ada.token)).body.links).toEqual([]);
    });
  });
});
