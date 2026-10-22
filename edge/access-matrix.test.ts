import { beforeAll, describe, expect, test } from 'bun:test';
import { bearer, go, rig, signUp, withJson, type Rig } from './test/rig';

/**
 * Every route, called by four kinds of caller: nobody, a token that no longer works, a signed-in stranger, and the
 * owner. This is the Go server's TestAccessMatrix, row for row. A new route must be added here, and a test below fails
 * until it is.
 */
type Statuses = [anonymous: number, stale: number, other: number, owner: number];
type Kind = 'link' | 'menu' | 'page';

interface Row {
  pattern: string;
  /** The URL to call when it differs from the pattern. `{link}` is a fresh link's code. */
  path?: string;
  /** Which fresh code `{code}` stands for. */
  code?: Kind;
  body?: unknown;
  form?: string;
  want?: Statuses;
  /** The status does not depend on the caller, whatever it is. */
  sameForAll?: boolean;
  /** Logging out ends the token it was given, so each call gets a new one. */
  freshTokens?: boolean;
  /** After the stranger's call, the owner's item must still have its original title. */
  untouched?: Kind;
  check?: 'listScopedToCaller' | 'analyticsScopedToCaller' | 'trendsScopedToCaller';
}

const everyone = (status: number): Statuses => [status, status, status, status];
const menuBody = { title: 'Matrix Menu', items: [{ name: 'Soup', price: '6.00' }] };
const pageBody = { title: 'Matrix Page', links: [{ name: 'Shop', url: 'https://example.com' }] };

const matrix: Row[] = [
  { pattern: 'GET /healthz', want: everyone(200) },
  { pattern: 'GET /api/auth/me', want: [401, 401, 200, 200] },
  { pattern: 'POST /api/auth/logout', want: everyone(200), freshTokens: true },
  { pattern: 'GET /api/auth/oauth/providers', want: everyone(200) },
  { pattern: 'GET /api/auth/oauth/google/start', want: everyone(503) },
  { pattern: 'GET /api/auth/oauth/google/callback', want: everyone(503) },
  { pattern: 'GET /api/auth/oauth/github/start', want: everyone(503) },
  { pattern: 'GET /api/auth/oauth/github/callback', want: everyone(503) },
  { pattern: 'GET /api/auth/oauth/dev/start', want: everyone(302) },
  { pattern: 'GET /api/auth/oauth/dev/consent', path: '/api/auth/oauth/dev/consent?state=bogus', want: everyone(302) },
  { pattern: 'POST /api/auth/oauth/dev/consent', path: '/api/auth/oauth/dev/consent?state=bogus', form: 'email=x%40example.com', want: everyone(302) },
  { pattern: 'GET /api/qr', want: everyone(200) },
  { pattern: 'GET /api/qr/style-parser', want: everyone(200) },
  { pattern: 'POST /api/qr/style-parse', body: { prompt: 'navy' }, want: everyone(503) },
  { pattern: 'POST /api/qr/style', body: { prompt: 'print safe' }, want: everyone(200) },
  { pattern: 'POST /api/qr/style-agent', body: { prompt: 'print safe' }, want: everyone(200) },
  { pattern: 'POST /api/qr/context', body: { url: 'http://127.0.0.1:1/' }, want: everyone(400) },
  { pattern: 'GET /api/qr/{code}/settings', code: 'link', want: [401, 401, 404, 200] },
  { pattern: 'PATCH /api/qr/{code}/settings', code: 'link', body: { title: 'changed' }, want: [401, 401, 404, 200], untouched: 'link' },
  { pattern: 'POST /api/links', body: { title: 'new', destination_url: 'example.com/new' }, want: [401, 401, 201, 201] },
  { pattern: 'GET /api/links', want: [401, 401, 200, 200], check: 'listScopedToCaller' },
  { pattern: 'GET /api/links/{code}', code: 'link', want: [401, 401, 404, 200] },
  { pattern: 'PUT /api/links/{code}', code: 'link', body: { title: 'changed' }, want: [401, 401, 404, 200], untouched: 'link' },
  { pattern: 'DELETE /api/links/{code}', code: 'link', want: [401, 401, 404, 200], untouched: 'link' },
  { pattern: 'GET /api/links/{code}/analytics', code: 'link', want: [401, 401, 404, 200] },
  { pattern: 'GET /api/analytics/global', want: [401, 401, 200, 200], check: 'analyticsScopedToCaller' },
  { pattern: 'GET /api/analytics/trends', want: [401, 401, 200, 200], check: 'trendsScopedToCaller' },
  { pattern: 'GET /api/sponsors/active', want: everyone(200) },
  { pattern: 'GET /api/scan-host', sameForAll: true },
  { pattern: 'POST /api/menus', body: menuBody, want: [401, 401, 201, 201] },
  { pattern: 'PUT /api/menus/{code}', code: 'menu', body: menuBody, want: [401, 401, 404, 200], untouched: 'menu' },
  { pattern: 'POST /api/pages', body: pageBody, want: [401, 401, 201, 201] },
  { pattern: 'PUT /api/pages/{code}', code: 'page', body: pageBody, want: [401, 401, 404, 200], untouched: 'page' },
  { pattern: 'GET /qr', path: '/qr?url=https%3A%2F%2Fexample.com%2Fx', want: everyone(200) },
  { pattern: 'GET /qr.png', path: '/qr.png?url=https%3A%2F%2Fexample.com%2Fx', want: everyone(200) },
  { pattern: 'GET /qr.svg', path: '/qr.svg?url=https%3A%2F%2Fexample.com%2Fx', want: everyone(200) },
  { pattern: '/r/', path: '/r/{link}', want: everyone(200) },
  { pattern: '/R/', path: '/R/{link}', want: everyone(200) },
];

