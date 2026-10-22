import { beforeEach, describe, expect, test } from 'bun:test';
import { sha256Hex } from './ids';
import { StoreError } from './store/errors';
import {
  createLink,
  createMenu,
  createPage,
  deleteLink,
  getLink,
  listLinksByOwner,
  toPublicLink,
  updateLink,
  updateLinkSettings,
  updateMenu,
  updatePage,
} from './store/links';
import { getActiveSponsor, getAnalytics, getAnalyticsForOwner, purgeScansBefore, recordScan, scanIdentity } from './store/scans';
import {
  consumeOAuthState,
  linkOAuthIdentity,
  loginOrRegisterOAuth,
  logoutToken,
  peekOAuthState,
  saveOAuthState,
  userFromToken,
} from './store/users';
import { testDb, type TestDb } from './test/sqlite';

let db: TestDb;
beforeEach(() => {
  db = testDb();
});

const KEY = 'test-hash-key';
const NOW = new Date('2026-10-22T15:30:00.000Z');
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);
const hours = (n: number) => minutes(n * 60);
const days = (n: number) => hours(n * 24);

async function rejects(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (e) {
    return e instanceof StoreError ? e.code : undefined;
  }
  return undefined;
}

const link = (ownerId: string, c: string, now = NOW) =>
  createLink(db, { code: c, title: `Link ${c}`, destinationUrl: `https://example.com/${c}`, adStyle: 'interstitial_3s', ownerId }, now);

const scan = (linkCode: string, over: Partial<Parameters<typeof recordScan>[1]> = {}) =>
  recordScan(
    db,
    { linkCode, timestamp: NOW, ip: '203.0.113.7', userAgent: 'UA', deviceType: 'Desktop', browser: 'Chrome', referrer: 'Direct Scan', country: 'US', city: 'Local', ...over },
    KEY,
  );

