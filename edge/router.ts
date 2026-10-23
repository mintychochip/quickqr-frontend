import { isAdmin } from './admin';
import type { Env } from './env';
import { HttpError, bearerToken, errorJson, readJson } from './http';

export const SIGN_IN_REQUIRED = 'Sign in to continue.';

/**
 * public: never authenticates, a token on the request is ignored.
 * optional: a valid session is used, anything else is anonymous (never 401).
 * any: a valid session is required (401 otherwise).
 * session: like `any`; kept as its own value so a future credential type (API keys) can be refused here.
 * admin: a session whose email is in ADMIN_EMAILS. No session is 401; any other person gets the 404 an unregistered
 *   path gets, so the route cannot be probed. Like `session`, an API key can never satisfy it.
 */
export type AuthMode = 'public' | 'optional' | 'any' | 'session' | 'admin';

/** Which rate-limit bucket a route belongs to. Declared on every route; nothing limits yet (roadmap M1). */
export type RouteClass = 'none' | 'read' | 'write' | 'expensive' | 'embed' | 'auth' | 'keys';

export interface Policy {
  auth: AuthMode;
  scope?: string;
  class: RouteClass;
  /** Largest request body `ctx.json()` will read, in bytes. */
  maxBody?: number;
}

export interface Principal {
  userId: string;
  email: string;
  kind: 'session';
}

/** All a handler may ask of the platform's execution context: to keep working after the response, as scan recording does. */
export type Exec = Pick<ExecutionContext, 'waitUntil'>;

export interface Ctx {
  req: Request;
  url: URL;
  env: Env;
  exec: Exec;
  /** The value of a `{name}` in the route's pattern. A route only reads names its own pattern declares. */
  param(name: string): string;
  principal: Principal | null;
  policy: Policy;
  json<T = unknown>(): Promise<T>;
}

export type Handler = (c: Ctx) => Response | Promise<Response>;
export type Authenticator = (env: Env, token: string) => Promise<Principal | null>;

export interface Route {
  method: string;
  path: string;
  pattern: string;
  policy: Policy;
}

interface Entry {
  route: Route;
  segments: string[];
  subtree: boolean;
  literals: number;
  handler: Handler;
}

const AUTH_MODES: AuthMode[] = ['public', 'optional', 'any', 'session', 'admin'];
const CLASSES: RouteClass[] = ['none', 'read', 'write', 'expensive', 'embed', 'auth', 'keys'];

/** Go's http.NotFound: the answer for a path nothing is registered at. */
export const notFound = () => new Response('404 page not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

function splitPattern(pattern: string): { method: string; path: string } {
  const space = pattern.indexOf(' ');
  return space > 0 ? { method: pattern.slice(0, space), path: pattern.slice(space + 1).trim() } : { method: '', path: pattern };
}

/**
 * The only way to register a route. Every route carries an explicit Policy and the registry is readable, so a test can
 * prove that no route is open by accident. Patterns follow Go's net/http: `METHOD /a/{name}/b`, and a trailing slash
 * (`/r/`) owns the whole subtree.
 */
export class Router {
  private entries: Entry[] = [];
  private registry: Route[] = [];
  private authenticate: Authenticator;

  constructor(authenticate: Authenticator) {
    this.authenticate = authenticate;
  }

  handle(pattern: string, policy: Policy, handler: Handler): void {
    if (!AUTH_MODES.includes(policy.auth)) throw new Error(`router: route ${pattern} has unknown Policy.auth`);
    if (!CLASSES.includes(policy.class)) throw new Error(`router: route ${pattern} has unknown Policy.class ${policy.class}`);
    const { method, path } = splitPattern(pattern);
    const subtree = path.length > 1 && path.endsWith('/');
    const segments = path.split('/').slice(1);
    if (subtree) segments.pop();
    const route: Route = { method, path, pattern, policy };
    this.registry.push(route);
    this.entries.push({ route, segments, subtree, literals: segments.filter((s) => !s.startsWith('{')).length, handler });
    // Exact patterns before subtrees, then the most literal segments first, so `/links/new` beats `/links/{code}`.
    this.entries.sort((a, b) => Number(a.subtree) - Number(b.subtree) || b.literals - a.literals);
  }

  routes(): Route[] {
    return [...this.registry];
  }

  private match(entry: Entry, decoded: string[], pathname: string): Record<string, string> | null {
    if (entry.subtree) {
      const prefix = `/${entry.segments.join('/')}/`;
      return pathname.startsWith(prefix) ? {} : null;
    }
    if (decoded.length !== entry.segments.length) return null;
    const params: Record<string, string> = {};
    for (let i = 0; i < decoded.length; i++) {
      const want = entry.segments[i] ?? '';
      const got = decoded[i] ?? '';
      if (want.startsWith('{') && want.endsWith('}')) params[want.slice(1, -1)] = got;
      else if (want !== got) return null;
    }
    return params;
  }

  async dispatch(req: Request, env: Env, exec: Exec): Promise<Response> {
    return withCors(req, await this.route(req, env, exec));
  }

  private async route(req: Request, env: Env, exec: Exec): Promise<Response> {
    const method = req.method.toUpperCase();
    if (method === 'OPTIONS') return new Response(null, { status: 200 });

    const url = new URL(req.url);
    let decoded: string[];
    try {
      decoded = url.pathname.split('/').slice(1).map(decodeURIComponent);
    } catch {
      return new Response('400 Bad Request\n', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    const matches: { entry: Entry; params: Record<string, string> }[] = [];
    for (const entry of this.entries) {
      const params = this.match(entry, decoded, url.pathname);
      if (params) matches.push({ entry, params });
    }
    if (matches.length === 0) return notFound();

    const wanted = method === 'HEAD' ? 'GET' : method;
    const hit = matches.find((m) => !m.entry.route.method || m.entry.route.method === wanted);
    if (!hit) {
      const allow = [...new Set(matches.map((m) => m.entry.route.method).filter(Boolean))].sort();
      return new Response('Method Not Allowed\n', { status: 405, headers: { Allow: allow.join(', '), 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    const { entry, params } = hit;
    const policy = entry.route.policy;
    let principal: Principal | null = null;
    if (policy.auth !== 'public') {
      principal = await this.resolve(req, env);
      const needsSession = policy.auth === 'any' || policy.auth === 'session' || policy.auth === 'admin';
      if (needsSession && !principal) return errorJson(401, SIGN_IN_REQUIRED);
      if (policy.auth === 'admin' && principal && !isAdmin(env, principal.email)) return notFound();
    }

    const ctx: Ctx = { req, url, env, exec, param: (name) => params[name] ?? '', principal, policy, json: <T>() => readJson<T>(req, policy.maxBody) };
    let res: Response;
    try {
      res = await entry.handler(ctx);
    } catch (err) {
      if (err instanceof HttpError) return errorJson(err.status, err.message);
      console.error('unhandled error', err);
      return errorJson(500, 'Internal error');
    }
    return method === 'HEAD' ? new Response(null, { status: res.status, headers: res.headers }) : res;
  }

  private async resolve(req: Request, env: Env): Promise<Principal | null> {
    const token = bearerToken(req);
    if (!token) return null;
    try {
      return await this.authenticate(env, token);
    } catch {
      return null;
    }
  }
}

/** Mirrors the Go server: reflect the caller's Origin (or *), allow the usual methods, never allow credentials. */
function withCors(req: Request, res: Response): Response {
  const out = new Response(res.body, res);
  out.headers.set('Access-Control-Allow-Origin', req.headers.get('Origin') || '*');
  out.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  out.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  return out;
}
