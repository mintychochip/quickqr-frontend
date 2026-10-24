import { describe, expect, spyOn, test } from 'bun:test';
import { DOMAIN_INVALID, DOMAIN_MISSING, DOMAIN_OWN, DOMAIN_TAKEN, enforceSiteCaps, forwardsToSite, normalizeDomain, siteContentType, siteForwardTarget, sitePath, SITE_CSP, SITE_FILE_CAP, SITE_FILES_MAX } from './sites';
import { StoreError } from './store/errors';
import { clearSiteDomain, createMenu, createSite, createLink, getLink, markSiteDomainVerified, setSiteDomain, updateSite } from './store/links';
import { testBucket, type TestBucket } from './test/bucket';
import { proxy as proxySites, targetFor } from '../sites-worker/src/index';
import { bearer, go, grantPlan, ORIGIN, rig, signUp, withJson, type Rig } from './test/rig';
import type { Link } from './types';

const SITES_PRO_ONLY = 'Sites are a Pro feature.';
const SITE_NOT_FOUND = 'Site not found';

interface Person {
  id: string;
  token: string;
}

async function pair(): Promise<{ r: Rig; ada: Person; bob: Person }> {
  const r = rig();
  return { r, ada: await signUp(r, 'ada@example.com'), bob: await signUp(r, 'bob@example.com') };
}

async function proPair(): Promise<{ r: Rig; ada: Person; bob: Person }> {
  const people = await pair();
  grantPlan(people.r, people.ada.id, 'pro');
  return people;
}

const create = (r: Rig, token: string, title = 'Cafe site'): Promise<Response> =>
  go(r, '/api/sites', withJson('POST', token, { title }));

const upload = (r: Rig, token: string, code: string, path: string, body: string | Uint8Array, contentType = 'text/html'): Promise<Response> =>
  go(r, `/api/sites/${code}/files?path=${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
    body,
  });

const scans = (r: Rig): number => (r.db.sqlite.query('SELECT count(*) AS n FROM scans').get() as { n: number }).n;

async function errorOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'no error';
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'no error';
  } catch (err) {
    return err instanceof StoreError ? err.code : String(err);
  }
}

describe('the sites host Worker', () => {
  test('proxies only /s/ to the matching Pages host and passes the client address', async () => {
    const seen: Request[] = [];
    const response = await proxySites(
      new Request('https://sites.quickqr.app/abcxyz/?x=1', { headers: { 'CF-Connecting-IP': '8.8.8.8', 'X-Quickqr-Proxy-Key': 'spoof' } }),
      'secret',
      async (request) => {
        seen.push(request);
        return new Request(request.url).method === 'GET' ? new Response('ok') : new Response('x');
      },
    );
    expect(await response.text()).toBe('ok');
    const forwarded = seen[0] as Request;
    expect(forwarded.url).toBe('https://quickqr-ewm.pages.dev/s/abcxyz/?x=1');
    expect(forwarded.headers.get('X-Quickqr-Proxy-Key')).toBe('secret');
    expect(forwarded.headers.get('X-Quickqr-Client-IP')).toBe('8.8.8.8');
    expect(targetFor('staging.sites.quickqr.app')).toBe('quickqr-staging.pages.dev');

    const legacy = await proxySites(new Request('https://sites.quickqr.app/s/abcxyz/docs?x=1'), 'secret', async () => new Response('x'));
    expect([legacy.status, legacy.headers.get('Location')]).toEqual([301, '/abcxyz/docs?x=1']);
    const bare = await proxySites(new Request('https://sites.quickqr.app/abcxyz'), 'secret', async () => new Response('x'));
    expect([bare.status, bare.headers.get('Location')]).toEqual([301, '/abcxyz/']);
    for (const path of ['/', '/favicon.ico', '/not-a-code']) {
      expect((await proxySites(new Request(`https://sites.quickqr.app${path}`), 'secret', async () => new Response('x'))).status).toBe(404);
    }
    expect((await proxySites(new Request('https://other.example/abcxyz/'), 'secret', async () => new Response('x'))).status).toBe(404);

    const rewritten = await proxySites(
      new Request('https://sites.quickqr.app/abcxyz/docs'),
      'secret',
      async () => new Response(null, { status: 301, headers: { Location: '/s/abcxyz/docs/' } }),
    );
    expect([rewritten.status, rewritten.headers.get('Location')]).toEqual([301, '/abcxyz/docs/']);
  });
});

