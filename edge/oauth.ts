import type { Fetch } from './http';
import type { Env } from './env';

export interface Provider {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
}

export interface OAuthConfig {
  /** Where providers send people back to: the callback URLs are built from it and registered with each provider. */
  redirectOrigin: string;
  /** Where people land after sign-in. Also the allow-list `return_to` is checked against. */
  appPublicUrl: string;
  /** The origins an operator actually set, as opposed to the defaults. The local stand-in looks only at these. */
  namedOrigins: string[];
  google: Provider | null;
  github: Provider | null;
  /** The raw OAUTH_DEV value. */
  devSwitch: string;
}

const trimSlashes = (value: string | undefined): string => (value ?? '').trim().replace(/\/+$/, '');

export function loadOAuthConfig(env: Env): OAuthConfig {
  const named: string[] = [];
  let redirectOrigin = trimSlashes(env.OAUTH_REDIRECT_ORIGIN);
  if (redirectOrigin) named.push(redirectOrigin);
  else redirectOrigin = 'http://localhost:5186';

  let appPublicUrl = trimSlashes(env.APP_PUBLIC_URL);
  if (appPublicUrl) named.push(appPublicUrl);
  else appPublicUrl = redirectOrigin;

  return {
    redirectOrigin,
    appPublicUrl,
    namedOrigins: named,
    devSwitch: (env.OAUTH_DEV ?? '').trim().toLowerCase(),
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            redirectUrl: `${redirectOrigin}/api/auth/oauth/google/callback`,
            scopes: ['openid', 'email', 'profile'],
            authUrl: 'https://accounts.google.com/o/oauth2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
          }
        : null,
    github:
      env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
        ? {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
            redirectUrl: `${redirectOrigin}/api/auth/oauth/github/callback`,
            scopes: ['read:user', 'user:email'],
            authUrl: 'https://github.com/login/oauth/authorize',
            tokenUrl: 'https://github.com/login/oauth/access_token',
          }
        : null,
  };
}

function isLoopbackOrigin(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
  } catch {
    return false;
  }
}

/**
 * The local stand-in signs anyone in as any email, so it is off unless asked for: OAUTH_DEV=1, or origins named by the
 * operator that are all loopback. No named origins, or any public one, keeps it off, and OAUTH_DEV=0 forces it off.
 */
export function devEnabled(cfg: OAuthConfig): boolean {
  if (['0', 'false', 'off'].includes(cfg.devSwitch)) return false;
  if (['1', 'true', 'on'].includes(cfg.devSwitch)) return true;
  return cfg.namedOrigins.length > 0 && cfg.namedOrigins.every(isLoopbackOrigin);
}

export function providersEnabled(cfg: OAuthConfig): { google: boolean; github: boolean; dev: boolean } {
  return { google: cfg.google !== null, github: cfg.github !== null, dev: devEnabled(cfg) };
}

const LOCAL_ORIGINS = ['http://localhost:5186', 'http://127.0.0.1:5186', 'http://localhost:8080', 'http://127.0.0.1:8080'];

/**
 * Where a finished sign-in may send the person (and their new session token): the app's own origin, compared whole, so
 * `https://app.example.evil.test` and `https://app.example@evil.test` do not pass. Local development origins are
 * allowed only while the app itself is on a loopback address. Anything else lands on the app's home page.
 */
export function allowedReturnTo(cfg: OAuthConfig, raw: string): string {
  const home = `${cfg.appPublicUrl}/`;
  raw = raw.trim();
  if (!raw) return home;
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return home;
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') return home;

  const allowed = new Set<string>();
  for (const origin of [cfg.appPublicUrl, cfg.redirectOrigin]) {
    try {
      allowed.add(new URL(origin).origin);
    } catch {
      // An origin that is not a URL allows nothing.
    }
  }
  if (isLoopbackOrigin(cfg.appPublicUrl)) for (const origin of LOCAL_ORIGINS) allowed.add(origin);
  return allowed.has(target.origin) ? raw : home;
}

/** The provider's consent URL: the registered callback, the scopes, and our state. */
export function authorizeUrl(provider: Provider, state: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({
    ...extra,
    client_id: provider.clientId,
    redirect_uri: provider.redirectUrl,
    response_type: 'code',
    scope: provider.scopes.join(' '),
    state,
  });
  params.sort();
  return `${provider.authUrl}?${params}`;
}

/** Trades an authorization code for an access token. Any failure is a plain error: the person is told only that it failed. */
export async function exchangeCode(fetchFn: Fetch, provider: Provider, code: string): Promise<string> {
  const res = await fetchFn(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: provider.redirectUrl,
    }),
  });
  const body = (await res.json().catch(() => null)) as { access_token?: unknown } | null;
  if (!res.ok || !body || typeof body.access_token !== 'string' || body.access_token === '') throw new Error('token exchange failed');
  return body.access_token;
}

/** The provider does not vouch for the address, so it must not sign anyone in: a sign-in links to an existing account by email. */
export class EmailNotVerifiedError extends Error {
  constructor() {
    super('email address is not verified');
  }
}

export interface Profile {
  subject: string;
  email: string;
}

async function getJson(fetchFn: Fetch, url: string, token: string, accept: string): Promise<unknown> {
  const res = await fetchFn(url, { headers: { Authorization: `Bearer ${token}`, Accept: accept, 'User-Agent': 'quickqr' } });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

export async function fetchGoogleProfile(fetchFn: Fetch, token: string): Promise<Profile> {
  const data = (await getJson(fetchFn, 'https://www.googleapis.com/oauth2/v2/userinfo', token, 'application/json')) as {
    id?: unknown;
    email?: unknown;
    verified_email?: unknown;
  };
  if (typeof data.id !== 'string' || typeof data.email !== 'string' || !data.id || !data.email) throw new Error('google profile missing id or email');
  if (data.verified_email !== true) throw new EmailNotVerifiedError();
  return { subject: data.id, email: data.email };
}

const GITHUB_ACCEPT = 'application/vnd.github+json';

/**
 * Only an address GitHub has verified is used: the primary one if it is verified, else any verified one. The profile's
 * own public email is never used, because its owner can set it to an address they have not verified.
 */
export async function fetchGitHubProfile(fetchFn: Fetch, token: string): Promise<Profile> {
  const user = (await getJson(fetchFn, 'https://api.github.com/user', token, GITHUB_ACCEPT)) as { id?: unknown };
  const emails = (await getJson(fetchFn, 'https://api.github.com/user/emails', token, GITHUB_ACCEPT)) as {
    email?: unknown;
    primary?: unknown;
    verified?: unknown;
  }[];
  const verified = emails.filter((e) => e.verified === true && typeof e.email === 'string' && e.email !== '');
  const pick = verified.find((e) => e.primary === true) ?? verified[0];
  if (!pick) throw new EmailNotVerifiedError();
  if (typeof user.id !== 'number' || user.id === 0) throw new Error('github profile missing id or email');
  return { subject: String(user.id), email: String(pick.email).toLowerCase() };
}