describe('users and sessions', () => {
  test('a first sign-in creates one user, and the same identity signs in as that user again', async () => {
    const a = await loginOrRegisterOAuth(db, 'google', 'sub-1', 'ada@example.com', NOW);
    const b = await loginOrRegisterOAuth(db, 'google', 'sub-1', 'ada@example.com', NOW);
    expect(a.user.id).toMatch(/^usr-[2-9a-hjkmnp-z]{10}$/);
    expect(b.user.id).toBe(a.user.id);
    expect(b.token).not.toBe(a.token);
    expect(a.user).toEqual({ id: a.user.id, email: 'ada@example.com', created_at: NOW.toISOString() });
  });

  test('an address that is already registered is reached through a new provider', async () => {
    const first = await loginOrRegisterOAuth(db, 'google', 'g-1', 'ada@example.com', NOW);
    const second = await loginOrRegisterOAuth(db, 'github', 'h-9', 'ada@example.com', NOW);
    expect(second.user.id).toBe(first.user.id);
    const again = await loginOrRegisterOAuth(db, 'github', 'h-9', 'someone-else@example.com', NOW);
    expect(again.user.id).toBe(first.user.id);
  });

  test('the provider is case-insensitive and the email is lowercased and trimmed', async () => {
    const a = await loginOrRegisterOAuth(db, ' Google ', ' sub ', '  ADA@Example.COM ', NOW);
    const b = await loginOrRegisterOAuth(db, 'google', 'sub', 'ada@example.com', NOW);
    expect(a.user.email).toBe('ada@example.com');
    expect(b.user.id).toBe(a.user.id);
  });

  test('refuses an invalid address or an empty identity', async () => {
    expect(await rejects(loginOrRegisterOAuth(db, 'google', 'sub', '', NOW))).toBe('invalid_email');
    expect(await rejects(loginOrRegisterOAuth(db, 'google', 'sub', 'not-an-email', NOW))).toBe('invalid_email');
    expect(await rejects(loginOrRegisterOAuth(db, '', 'sub', 'a@example.com', NOW))).toBe('invalid_identity');
    expect(await rejects(loginOrRegisterOAuth(db, 'google', '  ', 'a@example.com', NOW))).toBe('invalid_identity');
  });

  test('a linked identity signs in as the user it was linked to', async () => {
    const owner = await loginOrRegisterOAuth(db, 'google', 'g-1', 'ada@example.com', NOW);
    await linkOAuthIdentity(db, 'github', 'h-1', owner.user.id);
    const viaGithub = await loginOrRegisterOAuth(db, 'github', 'h-1', 'different@example.com', NOW);
    expect(viaGithub.user.id).toBe(owner.user.id);
  });

  test('a session token resolves to its user, and stops working after logout', async () => {
    const { user, token } = await loginOrRegisterOAuth(db, 'google', 'sub', 'ada@example.com', NOW);
    expect(await userFromToken(db, token, NOW)).toEqual(user);
    expect(await userFromToken(db, `  ${token}  `, NOW)).toEqual(user);
    await logoutToken(db, token);
    expect(await userFromToken(db, token, NOW)).toBeNull();
  });

  test('a session lasts 30 days', async () => {
    const { token } = await loginOrRegisterOAuth(db, 'google', 'sub', 'ada@example.com', NOW);
    expect(await userFromToken(db, token, days(29))).not.toBeNull();
    expect(await userFromToken(db, token, days(31))).toBeNull();
  });

  test('an empty or unknown token is no session', async () => {
    expect(await userFromToken(db, '', NOW)).toBeNull();
    expect(await userFromToken(db, 'nope', NOW)).toBeNull();
  });

  test('only the hash of a token is stored', async () => {
    const { token } = await loginOrRegisterOAuth(db, 'google', 'sub', 'ada@example.com', NOW);
    const rows = db.sqlite.query('SELECT token_hash FROM sessions').all() as { token_hash: string }[];
    expect(rows).toEqual([{ token_hash: await sha256Hex(token) }]);
    expect(JSON.stringify(db.sqlite.query('SELECT * FROM sessions').all())).not.toContain(token);
  });
});

describe('sign-in state', () => {
  const state = { provider: 'google', returnTo: 'https://quickqr.app/', expiresAt: minutes(10), as: '' };

  test('peek reads without consuming, consume is single use', async () => {
    await saveOAuthState(db, 's1', state);
    expect(await peekOAuthState(db, 's1', NOW)).toEqual(state);
    expect(await peekOAuthState(db, 's1', NOW)).toEqual(state);
    expect(await consumeOAuthState(db, 's1', NOW)).toEqual(state);
    expect(await consumeOAuthState(db, 's1', NOW)).toBeNull();
    expect(await peekOAuthState(db, 's1', NOW)).toBeNull();
  });

  test('an expired or empty state is refused, and consuming an expired one still removes it', async () => {
    await saveOAuthState(db, 's2', state);
    expect(await peekOAuthState(db, 's2', minutes(11))).toBeNull();
    expect(await consumeOAuthState(db, 's2', minutes(11))).toBeNull();
    expect(db.sqlite.query('SELECT count(*) AS n FROM oauth_states').get()).toEqual({ n: 0 });
    expect(await peekOAuthState(db, '  ', NOW)).toBeNull();
    expect(await consumeOAuthState(db, '', NOW)).toBeNull();
  });

  test('saving sweeps states that have already expired', async () => {
    await saveOAuthState(db, 'old', { ...state, expiresAt: minutes(-5) });
    await saveOAuthState(db, 'new', state, NOW);
    expect(db.sqlite.query('SELECT state FROM oauth_states').all()).toEqual([{ state: 'new' }]);
  });
});