/** No sign-in provider is configured, and the local stand-in is on, as it is in the Go matrix stack. */
const stack = (): Rig =>
  rig({ GOOGLE_CLIENT_ID: undefined, GOOGLE_CLIENT_SECRET: undefined, GITHUB_CLIENT_ID: undefined, GITHUB_CLIENT_SECRET: undefined, OAUTH_DEV: '1' });

const r = stack();
let owner = '';
let other = '';

beforeAll(async () => {
  owner = (await signUp(r, 'matrix-owner@example.com')).token;
  other = (await signUp(r, 'matrix-other@example.com')).token;
});

const created = async (path: string, body: unknown): Promise<string> => {
  const res = await go(r, path, withJson('POST', owner, body));
  expect(res.status).toBe(201);
  return ((await res.json()) as { code: string }).code;
};

const call = async (row: Row, links: Record<Kind, string>, token: string): Promise<number> => {
  const space = row.pattern.indexOf(' ');
  const method = space > 0 ? row.pattern.slice(0, space) : 'GET';
  let path = row.path ?? (space > 0 ? row.pattern.slice(space + 1) : row.pattern);
  path = path.replace('{code}', links[row.code ?? 'link']).replace('{link}', links.link);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: string | undefined;
  if (row.form !== undefined) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = row.form;
  } else if (row.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(row.body);
  }
  const res = await go(r, path, { method, headers, body });
  await res.arrayBuffer();
  return res.status;
};

async function titleOf(code: string, settings: boolean): Promise<string> {
  const res = await go(r, settings ? `/api/qr/${code}/settings` : `/api/links/${code}`, bearer(owner));
  expect(res.status).toBe(200);
  const payload = (await res.json()) as { title?: string; settings?: { title: string } };
  return payload.settings?.title ?? payload.title ?? '';
}