describe('site paths and types', () => {
  test('the empty path is the index, a trailing slash is a directory index, and backslashes are separators', () => {
    expect(sitePath('')).toBe('index.html');
    expect(sitePath('/')).toBe('index.html');
    expect(sitePath('/index.html')).toBe('index.html');
    expect(sitePath('css/site.css')).toBe('css/site.css');
    expect(sitePath('docs/')).toBe('docs/index.html');
    expect(sitePath('\\docs\\index.html')).toBe('docs/index.html');
    expect(sitePath('.well-known/security.txt')).toBe('.well-known/security.txt');
  });

  test('refuses segments that leave the root, empty segments, control characters, and long paths', () => {
    for (const bad of ['..', '../x', 'a/../b', 'a//b', './x', 'a/./b', 'a/\u0000b', 'a/\u007fb', 'a?b.css', 'a#b', 'a'.repeat(201), `${'a'.repeat(101)}/b`]) {
      expect({ path: bad, result: sitePath(bad) }).toEqual({ path: bad, result: null });
    }
  });

  test('decides the type by extension, and an unknown extension is a download', () => {
    expect(siteContentType('index.html')).toBe('text/html; charset=utf-8');
    expect(siteContentType('a/b.css')).toBe('text/css; charset=utf-8');
    expect(siteContentType('app.js')).toBe('text/javascript; charset=utf-8');
    expect(siteContentType('logo.PNG')).toBe('image/png');
    expect(siteContentType('font.woff2')).toBe('font/woff2');
    expect(siteContentType('archive.zip')).toBe('application/octet-stream');
    expect(siteContentType('.env')).toBe('application/octet-stream');
  });
});

describe('site cap checks', () => {
  test('one file may not pass 1 MiB', async () => {
    const bucket = testBucket();
    expect(await errorOf(enforceSiteCaps(bucket, 'abc123', 'big.bin', SITE_FILE_CAP + 1))).toBe('A file may be at most 1 MiB');
  });

  test('a site may not pass 64 files', async () => {
    const bucket = testBucket();
    for (let i = 0; i < SITE_FILES_MAX; i++) await bucket.put(`sites/abc123/f${i}.txt`, 'x');
    expect(await errorOf(enforceSiteCaps(bucket, 'abc123', 'new.txt', 1))).toBe('A site may hold at most 64 files');
  });

  test('a site may not pass 10 MiB, and replacing a file counts only its new size', async () => {
    const bucket = testBucket();
    for (let i = 0; i < 10; i++) await bucket.put(`sites/abc123/big${i}.bin`, new Uint8Array(SITE_FILE_CAP));
    expect(await errorOf(enforceSiteCaps(bucket, 'abc123', 'one.bin', 1))).toBe('A site may hold at most 10 MiB');
    // Replacing an existing 1 MiB file with another 1 MiB file still fits.
    await enforceSiteCaps(bucket, 'abc123', 'big0.bin', SITE_FILE_CAP);
  });
});

describe('site rows', () => {
  test('a site is a link of kind site at /<code>/ with a title', async () => {
    const r = rig();
    const site = await createSite(r.db, 'usr-a', '  My site ', r.now());
    const { id, code } = site;
    expect(id).toMatch(/^site-[2-9a-hjkmnp-z]{8}$/);
    expect(code).toMatch(/^[2-9a-hjkmnp-z]{6}$/);
    expect(site).toMatchObject({
      title: 'My site',
      destination_url: `/${code}/`,
      ad_style: 'site',
      kind: 'site',
      total_scans: 0,
      is_active: true,
    });
  });

  test('needs an owner and a title', async () => {
    const r = rig();
    expect(await codeOf(createSite(r.db, '', 'T'))).toBe('owner_required');
    expect(await codeOf(createSite(r.db, 'u', '   '))).toBe('invalid_site');
  });

  test('renames only a site, and trims', async () => {
    const r = rig();
    const site = await createSite(r.db, 'u', 'Lunch', r.now());
    const renamed = await updateSite(r.db, site.code, '  Dinner  ', r.now());
    expect(renamed.title).toBe('Dinner');
    const link = await createLink(r.db, { code: 'plain1', title: 'Plain', destinationUrl: 'https://example.com', adStyle: 'direct', ownerId: 'u' });
    expect(await codeOf(updateSite(r.db, link.code, 'Nope'))).toBe('not_found');
    const menu = await createMenu(r.db, 'u', 'Menu', [{ name: 'Soup', price: '6' }]);
    expect(await codeOf(updateSite(r.db, menu.code, 'Nope'))).toBe('not_found');
    expect(await codeOf(updateSite(r.db, site.code, '  '))).toBe('invalid_site');
  });
});