describe('links', () => {
  test('creating a link records its owner, starts active with no scans, and hides nothing but the owner', async () => {
    const l = await link('usr-a', 'abc123');
    expect(l).toEqual({
      id: expect.stringMatching(/^lnk-[2-9a-hjkmnp-z]{8}$/),
      code: 'abc123',
      title: 'Link abc123',
      destination_url: 'https://example.com/abc123',
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
      total_scans: 0,
      ad_style: 'interstitial_3s',
      is_active: true,
    });
    expect(Object.keys(l)).not.toContain('owner_id');
  });

  test('a link needs an owner, and a code can be used once', async () => {
    expect(await rejects(link('', 'abc123'))).toBe('owner_required');
    await link('usr-a', 'abc123');
    expect(await rejects(link('usr-b', 'abc123'))).toBe('conflict');
  });

  test('codes are exact-match and a missing code is simply absent', async () => {
    await link('usr-a', 'abc123');
    expect((await getLink(db, 'abc123'))?.owner_id).toBe('usr-a');
    expect(await getLink(db, 'ABC123')).toBeNull();
    expect(await getLink(db, 'missing')).toBeNull();
  });

  test('toPublicLink drops the owner', async () => {
    await link('usr-a', 'abc123');
    expect(Object.keys(toPublicLink((await getLink(db, 'abc123'))!))).not.toContain('owner_id');
  });

  test('a person lists their own links, newest first, ties broken by code', async () => {
    await link('usr-a', 'old', minutes(-10));
    await link('usr-a', 'bb', NOW);
    await link('usr-a', 'aa', NOW);
    await link('usr-b', 'theirs', NOW);
    expect((await listLinksByOwner(db, 'usr-a')).map((l) => l.code)).toEqual(['aa', 'bb', 'old']);
    expect(await listLinksByOwner(db, '')).toEqual([]);
    expect(await listLinksByOwner(db, 'usr-nobody')).toEqual([]);
  });

  test('updating changes only the fields given and touches updated_at', async () => {
    await link('usr-a', 'abc123');
    const u = await updateLink(db, 'abc123', 'https://example.com/new', '', '', minutes(5));
    expect(u.destination_url).toBe('https://example.com/new');
    expect(u.title).toBe('Link abc123');
    expect(u.ad_style).toBe('interstitial_3s');
    expect(u.updated_at).toBe(minutes(5).toISOString());
    expect(u.created_at).toBe(NOW.toISOString());
    expect(await rejects(updateLink(db, 'missing', 'x', '', ''))).toBe('not_found');
  });

  test('settings apply only what is provided, trim text, and can set or clear the style', async () => {
    await link('usr-a', 'abc123');
    const style = { fgColor: '#000000', bgColor: '#ffffff', errorLevel: 'M', frame: 'none' };
    let l = await updateLinkSettings(db, 'abc123', { title: '  New  ', style }, minutes(1));
    expect(l.title).toBe('New');
    expect(l.destination_url).toBe('https://example.com/abc123');
    expect(l.style).toEqual(style);
    l = await updateLinkSettings(db, 'abc123', { adStyle: 'direct' }, minutes(2));
    expect(l.ad_style).toBe('direct');
    expect(l.style).toEqual(style);
    l = await updateLinkSettings(db, 'abc123', { destinationUrl: ' https://example.com/z ', style: null }, minutes(3));
    expect(l.destination_url).toBe('https://example.com/z');
    expect(l.style).toBeUndefined();
    expect(await rejects(updateLinkSettings(db, 'missing', { title: 'x' }))).toBe('not_found');
  });

  test('deleting removes the link and its scans, and the code can then be reused', async () => {
    await link('usr-a', 'abc123');
    await scan('abc123');
    await deleteLink(db, 'abc123');
    expect(await getLink(db, 'abc123')).toBeNull();
    expect(db.sqlite.query('SELECT count(*) AS n FROM scans').get()).toEqual({ n: 0 });
    expect(await rejects(deleteLink(db, 'abc123'))).toBe('not_found');
    await link('usr-b', 'abc123');
    expect((await getAnalytics(db, 'abc123', NOW)).total_scans).toBe(0);
  });
});

