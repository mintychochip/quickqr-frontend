import type { User } from '@/types/auth';

const TOKEN_KEY = 'quickqr2_auth_token';

export function getAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}


export async function fetchCurrentUser(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;

  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    setAuthToken(null);
    return null;
  }
  const data = (await res.json()) as { user: User };
  return data.user;
}

export async function logoutAccount(): Promise<void> {
  const token = getAuthToken();
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  setAuthToken(null);
}

export type OAuthProviders = {
  google: boolean;
  github: boolean;
  /** Local stand-in used when Google or GitHub client secrets are not set. */
  dev: boolean;
};

export async function fetchOAuthProviders(): Promise<OAuthProviders> {
  try {
    const res = await fetch('/api/auth/oauth/providers');
    if (!res.ok) {
      return { google: false, github: false, dev: false };
    }
    const data = (await res.json()) as { providers?: OAuthProviders };
    return data.providers ?? { google: false, github: false, dev: false };
  } catch {
    return { google: false, github: false, dev: false };
  }
}

export function oauthStartUrl(provider: 'google' | 'github', returnTo?: string): string {
  const base = typeof window !== 'undefined' ? window.location.href.split('?')[0].split('#')[0] : '/';
  const target = returnTo ?? base;
  return `/api/auth/oauth/${provider}/start?return_to=${encodeURIComponent(target)}`;
}

export function startOAuthSignIn(provider: 'google' | 'github'): void {
  window.location.assign(oauthStartUrl(provider));
}

export function startDevOAuthSignIn(provider: 'google' | 'github'): void {
  const base = typeof window !== 'undefined' ? window.location.href.split('?')[0].split('#')[0] : '/';
  const params = new URLSearchParams({ as: provider, return_to: base });
  window.location.assign(`/api/auth/oauth/dev/start?${params.toString()}`);
}

const PENDING_DYNAMIC_KEY = 'quickqr2_pending_dynamic';

export function stashPendingDynamicLink(payload: {
  destinationUrl: string;
  title: string;
  customSlug: string;
  adStyle: string;
}): void {
  sessionStorage.setItem(PENDING_DYNAMIC_KEY, JSON.stringify(payload));
}

export function takePendingDynamicLink(): {
  destinationUrl: string;
  title: string;
  customSlug: string;
  adStyle: string;
} | null {
  const raw = sessionStorage.getItem(PENDING_DYNAMIC_KEY);
  sessionStorage.removeItem(PENDING_DYNAMIC_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      destinationUrl: string;
      title: string;
      customSlug: string;
      adStyle: string;
    };
  } catch {
    return null;
  }
}

export function consumeAuthTokenFromUrl(): { token: string | null; error: string | null } {
  if (typeof window === 'undefined') return { token: null, error: null };
  const url = new URL(window.location.href);
  const token = url.searchParams.get('auth_token');
  const error = url.searchParams.get('auth_error');
  if (!token && !error) return { token: null, error: null };

  url.searchParams.delete('auth_token');
  url.searchParams.delete('auth_error');
  const clean = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', clean);

  return { token, error };
}