describe('sites API', () => {
  test('needs a session', async () => {
    const r = rig();
    expect((await go(r, '/api/sites', { method: 'POST', body: '{}' })).status).toBe(401);
    expect((await go(r, '/api/sites', { method: 'POST', ...bearer('stale'), body: '{}' })).status).toBe(401);
    expect((await go(r, '/api/sites/abc123', bearer('stale'))).status).toBe(401);
  });

  test('needs Pro: Free and Plus are refused before the body is read', async () => {
    const { r, ada } = await pair();
    expect([(await create(r, ada.token)).status, (await create(r, ada.token)).status]).toEqual([403, 403]);
    expect(await (await create(r, ada.token)).json()).toEqual({ error: SITES_PRO_ONLY });
    grantPlan(r, ada.id, 'plus');
    const plus = await go(r, '/api/sites', { method: 'POST', headers: { Authorization: `Bearer ${ada.token}` }, body: '{' });
    expect([plus.status, await plus.json()]).toEqual([403, { error: SITES_PRO_ONLY }]);
    expect(r.db.sqlite.query('SELECT count(*) AS n FROM links').get()).toEqual({ n: 0 });
  });

  test('a Pro owner creates and renames a site, and a Free owner cannot rename it later', async () => {
    const { r, ada } = await proPair();
    const made = await create(r, ada.token);
    expect(made.status).toBe(201);
    const site = (await made.json()) as Link;
    expect(site).toMatchObject({ kind: 'site', ad_style: 'site', title: 'Cafe site', destination_url: `/${site.code}/` });
    const renamed = await go(r, `/api/sites/${site.code}`, withJson('PUT', ada.token, { title: '  New name ' }));
    const renamedBody = (await renamed.json()) as Link;
    expect([renamed.status, renamedBody.title]).toEqual([200, 'New name']);

    r.db.sqlite.query('DELETE FROM entitlements WHERE user_id = ?').run(ada.id);
    const refused = await go(r, `/api/sites/${site.code}`, withJson('PUT', ada.token, { title: 'Free again' }));
    expect([refused.status, await refused.json()]).toEqual([403, { error: SITES_PRO_ONLY }]);
  });

  test('a stranger gets 404 before their body is read, and another kind is not a site', async () => {
    const { r, ada, bob } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    const stranger = await go(r, `/api/sites/${site.code}`, { method: 'PUT', headers: { Authorization: `Bearer ${bob.token}` }, body: '{' });
    expect([stranger.status, await stranger.json()]).toEqual([404, { error: SITE_NOT_FOUND }]);
    const menu = (await (await go(r, '/api/menus', withJson('POST', ada.token, { title: 'Lunch', items: [{ name: 'Soup', price: '6' }] }))).json()) as Link;
    const wrongKind = await go(r, `/api/sites/${menu.code}`, withJson('PUT', ada.token, { title: 'Nope' }));
    expect([wrongKind.status, await wrongKind.json()]).toEqual([404, { error: SITE_NOT_FOUND }]);
  });

  test('uploads, lists, downloads, replaces, and deletes files', async () => {
    const { r, ada } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    const first = await upload(r, ada.token, site.code, 'index.html', '<h1>Cafe</h1>');
    expect([first.status, await first.json()]).toEqual([200, { path: 'index.html', size: 13, content_type: 'text/html; charset=utf-8' }]);
    await upload(r, ada.token, site.code, 'css/site.css', 'h1{color:#123}', 'text/css');

    const read = (await (await go(r, `/api/sites/${site.code}`, bearer(ada.token))).json()) as { site: Link; files: { path: string; size: number; content_type: string }[] };
    expect(read.site.code).toBe(site.code);
    expect(read.files.map((file) => [file.path, file.content_type])).toEqual([
      ['css/site.css', 'text/css; charset=utf-8'],
      ['index.html', 'text/html; charset=utf-8'],
    ]);

    const file = await go(r, `/api/sites/${site.code}/files?path=index.html`, bearer(ada.token));
    expect([file.status, file.headers.get('Content-Type'), await file.text()]).toEqual([200, 'text/html; charset=utf-8', '<h1>Cafe</h1>']);

    const replaced = await upload(r, ada.token, site.code, 'index.html', '<h1>Dinner</h1>');
    const replacedBody = (await replaced.json()) as { size: number };
    expect([replaced.status, replacedBody.size]).toEqual([200, 15]);

    const removed = await go(r, `/api/sites/${site.code}/files?path=index.html`, { method: 'DELETE', headers: { Authorization: `Bearer ${ada.token}` } });
    expect(removed.status).toBe(204);
    expect((await go(r, `/api/sites/${site.code}/files?path=index.html`, bearer(ada.token))).status).toBe(404);
    expect((await go(r, `/api/sites/${site.code}/files?path=index.html`, { method: 'DELETE', headers: { Authorization: `Bearer ${ada.token}` } })).status).toBe(404);
  });

  test('refuses an unsafe path and a body over 1 MiB, and ignores the upload content type', async () => {
    const { r, ada } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    const bad = await upload(r, ada.token, site.code, '../index.html', 'x');
    expect([bad.status, await bad.json()]).toEqual([400, { error: 'That path is not a safe site path' }]);
    const big = await upload(r, ada.token, site.code, 'big.bin', new Uint8Array(SITE_FILE_CAP + 1));
    expect([big.status, await big.json()]).toEqual([413, { error: 'A file may be at most 1 MiB' }]);
    const disguised = await upload(r, ada.token, site.code, 'payload.bin', '<h1>no</h1>', 'text/html');
    const disguisedBody = (await disguised.json()) as { content_type: string };
    expect(disguisedBody.content_type).toBe('application/octet-stream');
  });

  test('a server without a bucket creates nothing and uploads nothing', async () => {
    const r = rig({ SITES: undefined });
    const ada = await signUp(r, 'ada@example.com');
    grantPlan(r, ada.id, 'pro');
    const made = await create(r, ada.token);
    expect([made.status, await made.json()]).toEqual([503, { error: 'Sites are not available on this server.' }]);
    expect(r.db.sqlite.query('SELECT count(*) AS n FROM links').get()).toEqual({ n: 0 });
  });

  test('an upload by a Free owner is refused even when the path is bad', async () => {
    const { r, ada } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    r.db.sqlite.query('DELETE FROM entitlements WHERE user_id = ?').run(ada.id);
    const res = await upload(r, ada.token, site.code, '../x', 'x');
    expect([res.status, await res.json()]).toEqual([403, { error: SITES_PRO_ONLY }]);
  });
});


