import type { Fetch } from './http';
import { registerAuthRoutes } from './routes/auth';
import { registerEmbedRoutes } from './routes/embed';
import { registerHostedRoutes } from './routes/hosted';
import { registerLinkRoutes } from './routes/links';
import { registerQrRoutes } from './routes/qr';
import { registerRedirectRoutes } from './routes/redirect';
import { registerStyleRoutes } from './routes/style';
import { Router, type Authenticator } from './router';
import { userFromToken } from './store/users';

/** What the app needs from outside itself. Tests replace both; production uses the platform's fetch and clock. */
export interface AppDeps {
  fetch: Fetch;
  now: () => Date;
}

const platform: AppDeps = { fetch: (input, init) => fetch(input, init), now: () => new Date() };

/** Builds the router with every route registered. This is the only place routes are added. */
export function createApp(deps: AppDeps = platform): Router {
  const authenticate: Authenticator = async (env, token) => {
    const user = await userFromToken(env.DB, token, deps.now());
    return user ? { userId: user.id, kind: 'session' } : null;
  };
  const router = new Router(authenticate);
  registerAuthRoutes(router, deps);
  registerLinkRoutes(router, deps);
  registerHostedRoutes(router, deps);
  registerQrRoutes(router, deps);
  registerRedirectRoutes(router, deps);
  registerEmbedRoutes(router);
  registerStyleRoutes(router, deps);
  return router;
}
