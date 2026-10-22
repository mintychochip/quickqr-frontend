import { describe, expect, test } from 'bun:test';
import { createApp } from './app';
import type { Env } from './env';
import type { Router } from './router';
import { testDb, type TestDb } from './test/sqlite';

const exec = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
const ORIGIN = 'https://staging.quickqr.app';

const configured = {
  OAUTH_REDIRECT_ORIGIN: ORIGIN,
  APP_PUBLIC_URL: ORIGIN,
  GOOGLE_CLIENT_ID: 'gid',
  GOOGLE_CLIENT_SECRET: 'gsecret',
  GITHUB_CLIENT_ID: 'hid',
  GITHUB_CLIENT_SECRET: 'hsecret',
};

type Handler = (req: Request) => Response | Promise<Response>;

/** A stand-in for the network: only the endpoints a sign-in touches, and a loud failure for anything else. */
function network(handlers: Record<string, Handler>): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    const handler = handlers[`${req.method} ${req.url}`];
    if (!handler) throw new Error(`unexpected request: ${req.method} ${req.url}`);
    return handler(req);
  }) as typeof fetch;
}

const googleOk = (userinfo: object): Record<string, Handler> => ({
  'POST https://oauth2.googleapis.com/token': () => Response.json({ access_token: 'tok-g', token_type: 'Bearer' }),
  'GET https://www.googleapis.com/oauth2/v2/userinfo': (req) =>
    req.headers.get('Authorization') === 'Bearer tok-g' ? Response.json(userinfo) : new Response('no', { status: 401 }),
});

const githubOk = (user: object, emails: object): Record<string, Handler> => ({
  'POST https://github.com/login/oauth/access_token': () => Response.json({ access_token: 'tok-h', token_type: 'bearer' }),
  'GET https://api.github.com/user': (req) => (req.headers.get('Authorization') === 'Bearer tok-h' ? Response.json(user) : new Response('no', { status: 401 })),
  'GET https://api.github.com/user/emails': (req) =>
    req.headers.get('Authorization') === 'Bearer tok-h' ? Response.json(emails) : new Response('no', { status: 401 }),
});

interface Rig {
  db: TestDb;
  env: Env;
  app: Router;
}

function rig(over: Partial<Env> = {}, handlers: Record<string, Handler> = {}): Rig {
  const db = testDb();
  return { db, env: { DB: db, ...configured, ...over }, app: createApp({ fetch: network(handlers) }) };
}

const go = (r: Rig, path: string, init: RequestInit = {}) => r.app.dispatch(new Request(`${ORIGIN}${path}`, { redirect: 'manual', ...init }), r.env, exec);
const location = (res: Response) => new URL(res.headers.get('Location') ?? 'x:', ORIGIN);
const bearer = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

/** Starts a sign-in and returns the state the provider would send back. */
async function start(r: Rig, provider: 'google' | 'github', returnTo = `${ORIGIN}/dashboard`): Promise<string> {
  const res = await go(r, `/api/auth/oauth/${provider}/start?return_to=${encodeURIComponent(returnTo)}`);
  expect(res.status).toBe(302);
  return location(res).searchParams.get('state') ?? '';
}

describe('providers', () => {
  test('lists what is configured, and the stand-in is off for a public origin', async () => {
    const res = await go(rig(), '/api/auth/oauth/providers');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ providers: { google: true, github: true, dev: false } });
  });

  test('a provider is on only when both its id and its secret are set', async () => {
    const r = rig({ GOOGLE_CLIENT_SECRET: undefined, GITHUB_CLIENT_ID: undefined });
    expect(await (await go(r, '/api/auth/oauth/providers')).json()).toEqual({ providers: { google: false, github: false, dev: false } });
  });
});