describe('customer domains', () => {
  test('normalize to a bare hostname, and refuse local, IP, malformed, and quickqr names', () => {
    expect(normalizeDomain('Cafe.Example.COM')).toEqual({ domain: 'cafe.example.com' });
    expect(normalizeDomain('  https://Cafe.Example.com/  ')).toEqual({ domain: 'cafe.example.com' });
    expect(normalizeDomain('cafe.example.com.')).toEqual({ domain: 'cafe.example.com' });
    for (const raw of ['', '   ', 'localhost', 'cafe.local', 'cafe.internal', '10.0.0.1', '127.0.0.1', 'cafe', '*.cafe.com', 'a..b.com', '-a.com', 'cafe_example.com', 'cafe.example.com:8080', 'https://user@cafe.example.com/', 'https://cafe.example.com/menu', 'https://cafe.example.com/?x=1']) {
      expect({ raw, result: normalizeDomain(raw) }).toEqual({ raw, result: { error: DOMAIN_INVALID } });
    }
    for (const raw of ['quickqr.app', 'sites.quickqr.app', 'https://staging.sites.quickqr.app/']) {
      expect({ raw, result: normalizeDomain(raw) }).toEqual({ raw, result: { error: DOMAIN_OWN } });
    }
  });

  test('a redirect matches the site on its origin, and its paths', () => {
    const target = 'https://sites.quickqr.app/s/abc123/';
    expect(forwardsToSite('https://sites.quickqr.app/s/abc123/', target)).toBe(true);
    expect(forwardsToSite('https://sites.quickqr.app/s/abc123', target)).toBe(true);
    expect(forwardsToSite('https://sites.quickqr.app/s/abc123/about?x=1', target)).toBe(true);
    expect(forwardsToSite('https://quickqr.app/s/abc123/', target)).toBe(false);
    expect(forwardsToSite('https://sites.quickqr.app/s/other/', target)).toBe(false);
    expect(forwardsToSite('https://sites.quickqr.app/s/abc1234/', target)).toBe(false);
    expect(forwardsToSite('nonsense', target)).toBe(false);
  });

  test('the target is the configured sites origin, or this request origin when none is set', () => {
    const env = rig().env;
    const url = new URL(`${ORIGIN}/api/sites/abc123`);
    expect(siteForwardTarget(env, url, 'abc123')).toBe(`${ORIGIN}/s/abc123/`);
    env.SITES_PUBLIC_URL = 'https://sites.quickqr.app/';
    expect(siteForwardTarget(env, url, 'abc123')).toBe('https://sites.quickqr.app/abc123/');
  });

  test('one domain belongs to one site, and changing it clears the check', async () => {
    const r = rig();
    const first = await createSite(r.db, 'u', 'First', r.now());
    const second = await createSite(r.db, 'u', 'Second', r.now());
    const set = await setSiteDomain(r.db, first.code, 'cafe.example.com', r.now());
    expect(set).toMatchObject({ domain: 'cafe.example.com' });
    expect(set.domain_verified_at).toBeUndefined();
    await markSiteDomainVerified(r.db, first.code, r.now().toISOString(), r.now());
    expect((await getLink(r.db, first.code))?.domain_verified_at).toBe(r.now().toISOString());
    expect(await codeOf(setSiteDomain(r.db, second.code, 'cafe.example.com'))).toBe('domain_taken');
    const changed = await setSiteDomain(r.db, first.code, 'shop.example.com', r.now());
    expect(changed.domain).toBe('shop.example.com');
    expect(changed.domain_verified_at).toBeUndefined();
    expect((await clearSiteDomain(r.db, first.code, r.now())).domain).toBeUndefined();
    const plain = await createLink(r.db, { code: 'plain2', title: 'Plain', destinationUrl: 'https://example.com', adStyle: 'direct', ownerId: 'u' });
    expect(await codeOf(setSiteDomain(r.db, plain.code, 'shop.example.com'))).toBe('not_found');
  });
});