describe('access matrix', () => {
  for (const row of matrix) {
    test(row.pattern, async () => {
      const links: Record<Kind, string> = {
        link: await created('/api/links', { title: 'matrix link original', destination_url: 'https://example.com/matrix' }),
        menu: await created('/api/menus', { title: 'matrix menu original', items: [{ name: 'Soup', price: '6.00' }] }),
        page: await created('/api/pages', { title: 'matrix page original', links: [{ name: 'Shop', url: 'https://example.com' }] }),
      };
      if (row.pattern.endsWith('/analytics')) {
        await go(r, `/r/${links.link}?direct=1`);
        await r.settle();
      }

      const statuses: number[] = [];
      for (const [index, caller] of (['anonymous', 'stale', 'other', 'owner'] as const).entries()) {
        let token = '';
        if (caller === 'stale') token = 'stale-token-value';
        else if (caller === 'other') token = other;
        else if (caller === 'owner') token = owner;
        if (row.freshTokens && (caller === 'other' || caller === 'owner')) token = (await signUp(r, `matrix-fresh-${caller}-${row.pattern.replace(/[ /]/g, '-')}@example.com`)).token;

        const got = await call(row, links, token);
        statuses.push(got);
        if (!row.sameForAll) expect(`${row.pattern} as ${caller}: ${got}`).toBe(`${row.pattern} as ${caller}: ${row.want?.[index]}`);

        if (caller === 'other' && row.untouched) {
          const settings = row.pattern.includes('/settings');
          expect(await titleOf(links[row.untouched], settings)).toBe(`matrix ${row.untouched} original`);
        }
      }
      if (row.sameForAll) expect(new Set(statuses).size).toBe(1);

      if (row.check === 'listScopedToCaller') {
        const codes = async (token: string) => ((await (await go(r, '/api/links', bearer(token))).json()) as { links: { code: string }[] }).links.map((l) => l.code);
        expect(await codes(other)).not.toContain(links.link);
        expect(await codes(owner)).toContain(links.link);
      }
      if (row.check === 'analyticsScopedToCaller') {
        await go(r, `/r/${links.link}?direct=1`);
        await r.settle();
        const total = async (token: string) => ((await (await go(r, '/api/analytics/global', bearer(token))).json()) as { total_scans: number }).total_scans;
        expect(await total(other)).toBe(0);
        expect(await total(owner)).toBeGreaterThanOrEqual(1);
      }
      if (row.check === 'trendsScopedToCaller') {
        await go(r, `/r/${links.link}?direct=1`);
        await r.settle();
        const codes = async (token: string) => ((await (await go(r, '/api/analytics/trends', bearer(token))).json()) as { links: { code: string }[] }).links.map((l) => l.code);
        expect(await codes(other)).toEqual([]);
        expect(await codes(owner)).toContain(links.link);
      }
    });
  }
});

describe('the registry', () => {
  test('has a matrix row for every route, and no row for a route that is gone', () => {
    const registered = stack().app.routes().map((route) => route.pattern);
    const rows = matrix.map((row) => row.pattern);
    expect(registered.filter((pattern) => !rows.includes(pattern))).toEqual([]);
    expect(rows.filter((pattern) => !registered.includes(pattern))).toEqual([]);
  });

  test('declares an auth mode and a class for every route, a scope for every signed-in one, and a 64 KiB cap on owned writes', () => {
    for (const route of stack().app.routes()) {
      expect(route.policy.auth, route.pattern).toBeTruthy();
      expect(route.policy.class, route.pattern).toBeTruthy();
      if (route.policy.auth === 'any' && route.pattern !== 'GET /api/auth/me') expect(route.policy.scope, route.pattern).toBeTruthy();
      const owned = /^\/api\/(links|menus|pages)/.test(route.path) || route.path === '/api/qr/{code}/settings';
      if (owned && ['POST', 'PUT', 'PATCH'].includes(route.method)) expect(route.policy.maxBody, route.pattern).toBe(64 << 10);
    }
  });
});

describe('the cases beside the matrix', () => {
  test('analytics for a code that does not exist are a 404', async () => {
    const res = await go(r, '/api/links/does-not-exist-xyz/analytics', bearer(owner));
    expect(res.status).toBe(404);
  });

  test('a write body over 64 KiB is a 413', async () => {
    const res = await go(r, '/api/links', { method: 'POST', headers: { Authorization: `Bearer ${owner}`, 'Content-Type': 'application/json' }, body: `{"title":"${'a'.repeat((64 << 10) + 1)}"}` });
    expect(res.status).toBe(413);
  });
});
