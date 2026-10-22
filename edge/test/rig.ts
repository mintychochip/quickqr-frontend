import type { Fetch } from '../http';
import { createApp } from '../app';
import type { Env } from '../env';
import type { Router } from '../router';
import { loginOrRegisterOAuth } from '../store/users';
import { testDb, type TestDb } from './sqlite';

export const ORIGIN = 'https://staging.quickqr.app';

export const configured = {
  OAUTH_REDIRECT_ORIGIN: ORIGIN,
  APP_PUBLIC_URL: ORIGIN,
  GOOGLE_CLIENT_ID: 'gid',
  GOOGLE_CLIENT_SECRET: 'gsecret',
  GITHUB_CLIENT_ID: 'hid',
  GITHUB_CLIENT_SECRET: 'hsecret',
  SCAN_HASH_KEY: 'test-scan-key',
};

export type NetworkHandler = (req: Request) => Response | Promise<Response>;

/** A stand-in for the network: only the endpoints a test names, and a loud failure for anything else. */
export function network(handlers: Record<string, NetworkHandler>): Fetch {
  return async (input, init) => {
    const req = new Request(input, init);
    const handler = handlers[`${req.method} ${req.url}`];
    if (!handler) throw new Error(`unexpected request: ${req.method} ${req.url}`);
    return handler(req);
  };
}

export interface Rig {
  db: TestDb;
  env: Env;
  app: Router;
  waiting: Promise<unknown>[];
  /** Waits for everything the requests so far handed to waitUntil, such as scan recording. */
  settle(): Promise<void>;
  /** The app's clock: it starts at the real time and moves only when a test advances it. */
  now(): Date;
  advance(ms: number): void;
}

export function rig(over: Partial<Env> = {}, handlers: Record<string, NetworkHandler> = {}): Rig {
  const db = testDb();
  const waiting: Promise<unknown>[] = [];
  let clock = Date.now();
  const now = () => new Date(clock);
  return {
    db,
    env: { DB: db, ...configured, ...over },
    app: createApp({ fetch: network(handlers), now }),
    waiting,
    now,
    advance(ms) {
      clock += ms;
    },
    async settle() {
      await Promise.all(waiting.splice(0));
    },
  };
}

export const go = (r: Rig, path: string, init: RequestInit = {}): Promise<Response> =>
  r.app.dispatch(new Request(`${ORIGIN}${path}`, { redirect: 'manual', ...init }), r.env, {
    waitUntil: (promise) => {
      r.waiting.push(promise);
    },
  });

export const location = (res: Response): URL => new URL(res.headers.get('Location') ?? 'x:', ORIGIN);

export const bearer = (token: string): RequestInit => ({ headers: { Authorization: `Bearer ${token}` } });

export function withJson(method: string, token: string, body: unknown): RequestInit {
  return { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

/** A signed-in person: their account exists and the token is a real session. */
export async function signUp(r: Rig, email: string): Promise<{ id: string; token: string }> {
  const { user, token } = await loginOrRegisterOAuth(r.db, 'dev', email, email, r.now());
  return { id: user.id, token };
}