describe('site domain API', () => {
  const domainOf = (r: Rig, token: string, code: string): Promise<Response> => go(r, `/api/sites/${code}/domain`, bearer(token));
  const setDomain = (r: Rig, token: string, code: string, domain: string): Promise<Response> => go(r, `/api/sites/${code}/domain`, withJson('PUT', token, { domain }));
  const verifyDomain = (r: Rig, token: string, code: string): Promise<Response> => go(r, `/api/sites/${code}/domain/verify`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });

  test('needs a session, the owner, and Pro for writes', async () => {
    const { r, ada, bob } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    for (const res of [
      await go(r, `/api/sites/${site.code}/domain`),
      await go(r, `/api/sites/${site.code}/domain`, { method: 'PUT', body: '{}' }),
      await go(r, `/api/sites/${site.code}/domain/verify`, { method: 'POST' }),
    ]) {
      expect(res.status).toBe(401);
    }
    expect((await domainOf(r, bob.token, site.code)).status).toBe(404);
    expect((await setDomain(r, bob.token, site.code, 'cafe.example.com')).status).toBe(404);
    expect((await verifyDomain(r, bob.token, site.code)).status).toBe(404);
    // Reads are not Pro, writes are.
    r.db.sqlite.query('DELETE FROM entitlements WHERE user_id = ?').run(ada.id);
    expect((await domainOf(r, ada.token, site.code)).status).toBe(200);
    expect([(await setDomain(r, ada.token, site.code, 'cafe.example.com')).status, await (await setDomain(r, ada.token, site.code, 'cafe.example.com')).json()]).toEqual([403, { error: SITES_PRO_ONLY }]);
    expect((await verifyDomain(r, ada.token, site.code)).status).toBe(403);
  });

  test('sets, reads, refuses a taken or unsafe name, and deletes', async () => {
    const { r, ada } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    const other = (await (await create(r, ada.token)).json()) as Link;
    const target = `${ORIGIN}/s/${site.code}/`;

    const set = await setDomain(r, ada.token, site.code, 'Cafe.Example.COM');
    expect([set.status, await set.json()]).toEqual([200, {
      domain: 'cafe.example.com',
      target,
      status: 'pending',
      verified_at: null,
      instructions: expect.stringContaining(`forward https://cafe.example.com/ to ${target}`),
    }]);
    expect((await domainOf(r, ada.token, site.code)).status).toBe(200);
    const listed = (await (await go(r, '/api/links', bearer(ada.token))).json()) as { links: Link[] };
    expect(listed.links.find((link) => link.code === site.code)?.domain).toBe('cafe.example.com');

    const taken = await setDomain(r, ada.token, other.code, 'cafe.example.com');
    expect([taken.status, await taken.json()]).toEqual([409, { error: DOMAIN_TAKEN }]);
    expect(await (await setDomain(r, ada.token, site.code, 'quickqr.app')).json()).toEqual({ error: DOMAIN_OWN });
    expect(await (await setDomain(r, ada.token, site.code, 'nope')).json()).toEqual({ error: DOMAIN_INVALID });

    const removed = await go(r, `/api/sites/${site.code}/domain`, { method: 'DELETE', headers: { Authorization: `Bearer ${ada.token}` } });
    expect(removed.status).toBe(204);
    const view = (await (await domainOf(r, ada.token, site.code)).json()) as { domain: string | null; status: string; target: string; verified_at: string | null; instructions: string | null };
    expect(view).toEqual({ domain: null, target, status: 'unset', verified_at: null, instructions: null });
    expect((await go(r, `/api/sites/${site.code}/domain`, { method: 'DELETE', headers: { Authorization: `Bearer ${ada.token}` } })).status).toBe(204);
  });

  test('verify follows no redirect, records a match, and clears it when the forward breaks', async () => {
    let mode: 'match' | 'wrong' | 'answered' | 'unreachable' = 'match';
    let target = '';
    const r = rig({}, {
      'GET https://cafe.example.com/': () => {
        if (mode === 'unreachable') throw new Error('dns');
        if (mode === 'answered') return new Response('ok');
        const location = mode === 'wrong' ? 'https://sites.quickqr.app/s/other/' : target;
        return new Response(null, { status: 301, headers: { Location: location } });
      },
    });
    const ada = await signUp(r, 'ada@example.com');
    grantPlan(r, ada.id, 'pro');
    const site = (await (await create(r, ada.token)).json()) as Link;
    target = `${ORIGIN}/s/${site.code}/`;

    expect(await (await verifyDomain(r, ada.token, site.code)).json()).toEqual({ error: DOMAIN_MISSING });
    await setDomain(r, ada.token, site.code, 'cafe.example.com');

    const verified = (await (await verifyDomain(r, ada.token, site.code)).json()) as { domain: string; target: string; status: string; verified_at: string; checked_at: string; location: string; message: string };
    expect(verified).toEqual({ domain: 'cafe.example.com', target, status: 'verified', verified_at: r.now().toISOString(), checked_at: r.now().toISOString(), location: target, message: 'The domain forwards to the site.' });
    expect((await (await domainOf(r, ada.token, site.code)).json()) as { status: string; verified_at: string }).toMatchObject({ status: 'verified', verified_at: r.now().toISOString() });

    mode = 'wrong';
    const wrong = (await (await verifyDomain(r, ada.token, site.code)).json()) as { status: string; verified_at: unknown; location: string; message: string };
    expect(wrong.status).toBe('failed');
    expect(wrong.verified_at).toBeNull();
    expect(wrong.location).toBe('https://sites.quickqr.app/s/other/');
    expect(wrong.message).toContain('not');
    expect((await (await domainOf(r, ada.token, site.code)).json()) as { status: string }).toMatchObject({ status: 'pending' });

    mode = 'answered';
    expect((await (await verifyDomain(r, ada.token, site.code)).json()) as { status: string }).toMatchObject({ status: 'failed' });
    mode = 'unreachable';
    const unreachable = (await (await verifyDomain(r, ada.token, site.code)).json()) as { domain: string; target: string; status: string; verified_at: string | null; checked_at: string; location: string | null; message: string };
    expect(unreachable).toEqual({ status: 'failed', domain: 'cafe.example.com', target, verified_at: null, checked_at: r.now().toISOString(), location: null, message: 'Could not reach that domain.' });
  });
});