describe('the local sign-in stand-in is fail-closed', () => {
  const dev = async (over: Partial<Env>) => ((await (await go(rig(over), '/api/auth/oauth/providers')).json()) as { providers: { dev: boolean } }).providers.dev;

  test('off with no origins named, with a public origin, and with a mix of loopback and public', async () => {
    expect(await dev({ OAUTH_REDIRECT_ORIGIN: undefined, APP_PUBLIC_URL: undefined })).toBe(false);
    expect(await dev({})).toBe(false);
    expect(await dev({ OAUTH_REDIRECT_ORIGIN: 'http://localhost:5186', APP_PUBLIC_URL: ORIGIN })).toBe(false);
  });

  test('on when every named origin is loopback, or when explicitly forced on', async () => {
    expect(await dev({ OAUTH_REDIRECT_ORIGIN: 'http://localhost:5186', APP_PUBLIC_URL: undefined })).toBe(true);
    expect(await dev({ OAUTH_REDIRECT_ORIGIN: 'http://127.0.0.1:8080', APP_PUBLIC_URL: 'http://localhost:5186' })).toBe(true);
    expect(await dev({ OAUTH_DEV: '1' })).toBe(true);
    expect(await dev({ OAUTH_DEV: 'true' })).toBe(true);
  });

  test('0, false and off force it off even for loopback origins', async () => {
    const loopbackOnly = { OAUTH_REDIRECT_ORIGIN: 'http://localhost:5186', APP_PUBLIC_URL: undefined };
    expect(await dev(loopbackOnly)).toBe(true); // without the switch, this is the case that turns it on
    for (const value of ['0', 'false', 'off']) {
      expect(await dev({ ...loopbackOnly, OAUTH_DEV: value })).toBe(false);
    }
  });

  test('every dev route answers 404 while it is off', async () => {
    const r = rig();
    for (const [method, path] of [
      ['GET', '/api/auth/oauth/dev/start'],
      ['GET', '/api/auth/oauth/dev/consent?state=x'],
      ['POST', '/api/auth/oauth/dev/consent?state=x'],
    ]) {
      const res = await go(r, path, { method, body: method === 'POST' ? 'email=a%40b.co' : undefined, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Local sign-in is not enabled.' });
    }
  });
});

describe('starting Google sign-in', () => {
  test('refuses when it is not configured', async () => {
    const res = await go(rig({ GOOGLE_CLIENT_ID: undefined }), '/api/auth/oauth/google/start');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Google sign-in is not configured on this server.' });
  });

  test('redirects to Google with the registered callback, the scopes, and a fresh state', async () => {
    const res = await go(rig(), '/api/auth/oauth/google/start');
    expect(res.status).toBe(302);
    const to = location(res);
    expect(`${to.origin}${to.pathname}`).toBe('https://accounts.google.com/o/oauth2/auth');
    expect(to.searchParams.get('client_id')).toBe('gid');
    expect(to.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/api/auth/oauth/google/callback`);
    expect(to.searchParams.get('scope')).toBe('openid email profile');
    expect(to.searchParams.get('response_type')).toBe('code');
    expect(to.searchParams.get('access_type')).toBe('online');
    expect(to.searchParams.get('state')).toMatch(/^[2-9a-hjkmnp-z]{24}$/);
  });

  test('never reuses a state', async () => {
    const r = rig();
    expect(await start(r, 'google')).not.toBe(await start(r, 'google'));
  });
});

describe('return_to is limited to the app, by exact origin', () => {
  const landing = async (returnTo: string | null) => {
    const r = rig({}, googleOk({ id: 'g1', email: 'ada@example.com', verified_email: true }));
    const query = returnTo === null ? '' : `?return_to=${encodeURIComponent(returnTo)}`;
    const state = location(await go(r, `/api/auth/oauth/google/start${query}`)).searchParams.get('state');
    const res = await go(r, `/api/auth/oauth/google/callback?state=${state}&code=c`);
    return location(res);
  };

  test('the app origin is honoured, path and query intact', async () => {
    const to = await landing(`${ORIGIN}/dashboard?tab=links`);
    expect(`${to.origin}${to.pathname}`).toBe(`${ORIGIN}/dashboard`);
    expect(to.searchParams.get('tab')).toBe('links');
    expect(to.searchParams.get('auth_token')).toMatch(/^[2-9a-hjkmnp-z]{40}$/);
  });

  test('anything else lands on the app home, never on the requested address', async () => {
    for (const bad of [
      `${ORIGIN}.evil.example/steal`, // starts with the allowed origin but is another host
      `${ORIGIN}@evil.example/steal`, // the allowed origin is only userinfo
      'https://evil.example/',
      'javascript:alert(1)',
      '//evil.example/',
      'not a url',
      'http://localhost:5186/', // a loopback origin is not allowed on a public deployment
    ]) {
      const to = await landing(bad);
      expect(to.origin).toBe(ORIGIN);
      expect(to.pathname).toBe('/');
    }
    expect((await landing(null)).origin).toBe(ORIGIN);
    expect((await landing('')).origin).toBe(ORIGIN);
  });
});

describe('Google callback', () => {
  const verified = { id: 'g-1', email: 'Ada@Example.com', verified_email: true };

  test('is plain-text 503 when Google is not configured', async () => {
    const res = await go(rig({ GOOGLE_CLIENT_ID: undefined }), '/api/auth/oauth/google/callback');
    expect(res.status).toBe(503);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    expect(await res.text()).toBe('OAuth not configured\n');
  });

  test('a provider error is passed to the app, not swallowed', async () => {
    const to = location(await go(rig(), '/api/auth/oauth/google/callback?error=access_denied'));
    expect(to.origin).toBe(ORIGIN);
    expect(to.searchParams.get('auth_error')).toBe('access_denied');
  });

  test('an unknown, missing, or used-up state is refused', async () => {
    const r = rig({}, googleOk(verified));
    for (const path of ['/api/auth/oauth/google/callback?code=c', '/api/auth/oauth/google/callback?state=nope&code=c']) {
      expect(location(await go(r, path)).searchParams.get('auth_error')).toBe('invalid oauth state');
    }
    const state = await start(r, 'google');
    expect(location(await go(r, `/api/auth/oauth/google/callback?state=${state}&code=c`)).searchParams.get('auth_token')).not.toBeNull();
    expect(location(await go(r, `/api/auth/oauth/google/callback?state=${state}&code=c`)).searchParams.get('auth_error')).toBe('invalid oauth state');
  });

  test('a state made for another provider is refused', async () => {
    const r = rig({}, googleOk(verified));
    const state = await start(r, 'github');
    expect(location(await go(r, `/api/auth/oauth/google/callback?state=${state}&code=c`)).searchParams.get('auth_error')).toBe('invalid oauth state');
  });

  test('a missing code is refused', async () => {
    const r = rig({}, googleOk(verified));
    const state = await start(r, 'google');
    expect(location(await go(r, `/api/auth/oauth/google/callback?state=${state}`)).searchParams.get('auth_error')).toBe('missing authorization code');
  });

  test('a failed token exchange is reported', async () => {
    const r = rig({}, { 'POST https://oauth2.googleapis.com/token': () => Response.json({ error: 'invalid_grant' }, { status: 400 }) });
    const state = await start(r, 'google');
    expect(location(await go(r, `/api/auth/oauth/google/callback?state=${state}&code=c`)).searchParams.get('auth_error')).toBe('token exchange failed');
  });

  test('sends the code, secret, and registered redirect_uri to Google', async () => {
    let body = new URLSearchParams();
    const r = rig({}, {
      ...googleOk(verified),
      'POST https://oauth2.googleapis.com/token': async (req) => {
        body = new URLSearchParams(await req.text());
        return Response.json({ access_token: 'tok-g' });
      },
    });
    const state = await start(r, 'google');
    await go(r, `/api/auth/oauth/google/callback?state=${state}&code=the-code`);
    expect(Object.fromEntries(body)).toEqual({
      client_id: 'gid',
      client_secret: 'gsecret',
      code: 'the-code',
      grant_type: 'authorization_code',
      redirect_uri: `${ORIGIN}/api/auth/oauth/google/callback`,
    });
  });

  test('an unverified Google email is refused, because sign-in links to an existing account by email', async () => {
    const r = rig({}, googleOk({ id: 'g-2', email: 'victim@example.com', verified_email: false }));
    const state = await start(r, 'google');
    const to = location(await go(r, `/api/auth/oauth/google/callback?state=${state}&code=c`));
    expect(to.searchParams.get('auth_error')).toBe("That account's email address is not verified.");
    expect(to.searchParams.get('auth_token')).toBeNull();
    expect(r.db.sqlite.query('SELECT count(*) AS n FROM users').get()).toEqual({ n: 0 });
  });

  test('a profile without an id or email is refused', async () => {
    const r = rig({}, googleOk({ id: '', email: '', verified_email: true }));
    const state = await start(r, 'google');
    expect(location(await go(r, `/api/auth/oauth/google/callback?state=${state}&code=c`)).searchParams.get('auth_error')).toBe('could not load profile');
  });

  test('a verified sign-in redirects to return_to with a token that works', async () => {
    const r = rig({}, googleOk(verified));
    const state = await start(r, 'google', `${ORIGIN}/dashboard`);
    const to = location(await go(r, `/api/auth/oauth/google/callback?state=${state}&code=c`));
    expect(to.pathname).toBe('/dashboard');
    const token = to.searchParams.get('auth_token') ?? '';
    const me = await go(r, '/api/auth/me', bearer(token));
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({ user: { id: expect.stringMatching(/^usr-/), email: 'ada@example.com', created_at: expect.any(String) } });
  });
});

describe('GitHub sign-in', () => {
  const sign = async (user: object, emails: object) => {
    const r = rig({}, githubOk(user, emails));
    const state = await start(r, 'github');
    return { r, to: location(await go(r, `/api/auth/oauth/github/callback?state=${state}&code=c`)) };
  };

  test('refuses to start or finish when it is not configured', async () => {
    const r = rig({ GITHUB_CLIENT_SECRET: undefined });
    const res = await go(r, '/api/auth/oauth/github/start');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'GitHub sign-in is not configured on this server.' });
    expect((await go(r, '/api/auth/oauth/github/callback')).status).toBe(503);
  });

  test('redirects to GitHub with the registered callback and scopes', async () => {
    const to = location(await go(rig(), '/api/auth/oauth/github/start'));
    expect(`${to.origin}${to.pathname}`).toBe('https://github.com/login/oauth/authorize');
    expect(to.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/api/auth/oauth/github/callback`);
    expect(to.searchParams.get('scope')).toBe('read:user user:email');
    expect(to.searchParams.get('access_type')).toBeNull();
  });

  test("uses the verified primary address and ignores the profile's public email", async () => {
    const { r, to } = await sign(
      { id: 7, email: 'public@example.com' },
      [
        { email: 'public@example.com', primary: false, verified: false },
        { email: 'Real@Example.com', primary: true, verified: true },
      ],
    );
    expect(to.searchParams.get('auth_error')).toBeNull();
    const me = await go(r, '/api/auth/me', bearer(to.searchParams.get('auth_token') ?? ''));
    expect(((await me.json()) as { user: { email: string } }).user.email).toBe('real@example.com');
  });

  test('falls back to any verified address when the primary is not verified', async () => {
    const { to } = await sign({ id: 7 }, [
      { email: 'primary@example.com', primary: true, verified: false },
      { email: 'other@example.com', primary: false, verified: true },
    ]);
    expect(to.searchParams.get('auth_token')).not.toBeNull();
  });

  test('refuses an account with no verified address, whatever the profile shows', async () => {
    const { r, to } = await sign({ id: 7, email: 'public@example.com' }, [{ email: 'public@example.com', primary: true, verified: false }]);
    expect(to.searchParams.get('auth_error')).toBe("That account's email address is not verified.");
    expect(r.db.sqlite.query('SELECT count(*) AS n FROM users').get()).toEqual({ n: 0 });
  });

  test('a profile without an id is refused', async () => {
    const { to } = await sign({ id: 0 }, [{ email: 'a@example.com', primary: true, verified: true }]);
    expect(to.searchParams.get('auth_error')).toBe('could not load profile');
  });
});

describe('the local stand-in when it is on', () => {
  const local = { OAUTH_DEV: '1' };
  const form = (fields: Record<string, string>): RequestInit => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });

  test('start redirects to its consent page with a state', async () => {
    const res = await go(rig(local), `/api/auth/oauth/dev/start?as=github&return_to=${encodeURIComponent(`${ORIGIN}/dashboard`)}`);
    expect(res.status).toBe(302);
    const to = location(res);
    expect(to.pathname).toBe('/api/auth/oauth/dev/consent');
    expect(to.searchParams.get('state')).toMatch(/^[2-9a-hjkmnp-z]{24}$/);
  });

  test('the consent page is HTML, names the button that was clicked, and escapes the state', async () => {
    const r = rig(local);
    const state = location(await go(r, '/api/auth/oauth/dev/start?as=github')).searchParams.get('state') ?? '';
    const res = await go(r, `/api/auth/oauth/dev/consent?state=${state}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    const page = await res.text();
    expect(page).toContain('<title>Continue with GitHub · quickqr</title>');
    expect(page).toContain(`<input type="hidden" name="state" value="${state}" />`);
    expect(page).toContain('<form method="post" action="/api/auth/oauth/dev/consent">');
    const google = location(await go(r, '/api/auth/oauth/dev/start?as=nonsense')).searchParams.get('state') ?? '';
    expect(await (await go(r, `/api/auth/oauth/dev/consent?state=${google}`)).text()).toContain('Continue with Google');
  });

  test('an unknown state on the consent page goes back to the app with an error', async () => {
    const to = location(await go(rig(local), '/api/auth/oauth/dev/consent?state=bogus'));
    expect(to.searchParams.get('auth_error')).toBe('invalid oauth state');
  });

  test('submitting an email signs in as that address, and the same address is the same account', async () => {
    const r = rig(local);
    const sign = async (email: string) => {
      const state = location(await go(r, `/api/auth/oauth/dev/start?return_to=${encodeURIComponent(`${ORIGIN}/dashboard`)}`)).searchParams.get('state') ?? '';
      const to = location(await go(r, '/api/auth/oauth/dev/consent', form({ state, email })));
      expect(to.pathname).toBe('/dashboard');
      const me = await go(r, '/api/auth/me', bearer(to.searchParams.get('auth_token') ?? ''));
      return ((await me.json()) as { user: { id: string; email: string } }).user;
    };
    const first = await sign('  Ada@Example.com ');
    expect(first.email).toBe('ada@example.com');
    expect((await sign('ada@example.com')).id).toBe(first.id);
  });

  test('a state can be submitted once, and an invalid email is refused', async () => {
    const r = rig(local);
    const state = location(await go(r, '/api/auth/oauth/dev/start')).searchParams.get('state') ?? '';
    expect(location(await go(r, '/api/auth/oauth/dev/consent', form({ state, email: 'not-an-email' }))).searchParams.get('auth_error')).toBe('invalid email');
    expect(location(await go(r, '/api/auth/oauth/dev/consent', form({ state, email: 'ada@example.com' }))).searchParams.get('auth_error')).toBe('invalid oauth state');
  });
});

describe('session routes', () => {
  async function signedIn(): Promise<{ r: Rig; token: string }> {
    const r = rig({ OAUTH_DEV: '1' });
    const state = location(await go(r, '/api/auth/oauth/dev/start')).searchParams.get('state') ?? '';
    const to = location(await go(r, '/api/auth/oauth/dev/consent', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `state=${state}&email=ada%40example.com` }));
    return { r, token: to.searchParams.get('auth_token') ?? '' };
  }

  test('me needs a session', async () => {
    const r = rig();
    for (const init of [{}, bearer('stale')]) {
      const res = await go(r, '/api/auth/me', init);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Sign in to continue.' });
    }
  });

  test('logout always answers 200, and ends the session it was given', async () => {
    const { r, token } = await signedIn();
    expect((await go(r, '/api/auth/me', bearer(token))).status).toBe(200);
    const out = await go(r, '/api/auth/logout', { method: 'POST', ...bearer(token) });
    expect(out.status).toBe(200);
    expect(await out.json()).toEqual({ message: 'logged out' });
    expect((await go(r, '/api/auth/me', bearer(token))).status).toBe(401);
    const anonymous = await go(r, '/api/auth/logout', { method: 'POST' });
    expect(anonymous.status).toBe(200);
    expect((await go(r, '/api/auth/logout', { method: 'POST', ...bearer('stale') })).status).toBe(200);
  });
});
