import type { AppDeps } from '../app';
import { HttpError, bearerToken, errorJson, html, json, readForm } from '../http';
import { randomCode } from '../ids';
import {
  EmailNotVerifiedError,
  allowedReturnTo,
  authorizeUrl,
  devEnabled,
  exchangeCode,
  fetchGitHubProfile,
  fetchGoogleProfile,
  loadOAuthConfig,
  providersEnabled,
  type Profile,
  type Provider,
} from '../oauth';
import { renderDevConsent } from '../pages/devConsent';
import type { Ctx, Router } from '../router';
import { StoreError } from '../store/errors';
import { consumeOAuthState, loginOrRegisterOAuth, logoutToken, peekOAuthState, saveOAuthState, userFromToken } from '../store/users';
import { optionalAuth, publicAuth, signedIn } from './policies';

const STATE_MS = 10 * 60 * 1000;
const FORM_CAP = 64 << 10;

const redirect = (location: string): Response => new Response(null, { status: 302, headers: { Location: location } });

/** Back to the app's home page with the reason, which the app shows. */
function oauthError(appPublicUrl: string, message: string): Response {
  const to = new URL(`${appPublicUrl}/`);
  to.searchParams.set('auth_error', message);
  return redirect(to.toString());
}

function oauthSuccess(appPublicUrl: string, returnTo: string, token: string): Response {
  let to: URL;
  try {
    to = new URL(returnTo);
  } catch {
    to = new URL(`${appPublicUrl}/`);
  }
  to.searchParams.set('auth_token', token);
  return redirect(to.toString());
}

export function registerAuthRoutes(router: Router, deps: AppDeps): void {
  router.handle('GET /api/auth/me', signedIn, async (c) => {
    const user = await userFromToken(c.env.DB, bearerToken(c.req), deps.now());
    return user ? json(200, { user }) : errorJson(401, 'Sign in to continue.');
  });

  router.handle('POST /api/auth/logout', optionalAuth, async (c) => {
    await logoutToken(c.env.DB, bearerToken(c.req));
    return json(200, { message: 'logged out' });
  });

  router.handle('GET /api/auth/oauth/providers', publicAuth, (c) => json(200, { providers: providersEnabled(loadOAuthConfig(c.env)) }));

  const start = async (c: Ctx, provider: 'google' | 'github'): Promise<Response> => {
    const cfg = loadOAuthConfig(c.env);
    const config = cfg[provider];
    if (!config) return errorJson(503, `${provider === 'google' ? 'Google' : 'GitHub'} sign-in is not configured on this server.`);
    const state = randomCode(24);
    const now = deps.now();
    await saveOAuthState(
      c.env.DB,
      state,
      { provider, returnTo: allowedReturnTo(cfg, c.url.searchParams.get('return_to') ?? ''), expiresAt: new Date(now.getTime() + STATE_MS), as: '' },
      now,
    );
    return redirect(authorizeUrl(config, state, provider === 'google' ? { access_type: 'online' } : {}));
  };

  const callback = async (c: Ctx, provider: 'google' | 'github'): Promise<Response> => {
    const cfg = loadOAuthConfig(c.env);
    const config: Provider | null = cfg[provider];
    if (!config) return new Response('OAuth not configured\n', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    const fail = (message: string) => oauthError(cfg.appPublicUrl, message);

    const reported = c.url.searchParams.get('error');
    if (reported) return fail(reported);

    const st = await consumeOAuthState(c.env.DB, c.url.searchParams.get('state') ?? '', deps.now());
    if (!st || st.provider !== provider) return fail('invalid oauth state');

    const code = c.url.searchParams.get('code') ?? '';
    if (!code) return fail('missing authorization code');

    let accessToken: string;
    try {
      accessToken = await exchangeCode(deps.fetch, config, code);
    } catch {
      return fail('token exchange failed');
    }

    let profile: Profile;
    try {
      profile = provider === 'google' ? await fetchGoogleProfile(deps.fetch, accessToken) : await fetchGitHubProfile(deps.fetch, accessToken);
    } catch (err) {
      return fail(err instanceof EmailNotVerifiedError ? "That account's email address is not verified." : 'could not load profile');
    }

    try {
      const { token } = await loginOrRegisterOAuth(c.env.DB, provider, profile.subject, profile.email, deps.now());
      return oauthSuccess(cfg.appPublicUrl, st.returnTo, token);
    } catch (err) {
      if (err instanceof StoreError) return fail(err.message);
      throw err;
    }
  };

  router.handle('GET /api/auth/oauth/google/start', publicAuth, (c) => start(c, 'google'));
  router.handle('GET /api/auth/oauth/google/callback', publicAuth, (c) => callback(c, 'google'));
  router.handle('GET /api/auth/oauth/github/start', publicAuth, (c) => start(c, 'github'));
  router.handle('GET /api/auth/oauth/github/callback', publicAuth, (c) => callback(c, 'github'));

  const devOff = () => errorJson(404, 'Local sign-in is not enabled.');

  router.handle('GET /api/auth/oauth/dev/start', publicAuth, async (c) => {
    const cfg = loadOAuthConfig(c.env);
    if (!devEnabled(cfg)) return devOff();
    const as = c.url.searchParams.get('as') === 'github' ? 'github' : 'google';
    const state = randomCode(24);
    const now = deps.now();
    await saveOAuthState(
      c.env.DB,
      state,
      { provider: 'dev', returnTo: allowedReturnTo(cfg, c.url.searchParams.get('return_to') ?? ''), expiresAt: new Date(now.getTime() + STATE_MS), as },
      now,
    );
    return redirect(`/api/auth/oauth/dev/consent?state=${encodeURIComponent(state)}`);
  });

  const consent = async (c: Ctx): Promise<Response> => {
    const cfg = loadOAuthConfig(c.env);
    if (!devEnabled(cfg)) return devOff();

    const posting = c.req.method === 'POST';
    let form = new URLSearchParams();
    if (posting) {
      try {
        form = await readForm(c.req, FORM_CAP);
      } catch (err) {
        if (err instanceof HttpError) return new Response('bad form\n', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
        throw err;
      }
    }
    // Go read these with FormValue: the body first, then the query string.
    const field = (name: string): string => (posting ? form.get(name) : null) ?? c.url.searchParams.get(name) ?? '';
    const state = field('state');

    const st = await peekOAuthState(c.env.DB, state, deps.now());
    if (!st || st.provider !== 'dev') return oauthError(cfg.appPublicUrl, 'invalid oauth state');

    if (!posting) return html(200, renderDevConsent(state, st.as === 'github' ? 'github' : 'google'));

    const email = field('email').trim();
    if (!(await consumeOAuthState(c.env.DB, state, deps.now()))) return oauthError(cfg.appPublicUrl, 'invalid oauth state');
    try {
      const { token } = await loginOrRegisterOAuth(c.env.DB, 'dev', email.toLowerCase(), email, deps.now());
      return oauthSuccess(cfg.appPublicUrl, st.returnTo, token);
    } catch (err) {
      if (err instanceof StoreError) return oauthError(cfg.appPublicUrl, err.message);
      throw err;
    }
  };

  router.handle('GET /api/auth/oauth/dev/consent', publicAuth, consent);
  router.handle('POST /api/auth/oauth/dev/consent', publicAuth, consent);
}