describe('the public site host', () => {
  test('serves the index, files, directory indexes, and a custom 404 under a sandbox', async () => {
    const { r, ada } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    await upload(r, ada.token, site.code, 'index.html', '<!doctype html><title>Cafe</title><link rel="stylesheet" href="css/site.css"><h1>Cafe</h1>');
    await upload(r, ada.token, site.code, 'css/site.css', 'h1{color:#123}', 'text/css');
    await upload(r, ada.token, site.code, 'docs/index.html', '<p>Docs</p>');
    await upload(r, ada.token, site.code, '404.html', '<p>Gone</p>');

    const bare = await go(r, `/s/${site.code}`);
    expect([bare.status, bare.headers.get('Location')]).toEqual([301, `/s/${site.code}/`]);

    const index = await go(r, `/s/${site.code}/`);
    expect(index.status).toBe(200);
    expect(await index.text()).toContain('<h1>Cafe</h1>');
    expect(index.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(index.headers.get('Content-Security-Policy')).toBe(SITE_CSP);
    expect(index.headers.get('Content-Security-Policy')).not.toContain('allow-same-origin');
    expect(index.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(index.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(index.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(index.headers.get('Cache-Control')).toBe('public, max-age=300');

    const css = await go(r, `/s/${site.code}/css/site.css`);
    expect([css.status, css.headers.get('Content-Type'), await css.text()]).toEqual([200, 'text/css; charset=utf-8', 'h1{color:#123}']);

    const directory = await go(r, `/s/${site.code}/docs`);
    expect([directory.status, directory.headers.get('Location')]).toEqual([301, `/s/${site.code}/docs/`]);
    expect((await go(r, `/s/${site.code}/docs/`)).status).toBe(200);

    const missing = await go(r, `/s/${site.code}/missing`);
    expect([missing.status, await missing.text()]).toEqual([404, '<p>Gone</p>']);
    expect(missing.headers.get('Content-Security-Policy')).toBe(SITE_CSP);
  });

  test('a menu and a link page are served by the same host, and a plain link is not', async () => {
    const { r, ada } = await proPair();
    const menu = (await (await go(r, '/api/menus', withJson('POST', ada.token, { title: 'Lunch', items: [{ name: 'Soup', price: '6' }] }))).json()) as Link;
    const page = (await (await go(r, '/api/pages', withJson('POST', ada.token, { title: 'Me', links: [{ name: 'Site', url: 'https://example.com' }] }))).json()) as Link;
    const plain = (await (await go(r, '/api/links', withJson('POST', ada.token, { destination_url: 'example.com' }))).json()) as Link;

    const menuRes = await go(r, `/s/${menu.code}/`);
    expect([menuRes.status, (await menuRes.text()).includes('data-testid="public-menu-item-name">Soup<')]).toEqual([200, true]);
    expect(menuRes.headers.get('Content-Security-Policy')).toBe(SITE_CSP);
    expect((await go(r, `/s/${menu.code}/anything`)).status).toBe(404);
    expect((await go(r, `/s/${page.code}/`)).status).toBe(200);
    expect((await go(r, `/s/${plain.code}/`)).status).toBe(404);
    expect((await go(r, '/s/doesnotexist/')).status).toBe(404);
  });

  test('refuses traversal in both encoded and plain forms', async () => {
    const { r, ada } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    await upload(r, ada.token, site.code, 'index.html', 'ok');
    for (const path of [`/s/${site.code}/%2e%2e/index.html`, `/s/${site.code}/..%2Findex.html`, `/s/${site.code}/a/..%2F..%2Findex.html`]) {
      expect({ path, status: (await go(r, path)).status }).toEqual({ path, status: 404 });
    }
  });

  test('the sites host is canonical: the app origin redirects there, a scan points there, and local hosts stay put', async () => {
    const { r, ada } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    await upload(r, ada.token, site.code, 'index.html', '<h1>Cafe</h1>');
    r.env.SITES_PUBLIC_URL = 'https://sites.quickqr.app';
    const at = (origin: string, path: string): Promise<Response> =>
      r.app.dispatch(new Request(`${origin}${path}`), r.env, { waitUntil: () => {} });

    const apex = await go(r, `/s/${site.code}/?from=apex`);
    expect([apex.status, apex.headers.get('Location')]).toEqual([301, `https://sites.quickqr.app/${site.code}/?from=apex`]);

    const moved = await go(r, `/r/${site.code}`);
    expect([moved.status, moved.headers.get('Location')]).toEqual([302, `https://sites.quickqr.app/${site.code}/`]);

    const hosted = await at('https://sites.quickqr.app', `/s/${site.code}/`);
    expect([hosted.status, await hosted.text()]).toEqual([200, '<h1>Cafe</h1>']);

    expect((await at('http://localhost:8080', `/s/${site.code}/`)).status).toBe(200);
  });

  test('the sites host Worker key serves the Pages origin and keeps the real client address', async () => {
    const { r, ada } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    await upload(r, ada.token, site.code, 'index.html', 'ok');
    r.env.SITES_PUBLIC_URL = 'https://sites.quickqr.app';
    r.env.SITES_PROXY_KEY = 'proxy-secret';

    const proxied = await go(r, `/s/${site.code}/`, {
      headers: { 'X-Quickqr-Proxy-Key': 'proxy-secret', 'X-Quickqr-Client-IP': '8.8.8.8', 'CF-Connecting-IP': '1.1.1.1' },
    });
    expect(proxied.status).toBe(200);
    await r.settle();
    expect(r.db.sqlite.query('SELECT ip_prefix FROM scans ORDER BY id DESC LIMIT 1').get()).toEqual({ ip_prefix: '8.8.8.0/24' });

    const wrongKey = await go(r, `/s/${site.code}/`, {
      headers: { 'X-Quickqr-Proxy-Key': 'wrong', 'X-Quickqr-Client-IP': '8.8.4.4', 'CF-Connecting-IP': '1.1.1.1' },
    });
    expect(wrongKey.status).toBe(301);
  });

  test('rounds a site scan through /r/ once, and never counts its files', async () => {
    const { r, ada } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    await upload(r, ada.token, site.code, 'index.html', 'ok');
    await upload(r, ada.token, site.code, 'style.css', 'x', 'text/css');

    const moved = await go(r, `/r/${site.code}`);
    expect([moved.status, moved.headers.get('Location')]).toEqual([302, `/s/${site.code}/`]);
    await r.settle();
    expect(scans(r)).toBe(0);

    await go(r, `/s/${site.code}/`);
    await r.settle();
    expect(scans(r)).toBe(1);

    await go(r, `/s/${site.code}/style.css`);
    await go(r, `/s/${site.code}/`);
    await r.settle();
    expect(scans(r)).toBe(2);
  });

  test('a site on a server without a bucket is 503, while a menu still renders', async () => {
    const { r, ada } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    const menu = (await (await go(r, '/api/menus', withJson('POST', ada.token, { title: 'Lunch', items: [{ name: 'Soup', price: '6' }] }))).json()) as Link;
    r.env.SITES = undefined;
    const unavailable = await go(r, `/s/${site.code}/`);
    expect([unavailable.status, (await unavailable.text()).includes('Sites are not available')]).toEqual([503, true]);
    expect(unavailable.headers.get('Content-Security-Policy')).toBe(SITE_CSP);
    expect((await go(r, `/s/${menu.code}/`)).status).toBe(200);
  });
});

describe('deleting a site', () => {
  test('purging the prefix happens before the link row, and failure keeps the site', async () => {
    const { r, ada } = await proPair();
    const site = (await (await create(r, ada.token)).json()) as Link;
    await upload(r, ada.token, site.code, 'index.html', 'ok');
    const bucket = r.env.SITES as TestBucket;
    expect(bucket.keys()).toContain(`sites/${site.code}/index.html`);

    const logged = spyOn(console, 'error').mockImplementation(() => {});
    try {
      r.env.SITES = { ...bucket, delete: async () => { throw new Error('r2 down'); } };
      const failed = await go(r, `/api/links/${site.code}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ada.token}` } });
      expect(failed.status).toBe(500);
      expect((await go(r, `/api/links/${site.code}`, bearer(ada.token))).status).toBe(200);
      expect(bucket.keys()).toContain(`sites/${site.code}/index.html`);
    } finally {
      logged.mockRestore();
    }

    r.env.SITES = bucket;
    const removed = await go(r, `/api/links/${site.code}`, { method: 'DELETE', headers: { Authorization: `Bearer ${ada.token}` } });
    expect(removed.status).toBe(200);
    expect(bucket.keys().filter((key) => key.startsWith(`sites/${site.code}/`))).toEqual([]);
    expect((await go(r, `/s/${site.code}/`)).status).toBe(404);
  });
});
