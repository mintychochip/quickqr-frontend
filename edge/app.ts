import type { Fetch } from './http';
import { registerAuthRoutes } from './routes/auth';
import { registerEmbedRoutes } from './routes/embed';
import { registerGiftRoutes } from './routes/gifts';
import { registerHostedRoutes } from './routes/hosted';
import { registerLinkRoutes } from './routes/links';
import { registerMenuPublishRoutes } from './routes/menuPublish';
import { registerQrRoutes } from './routes/qr';
import { registerRedirectRoutes } from './routes/redirect';
import { registerSiteHostRoutes } from './routes/siteHost';
import { registerSiteRoutes } from './routes/sites';
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
    return user ? { userId: user.id, email: user.email, kind: 'session' } : null;
  };
  const router = new Router(authenticate);
  registerAuthRoutes(router, deps);
  registerGiftRoutes(router, deps);
  registerLinkRoutes(router, deps);
  registerHostedRoutes(router, deps);
  registerMenuPublishRoutes(router, deps);
  registerSiteRoutes(router, deps);
  registerQrRoutes(router, deps);
  registerRedirectRoutes(router, deps);
  registerSiteHostRoutes(router, deps);
  registerEmbedRoutes(router);
  registerStyleRoutes(router, deps);
  return router;
}
