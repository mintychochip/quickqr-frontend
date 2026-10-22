import { registerAuthRoutes } from './routes/auth';
import { Router, type Principal } from './router';
import type { Env } from './env';
import { userFromToken } from './store/users';

/** What the app needs from outside itself. Tests replace it; production uses the platform's fetch. */
export interface AppDeps {
  fetch: typeof fetch;
}

async function authenticate(env: Env, token: string): Promise<Principal | null> {
  const user = await userFromToken(env.DB, token);
  return user ? { userId: user.id, kind: 'session' } : null;
}

/** Builds the router with every route registered. This is the only place routes are added. */
export function createApp(deps: AppDeps = { fetch: (input, init) => fetch(input, init) }): Router {
  const router = new Router(authenticate);
  registerAuthRoutes(router, deps);
  return router;
}