describe('menus and link pages', () => {
  test('a menu is validated, trimmed, owned, and answers on its own /r/ address', async () => {
    const m = await createMenu(db, 'usr-a', '  Lunch ', [{ name: ' Soup ', price: ' 6.00 ' }], NOW);
    // Read the generated fields first: toMatchObject with a matcher can overwrite them on the received object.
    const { id, code } = m;
    expect(id).toMatch(/^menu-[2-9a-hjkmnp-z]{8}$/);
    expect(code).toMatch(/^[2-9a-hjkmnp-z]{6}$/);
    expect(m).toMatchObject({
      title: 'Lunch',
      destination_url: `/r/${code}`,
      ad_style: 'menu',
      kind: 'menu',
      items: [{ name: 'Soup', price: '6.00' }],
      total_scans: 0,
      is_active: true,
    });
    expect((await getLink(db, code))?.owner_id).toBe('usr-a');
  });

  test('a menu needs an owner, a title, and items that each have a name and a price', async () => {
    const good = [{ name: 'Soup', price: '6' }];
    expect(await rejects(createMenu(db, '', 'T', good))).toBe('owner_required');
    expect(await rejects(createMenu(db, 'u', '  ', good))).toBe('invalid_menu');
    expect(await rejects(createMenu(db, 'u', 'T', []))).toBe('invalid_menu');
    expect(await rejects(createMenu(db, 'u', 'T', [{ name: '', price: '6' }]))).toBe('invalid_menu');
    expect(await rejects(createMenu(db, 'u', 'T', [{ name: 'Soup', price: ' ' }]))).toBe('invalid_menu');
  });

  test('updating a menu replaces its title and items, and refuses anything that is not a menu', async () => {
    const m = await createMenu(db, 'u', 'Lunch', [{ name: 'Soup', price: '6' }], NOW);
    const u = await updateMenu(db, m.code, 'Dinner', [{ name: 'Stew', price: '9' }], minutes(5));
    expect(u.title).toBe('Dinner');
    expect(u.items).toEqual([{ name: 'Stew', price: '9' }]);
    expect(u.updated_at).toBe(minutes(5).toISOString());
    await link('u', 'plain1');
    expect(await rejects(updateMenu(db, 'plain1', 'T', [{ name: 'a', price: '1' }]))).toBe('not_found');
    expect(await rejects(updateMenu(db, m.code, '', []))).toBe('invalid_menu');
  });

  test('a link page keeps only http(s) links that have a host and a name', async () => {
    const p = await createPage(db, 'u', ' Links ', [{ name: ' Shop ', url: ' https://example.com/shop ' }], NOW);
    expect(p).toMatchObject({ id: expect.stringMatching(/^page-/), title: 'Links', ad_style: 'linkpage', kind: 'linkpage', links: [{ name: 'Shop', url: 'https://example.com/shop' }] });
    const bad = [
      [{ name: '', url: 'https://example.com' }],
      [{ name: 'x', url: 'javascript:alert(1)' }],
      [{ name: 'x', url: 'ftp://example.com' }],
      [{ name: 'x', url: 'https://' }],
      [{ name: 'x', url: 'not a url' }],
      [],
    ];
    for (const links of bad) expect(await rejects(createPage(db, 'u', 'T', links))).toBe('invalid_page');
    expect(await rejects(createPage(db, 'u', '', [{ name: 'x', url: 'https://example.com' }]))).toBe('invalid_page');
    expect(await rejects(createPage(db, '', 'T', [{ name: 'x', url: 'https://example.com' }]))).toBe('owner_required');
  });

  test('updating a page refuses a menu and a plain link', async () => {
    const p = await createPage(db, 'u', 'T', [{ name: 'x', url: 'https://example.com' }], NOW);
    const u = await updatePage(db, p.code, 'T2', [{ name: 'y', url: 'https://example.org' }], minutes(2));
    expect(u.links).toEqual([{ name: 'y', url: 'https://example.org' }]);
    const m = await createMenu(db, 'u', 'M', [{ name: 'a', price: '1' }], NOW);
    expect(await rejects(updatePage(db, m.code, 'T', [{ name: 'y', url: 'https://example.org' }]))).toBe('not_found');
  });
});

