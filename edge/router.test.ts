import { describe, expect, test } from 'bun:test';
import type { Env } from './env';
import { Router, SIGN_IN_REQUIRED, type Ctx, type Policy, type Principal } from './router';

const exec = { waitUntil() {} };
const env = {} as Env;

const publicNone: Policy = { auth: 'public', class: 'none' };
const optional: Policy = { auth: 'optional', class: 'auth' };
const signedIn: Policy = { auth: 'any', class: 'read' };
const sessionOnly: Policy = { auth: 'session', class: 'read' };
const write: Policy = { auth: 'any', class: 'write', maxBody: 16 };

// A token "good" resolves to user u1; anything else is not a session.
const authenticate = async (_env: Env, token: string): Promise<Principal | null> =>
  token === 'good' ? { userId: 'u1', kind: 'session' } : null;

function build(): Router {
  const r = new Router(authenticate);
  const who = (c: Ctx) => Response.json({ user: c.principal?.userId ?? null });
  r.handle('GET /public', publicNone, who);
  r.handle('GET /optional', optional, who);
  r.handle('GET /private', signedIn, who);
  r.handle('GET /session', sessionOnly, who);
  r.handle('GET /links/{code}', signedIn, (c) => Response.json({ code: c.param('code') }));
  r.handle('GET /links/{code}/analytics', signedIn, (c) => Response.json({ analytics: c.param('code') }));
  r.handle('GET /links/new', publicNone, () => Response.json({ literal: true }));
  r.handle('PUT /links/{code}', write, async (c) => Response.json({ body: await c.json() }));
  r.handle('/r/', publicNone, (c) => Response.json({ rest: c.url.pathname }));
  return r;
}

const call = (r: Router, path: string, init: RequestInit = {}) => r.dispatch(new Request(`https://x.test${path}`, init), env, exec);
const bearer = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

describe('Router access policies', () => {
  test('a public route ignores a token entirely', async () => {
    const res = await call(build(), '/public', bearer('good'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: null });
  });

  test('an optional route sees a valid session and treats a bad token as anonymous, never 401', async () => {
    const ok = await call(build(), '/optional', bearer('good'));
    expect(await ok.json()).toEqual({ user: 'u1' });
    const stale = await call(build(), '/optional', bearer('stale'));
    expect(stale.status).toBe(200);
    expect(await stale.json()).toEqual({ user: null });
  });

  test('a protected route answers 401 with the sign-in message for no token and for a stale one', async () => {
    for (const init of [{}, bearer('stale'), { headers: { Authorization: 'Basic abc' } }]) {
      const res = await call(build(), '/private', init);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: SIGN_IN_REQUIRED });
    }
    expect(SIGN_IN_REQUIRED).toBe('Sign in to continue.');
  });

  test('the Bearer scheme is case-insensitive and the token is trimmed', async () => {
    const res = await call(build(), '/private', { headers: { Authorization: 'bearer   good ' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: 'u1' });
  });

  test('a session-only route accepts a session', async () => {
    const res = await call(build(), '/session', bearer('good'));
    expect(res.status).toBe(200);
  });
});

describe('Router matching', () => {
  test('captures path parameters and decodes them', async () => {
    const res = await call(build(), '/links/a%20b', bearer('good'));
    expect(await res.json()).toEqual({ code: 'a b' });
  });

  test('a literal segment wins over a parameter at the same position', async () => {
    const res = await call(build(), '/links/new');
    expect(await res.json()).toEqual({ literal: true });
  });

  test('deeper patterns do not swallow shorter ones', async () => {
    const res = await call(build(), '/links/abc/analytics', bearer('good'));
    expect(await res.json()).toEqual({ analytics: 'abc' });
  });

  test('segments are percent-decoded before they are compared with a literal', async () => {
    const res = await call(build(), '/links/n%65w');
    expect(await res.json()).toEqual({ literal: true });
  });

  test('a trailing-slash pattern owns its whole subtree', async () => {
    const res = await call(build(), '/r/abc/def');
    expect(await res.json()).toEqual({ rest: '/r/abc/def' });
  });

  test('an unknown path is a plain-text 404 like the Go server', async () => {
    const res = await call(build(), '/nope');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('404 page not found\n');
  });

  test('a known path with the wrong method is 405 with an Allow header', async () => {
    const res = await call(build(), '/links/abc', { method: 'DELETE', ...bearer('good') });
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('GET, PUT');
  });

  test('HEAD runs the GET handler and returns no body', async () => {
    const res = await call(build(), '/public', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
  });

  test('a malformed percent escape is a 400, not a crash', async () => {
    const res = await call(build(), '/links/%zz', bearer('good'));
    expect(res.status).toBe(400);
  });
});

describe('Router request bodies', () => {
  test('a body under the cap is parsed', async () => {
    const res = await call(build(), '/links/a', { method: 'PUT', body: '{"a":1}', ...bearer('good') });
    expect(await res.json()).toEqual({ body: { a: 1 } });
  });

  test('a body over the cap is 413, whether or not Content-Length is honest', async () => {
    const big = JSON.stringify({ pad: 'x'.repeat(64) });
    const res = await call(build(), '/links/a', { method: 'PUT', body: big, ...bearer('good') });
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'Request body too large' });
  });

  test('an empty or malformed body is 400 Invalid request body', async () => {
    for (const body of ['', '{nope']) {
      const res = await call(build(), '/links/a', { method: 'PUT', body, ...bearer('good') });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Invalid request body' });
    }
  });
});

describe('Router registry', () => {
  test('lists every registered route with its policy, in registration order', () => {
    const routes = build().routes();
    expect(routes[0]).toEqual({ method: 'GET', path: '/public', pattern: 'GET /public', policy: publicNone });
    expect(routes.at(-1)).toEqual({ method: '', path: '/r/', pattern: '/r/', policy: publicNone });
    expect(routes).toHaveLength(9);
  });

  test('refuses a route with a policy outside the declared values', () => {
    const r = new Router(authenticate);
    expect(() => r.handle('GET /x', { auth: 'sometimes' as never, class: 'read' }, () => new Response())).toThrow(/unknown Policy.auth/);
    expect(() => r.handle('GET /x', { auth: 'public', class: 'busy' as never }, () => new Response())).toThrow(/unknown Policy.class/);
  });
});

describe('CORS', () => {
  test('answers OPTIONS with 200, an empty body and the reflected origin', async () => {
    const res = await call(build(), '/anything', { method: 'OPTIONS', headers: { Origin: 'https://example.org' } });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.org');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, PATCH, DELETE, OPTIONS');
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization, X-Requested-With');
  });

  test('uses * when there is no Origin and never sends Allow-Credentials', async () => {
    const res = await call(build(), '/public');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.has('Access-Control-Allow-Credentials')).toBe(false);
  });

  test('is present on errors too', async () => {
    const res = await call(build(), '/nope', { headers: { Origin: 'https://example.org' } });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://example.org');
  });
});
