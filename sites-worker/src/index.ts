/** The two public sites hostnames and the Pages deployment each one serves through. */
export const TARGETS: Record<string, string> = {
  'sites.quickqr.app': 'quickqr-ewm.pages.dev',
  'staging.sites.quickqr.app': 'quickqr-staging.pages.dev',
};

export interface Env {
  /** Shared with both Pages projects; without it the Pages origin would redirect to the public host again. */
  PROXY_KEY: string;
}

export function targetFor(hostname: string): string | undefined {
  return TARGETS[hostname];
}

const CODE = /^[2-9a-hjkmnp-z]{6}$/i;
const notFound = (): Response => new Response('Not found\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
const moved = (location: string): Response => new Response(null, { status: 301, headers: { Location: location } });

/** Pages answers directory and canonical redirects under `/s/`; the public host must show `/<code>/`. */
function publicLocation(response: Response, prefix: string): Response {
  const location = response.headers.get('Location');
  if (!location) return response;
  const marker = `/s${prefix}`;
  if (!location.includes(marker)) return response;
  const headers = new Headers(response.headers);
  headers.set('Location', location.startsWith(marker) ? location.slice(2) : location.replace(marker, prefix));
  return new Response(response.body, { status: response.status, headers });
}

/**
 * `/s/*` on a sites host is proxied to that environment's Pages project. Only the public hostname stays in the
 * address bar; relative links and redirects work because the path is unchanged. The shared key lets the Pages
 * Function know the request came through here and that the client address in the header is trustworthy.
 */
export async function proxy(
  request: Request,
  key: string,
  fetchFn: (request: Request) => Promise<Response>,
): Promise<Response> {
  const url = new URL(request.url);
  const target = targetFor(url.hostname);
  if (!target) return notFound();

  // Old `/s/<code>/...` links move to the public `/<code>/...` shape.
  const legacy = /^\/s\/([^/]+)(\/.*)?$/.exec(url.pathname);
  if (legacy) return moved(`/${legacy[1]}${legacy[2] ?? '/'}${url.search}`);
  const code = url.pathname.split('/')[1] ?? '';
  if (!CODE.test(code)) return notFound();
  if (url.pathname === `/${code}`) return moved(`/${code}/${url.search}`);

  const upstream = new URL(request.url);
  upstream.protocol = 'https:';
  upstream.hostname = target;
  upstream.port = '';
  upstream.pathname = `/s${url.pathname}`;
  const headers = new Headers(request.headers);
  // A client must not be able to smuggle a trusted header through the proxy.
  for (const name of [...headers.keys()]) if (name.toLowerCase().startsWith('x-quickqr-')) headers.delete(name);
  headers.set('X-Quickqr-Proxy-Key', key);
  headers.set('X-Quickqr-Client-IP', request.headers.get('CF-Connecting-IP') ?? '');
  headers.delete('Host');
  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body;
  const response = await fetchFn(new Request(upstream, { method: request.method, headers, body, redirect: 'manual' }));
  return publicLocation(response, `/${code}`);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return proxy(request, env.PROXY_KEY, (input) => fetch(input));
  },
};