describe('scan identity', () => {
  test('keeps the /24 of an IPv4 address and the /48 of an IPv6 one', async () => {
    expect((await scanIdentity(KEY, '203.0.113.7')).prefix).toBe('203.0.113.0/24');
    expect((await scanIdentity(KEY, '2001:db8:1234:5678::1')).prefix).toBe('2001:db8:1234::/48');
    expect((await scanIdentity(KEY, '2001:DB8:0:0:0:0:0:1')).prefix).toBe('2001:db8:0::/48');
    expect((await scanIdentity(KEY, '::ffff:203.0.113.7')).prefix).toBe('203.0.113.0/24');
    expect((await scanIdentity(KEY, 'not an ip')).prefix).toBe('unknown');
    expect((await scanIdentity(KEY, '')).prefix).toBe('unknown');
  });

  test('hashes with the key: stable, keyed, and never containing the address', async () => {
    const a = await scanIdentity(KEY, '203.0.113.7');
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect((await scanIdentity(KEY, '203.0.113.7')).hash).toBe(a.hash);
    expect((await scanIdentity('another-key', '203.0.113.7')).hash).not.toBe(a.hash);
    expect((await scanIdentity(KEY, '203.0.113.8')).hash).not.toBe(a.hash);
    expect(a.hash).not.toContain('203');
  });
});

