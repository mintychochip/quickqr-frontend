import { describe, expect, spyOn, test } from 'bun:test';
import { newGiftToken } from './gifts';
import { sha256Hex } from './ids';
import { createGrant, redeemGrant } from './store/gifts';
import { bearer, go, location, rig, signUp, withJson, type Rig } from './test/rig';

interface ScanRow {
  link_code: string;
  device_type: string;
  browser: string;
  referrer: string;
  ip_prefix: string;
  country: string;
  city: string;
  user_agent: string;
}

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function setup(): Promise<{ r: Rig; token: string }> {
  const r = rig();
  const { token } = await signUp(r, 'ada@example.com');
  return { r, token };
}

const make = async (r: Rig, token: string, body: unknown): Promise<void> => {
  const res = await go(r, '/api/links', withJson('POST', token, body));
  expect(res.status).toBe(201);
};

const scans = (r: Rig): ScanRow[] =>
  r.db.sqlite.query('SELECT link_code, device_type, browser, referrer, ip_prefix, country, city, user_agent FROM scans ORDER BY id').all() as ScanRow[];

const scan = async (r: Rig, path: string, headers: Record<string, string> = {}): Promise<Response> => {
  const res = await go(r, path, { headers });
  await r.settle();
  return res;
};

describe('finding the link', () => {
  test('a path with no code is the plain 404, and so is anything but /r/ or /R/', async () => {
    const { r } = await setup();
    for (const path of ['/r/', '/R/', '/r//']) {
      const res = await scan(r, path);
      expect([res.status, res.headers.get('Content-Type'), await res.text()]).toEqual([404, 'text/plain; charset=utf-8', '404 page not found\n']);
    }
    expect(scans(r)).toEqual([]);
  });

  test('a code that does not exist is a 404 page that names it, and nothing is recorded', async () => {
    const { r } = await setup();
    const res = await scan(r, '/r/nothing');
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(await res.text()).toContain('<code>/r/nothing</code>');
    expect(scans(r)).toEqual([]);
  });

  test('the name is escaped on the 404 page', async () => {
    const { r } = await setup();
    const page = await (await scan(r, `/r/${encodeURIComponent('<img src=x onerror=alert(1)>')}`)).text();
    expect(page).not.toContain('<img src=x');
    expect(page).toContain('<code>/r/&lt;img src=x onerror=alert(1)&gt;</code>');
  });

  test('an exact match wins, then the lowercase form is tried, and the 404 page shows the lowercase form', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'Exact', destination_url: 'upper.example', ad_style: 'direct' });
    await make(r, token, { code: 'quiet', destination_url: 'lower.example', ad_style: 'direct' });
    expect(location(await scan(r, '/r/Exact')).host).toBe('upper.example');
    expect(location(await scan(r, '/r/QUIET')).host).toBe('lower.example');
    expect(scans(r).map((s) => s.link_code)).toEqual(['Exact', 'quiet']);
    expect(await (await scan(r, '/r/MISSING')).text()).toContain('<code>/r/missing</code>');
  });

  test('/R/ is the same gateway, and extra path segments are ignored', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'abc', destination_url: 'a.example', ad_style: 'direct' });
    for (const path of ['/R/abc', '/r/abc/more/segments?x=1']) expect(location(await scan(r, path)).host).toBe('a.example');
    expect(scans(r)).toHaveLength(2);
  });

  test('a deleted link answers 404 again', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'gone', destination_url: 'a.example' });
    await go(r, '/api/links/gone', { method: 'DELETE', ...bearer(token) });
    expect((await scan(r, '/r/gone')).status).toBe(404);
  });
});

describe('what a scan shows', () => {
  test('an ordinary link shows the pause with the sponsor, and is never cached', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'pause', title: 'Our cafe', destination_url: 'cafe.example/menu' });
    const res = await scan(r, '/r/pause');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
    const page = await res.text();
    expect(page).toContain('<title>Redirecting to Our cafe | quickqr.app</title>');
    expect(page).toContain('<meta http-equiv="refresh" content="3;url=https://cafe.example/menu">');
    expect(page).toContain('Sponsored message');
  });

  test('with no active sponsor the pause explains itself instead', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'pause', destination_url: 'a.example' });
    r.db.sqlite.exec('UPDATE sponsors SET active = 0');
    const page = await (await scan(r, '/r/pause')).text();
    expect(page).toContain('How it stays free');
    expect(page).not.toContain('Sponsored message');
  });

  test('?direct=1 and the direct ad style go straight to the destination', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'pause', destination_url: 'a.example/x?y=1' });
    await make(r, token, { code: 'fast', destination_url: 'b.example', ad_style: 'direct' });
    const forced = await scan(r, '/r/pause?direct=1');
    expect([forced.status, forced.headers.get('Location')]).toEqual([302, 'https://a.example/x?y=1']);
    const styled = await scan(r, '/r/fast');
    expect([styled.status, styled.headers.get('Location')]).toEqual([302, 'https://b.example']);
    expect(scans(r)).toHaveLength(2);
  });

  test('the sponsor banner style, and any other value of direct, still show the pause', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'banner', destination_url: 'a.example', ad_style: 'sponsor_banner' });
    for (const path of ['/r/banner', '/r/banner?direct=0', '/r/banner?direct=true', '/r/banner?direct=']) {
      const res = await scan(r, path);
      expect([path, res.status]).toEqual([path, 200]);
    }
  });

  test('a menu is served as a page, and a link page as another', async () => {
    const { r, token } = await setup();
    const menu = (await (await go(r, '/api/menus', withJson('POST', token, { title: 'Lunch', items: [{ name: 'Soup', price: '6' }] }))).json()) as { code: string };
    const page = (await (await go(r, '/api/pages', withJson('POST', token, { title: 'Me', links: [{ name: 'Site', url: 'https://a.example' }] }))).json()) as { code: string };
    const menuRes = await scan(r, `/r/${menu.code}`);
    expect([menuRes.status, menuRes.headers.get('Cache-Control')]).toEqual([200, 'no-store, no-cache, must-revalidate']);
    expect(await menuRes.text()).toContain('data-testid="public-menu-item-name">Soup<');
    const pageRes = await scan(r, `/r/${page.code}?direct=1`);
    expect(pageRes.status).toBe(200); // direct does not apply to a hosted page
    expect(await pageRes.text()).toContain('data-testid="public-page-link-url" href="https://a.example"');
    expect(scans(r)).toHaveLength(2);
  });

  test('a destination with characters a header cannot carry is escaped, and cannot inject a header', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'intl', destination_url: 'https://example.com/日本?q=café', ad_style: 'direct' });
    const intl = await scan(r, '/r/intl');
    expect([intl.status, intl.headers.get('Location')]).toEqual([302, 'https://example.com/%E6%97%A5%E6%9C%AC?q=caf%C3%A9']);

    await make(r, token, { code: 'inject', destination_url: 'https://example.com/a\r\nSet-Cookie: pwned=1', ad_style: 'direct' });
    const hostile = await scan(r, '/r/inject');
    expect(hostile.status).toBe(302);
    expect(hostile.headers.get('Set-Cookie')).toBeNull();
    expect(hostile.headers.get('Location')).toBe('https://example.com/a%0D%0ASet-Cookie: pwned=1');
  });
});

describe('recording scans', () => {
  test('keeps what is useful: device, browser, referrer, the network of the address, and counts it on the link', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'rec', destination_url: 'a.example' });
    await scan(r, '/r/rec', { 'User-Agent': IPHONE, Referer: 'https://news.example/post', 'CF-Connecting-IP': '203.0.113.77' });
    expect(scans(r)).toEqual([
      { link_code: 'rec', device_type: 'iOS', browser: 'Safari', referrer: 'https://news.example/post', ip_prefix: '203.0.113.0/24', country: 'US', city: 'Local', user_agent: IPHONE },
    ]);
    expect(((await (await go(r, '/api/links/rec', bearer(token))).json()) as { total_scans: number }).total_scans).toBe(1);
  });

  test('a scan with no referrer is a "Direct Scan"', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'rec', destination_url: 'a.example' });
    await scan(r, '/r/rec');
    expect(scans(r)[0]?.referrer).toBe('Direct Scan');
  });

  test('the address comes from the edge, never from a header the visitor can set', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'rec', destination_url: 'a.example' });
    await scan(r, '/r/rec', { 'CF-Connecting-IP': '198.51.100.9', 'X-Forwarded-For': '203.0.113.1', 'X-Real-IP': '203.0.113.2' });
    await scan(r, '/r/rec', { 'X-Forwarded-For': '203.0.113.1' });
    expect(scans(r).map((s) => s.ip_prefix)).toEqual(['198.51.100.0/24', 'unknown']);
  });

  test('the scan is recorded after the response is sent, through waitUntil', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'rec', destination_url: 'a.example', ad_style: 'direct' });
    const res = await go(r, '/r/rec');
    expect(res.status).toBe(302);
    expect(r.waiting).toHaveLength(1);
    await r.settle();
    expect(scans(r)).toHaveLength(1);
  });

  test('a scan that cannot be recorded never stops the redirect', async () => {
    const { r, token } = await setup();
    await make(r, token, { code: 'rec', destination_url: 'a.example', ad_style: 'direct' });
    r.db.sqlite.exec('DROP TABLE scans');
    const res = await go(r, '/r/rec');
    expect([res.status, res.headers.get('Location')]).toEqual([302, 'https://a.example']);
    await r.settle(); // the failure is swallowed, not thrown
  });
});