describe('scans and analytics', () => {
  test('a scan counts on its link and is refused for a link that does not exist', async () => {
    await link('usr-a', 'abc123');
    await scan('abc123');
    await scan('abc123');
    expect((await getLink(db, 'abc123'))?.total_scans).toBe(2);
    expect(await rejects(scan('missing'))).toBe('not_found');
  });

  test('no raw address reaches the database', async () => {
    await link('usr-a', 'abc123');
    await scan('abc123', { ip: '203.0.113.7' });
    const row = db.sqlite.query('SELECT * FROM scans').get() as Record<string, unknown>;
    expect(JSON.stringify(row)).not.toContain('203.0.113.7');
    expect(row.ip_prefix).toBe('203.0.113.0/24');
    expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('summarizes devices, referrers and unique devices, and reports the prefix instead of the address', async () => {
    await link('usr-a', 'abc123');
    await scan('abc123', { ip: '203.0.113.7', deviceType: 'iOS', referrer: 'Direct Scan' });
    await scan('abc123', { ip: '203.0.113.7', deviceType: 'iOS', referrer: 'https://news.example/' });
    await scan('abc123', { ip: '203.0.113.99', deviceType: 'Android', referrer: 'Direct Scan' });
    const a = await getAnalytics(db, 'abc123', NOW);
    expect(a.link_code).toBe('abc123');
    expect(a.total_scans).toBe(3);
    expect(a.unique_devices).toBe(2);
    expect(a.device_breakdown).toEqual({ iOS: 2, Android: 1 });
    expect(a.top_referrers).toEqual({ 'Direct Scan': 2, 'https://news.example/': 1 });
    expect(a.recent_scans).toHaveLength(3);
    expect(a.recent_scans.every((s) => s.ip === '203.0.113.0/24' && s.link_code === 'abc123' && s.id.startsWith('scan-abc123-'))).toBe(true);
  });

  test('recent scans are newest first and capped at twenty', async () => {
    await link('usr-a', 'abc123');
    for (let i = 0; i < 25; i++) await scan('abc123', { timestamp: minutes(-i), userAgent: `UA-${i}` });
    const recent = (await getAnalytics(db, 'abc123', NOW)).recent_scans;
    expect(recent).toHaveLength(20);
    expect(recent[0].user_agent).toBe('UA-0');
    expect(recent[19].user_agent).toBe('UA-19');
    expect(recent[0].timestamp).toBe(NOW.toISOString());
  });

  test('an empty link has zeroed analytics with empty collections, not nulls', async () => {
    await link('usr-a', 'abc123');
    expect(await getAnalytics(db, 'abc123', NOW)).toMatchObject({
      total_scans: 0,
      unique_devices: 0,
      device_breakdown: {},
      top_referrers: {},
      recent_scans: [],
    });
  });

  test('the timeline is six hourly buckets ending at the current hour, labelled HH:00 in UTC', async () => {
    await link('usr-a', 'abc123');
    await scan('abc123', { timestamp: NOW });
    await scan('abc123', { timestamp: minutes(-40) });
    await scan('abc123', { timestamp: hours(-2) });
    await scan('abc123', { timestamp: hours(-5) });
    const t = (await getAnalytics(db, 'abc123', NOW)).hourly_timeline;
    expect(t.map((p) => p.time)).toEqual(['10:00', '11:00', '12:00', '13:00', '14:00', '15:00']);
    expect(t.map((p) => p.count)).toEqual([1, 0, 0, 1, 1, 1]);
  });

  test('a scan from the same hour yesterday is not counted in today\'s bucket', async () => {
    await link('usr-a', 'abc123');
    await scan('abc123', { timestamp: hours(-24) });
    await scan('abc123', { timestamp: hours(-6) });
    const a = await getAnalytics(db, 'abc123', NOW);
    expect(a.total_scans).toBe(2);
    expect(a.hourly_timeline.map((p) => p.count)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  test("an owner's analytics cover only the links they own", async () => {
    await link('usr-a', 'mine1');
    await link('usr-a', 'mine2');
    await link('usr-b', 'theirs');
    await scan('mine1', { ip: '203.0.113.7' });
    await scan('mine2', { ip: '198.51.100.9' });
    await scan('theirs', { ip: '192.0.2.1' });
    const own = await getAnalyticsForOwner(db, 'usr-a', NOW);
    expect(own.link_code).toBeUndefined();
    expect(own.total_scans).toBe(2);
    expect(own.unique_devices).toBe(2);
    expect((await getAnalyticsForOwner(db, 'usr-nobody', NOW)).total_scans).toBe(0);
    expect((await getAnalyticsForOwner(db, '', NOW)).total_scans).toBe(0);
  });

  test('old scans are purged in chunks and newer ones stay', async () => {
    await link('usr-a', 'abc123');
    for (let i = 0; i < 5; i++) await scan('abc123', { timestamp: days(-100 - i) });
    for (let i = 0; i < 3; i++) await scan('abc123', { timestamp: days(-1 - i) });
    expect(await purgeScansBefore(db, days(-90), 2)).toBe(2);
    expect(await purgeScansBefore(db, days(-90), 2)).toBe(2);
    expect(await purgeScansBefore(db, days(-90), 2)).toBe(1);
    expect(await purgeScansBefore(db, days(-90), 2)).toBe(0);
    expect((await getAnalytics(db, 'abc123', NOW)).total_scans).toBe(3);
  });
});

describe('sponsors', () => {
  test('there is exactly one seeded, active sponsor', async () => {
    const s = await getActiveSponsor(db);
    expect(s).toMatchObject({ id: 'spn-fieldnote', brand_name: 'Fieldnote Paper', active: true });
    expect(db.sqlite.query('SELECT count(*) AS n FROM sponsors').get()).toEqual({ n: 1 });
  });

  test('no active sponsor is null, not an error', async () => {
    db.sqlite.exec('UPDATE sponsors SET active = 0');
    expect(await getActiveSponsor(db)).toBeNull();
  });
});