describe('an owner on a plan', () => {
  const DAY = 86_400_000;

  /** Gives a person a plan the way a claimed gift does. */
  async function gift(r: Rig, userId: string, plan: 'plus' | 'pro' = 'plus', days = 30): Promise<void> {
    const tokenHash = await sha256Hex(newGiftToken());
    await createGrant(r.db, { tokenHash, plan, days, maxUses: 1, redeemBy: new Date(r.now().getTime() + 7 * DAY).toISOString(), note: '', createdBy: 'test' }, r.now());
    expect((await redeemGrant(r.db, tokenHash, userId, r.now())).kind).toBe('granted');
  }

  test('their scans go straight to the destination while a person without one still sees the pause', async () => {
    const r = rig();
    const free = await signUp(r, 'free@example.com');
    const paid = await signUp(r, 'paid@example.com');
    await gift(r, paid.id);
    await make(r, free.token, { code: 'freecode', destination_url: 'free.example/x' });
    await make(r, paid.token, { code: 'paidcode', destination_url: 'paid.example/x' });

    const withPause = await scan(r, '/r/freecode');
    expect(withPause.status).toBe(200);
    expect(await withPause.text()).toContain('Redirecting to');

    const straight = await scan(r, '/r/paidcode');
    expect([straight.status, straight.headers.get('Location')]).toEqual([302, 'https://paid.example/x']);
    expect(scans(r).map((s) => s.link_code)).toEqual(['freecode', 'paidcode']);
  });

  test('Pro skips it too, and so does the banner style', async () => {
    const r = rig();
    const pro = await signUp(r, 'pro@example.com');
    await gift(r, pro.id, 'pro');
    await make(r, pro.token, { code: 'banner', destination_url: 'a.example', ad_style: 'sponsor_banner' });
    await make(r, pro.token, { code: 'timed', destination_url: 'b.example', ad_style: 'interstitial_3s' });
    for (const code of ['banner', 'timed']) expect((await scan(r, `/r/${code}`)).status, code).toBe(302);
  });

  test('the pause is back the instant the plan ends', async () => {
    const r = rig();
    const paid = await signUp(r, 'paid@example.com');
    await gift(r, paid.id, 'plus', 10);
    await make(r, paid.token, { code: 'later', destination_url: 'a.example' });

    r.advance(10 * DAY - 1);
    expect((await scan(r, '/r/later')).status).toBe(302);
    r.advance(1);
    expect((await scan(r, '/r/later')).status).toBe(200);
  });

  test('their menu and link page are still pages, never a redirect', async () => {
    const r = rig();
    const paid = await signUp(r, 'paid@example.com');
    await gift(r, paid.id);
    const menu = (await (await go(r, '/api/menus', withJson('POST', paid.token, { title: 'Lunch', items: [{ name: 'Soup', price: '6' }] }))).json()) as { code: string };
    const page = (await (await go(r, '/api/pages', withJson('POST', paid.token, { title: 'Me', links: [{ name: 'Site', url: 'https://a.example' }] }))).json()) as { code: string };
    expect((await scan(r, `/r/${menu.code}`)).status).toBe(200);
    expect((await scan(r, `/r/${page.code}`)).status).toBe(200);
  });

  test('a plan lookup that fails never stops a scan: the owner is treated as Free, and the failure is logged', async () => {
    const r = rig();
    const owner = await signUp(r, 'owner@example.com');
    await make(r, owner.token, { code: 'unmigrated', destination_url: 'a.example/x' });
    r.db.sqlite.exec('DROP TABLE entitlements'); // a database the 0002 migration has not reached yet

    const logged = spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await scan(r, '/r/unmigrated');
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('Redirecting to');
      expect(scans(r).map((s) => s.link_code)).toEqual(['unmigrated']);
      expect(logged).toHaveBeenCalled();
    } finally {
      logged.mockRestore();
    }
  });
});
