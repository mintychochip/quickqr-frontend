// Staging edge. Pages serves the static app. The API paths go to the backend on odin through a Workers VPC binding
// (a Cloudflare Tunnel from odin), so the backend has no public hostname and no open port.
// These are the paths frontend/nginx.conf sends to the API, plus /R/ (printed codes use the uppercase form).
const API_PREFIXES = ['/api/', '/r/', '/R/'];
const API_PATHS = new Set(['/healthz', '/qr', '/qr.png', '/qr.svg']);

const isApi = (pathname) => API_PATHS.has(pathname) || API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

async function callBackend(request, env, url) {
  const headers = new Headers(request.headers);
  const client = request.headers.get('CF-Connecting-IP');
  if (client) headers.set('X-Forwarded-For', client);
  else headers.delete('X-Forwarded-For');
  headers.set('X-Forwarded-Proto', 'https');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  try {
    // The host in this URL becomes the Host header. Redirects (sign-in, scans) go back to the browser untouched.
    return await env.BACKEND.fetch(`http://${url.host}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
    });
  } catch {
    return Response.json({ error: 'The staging API is unreachable.' }, { status: 502 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (env.BACKEND && isApi(url.pathname)) return callBackend(request, env, url);

    url.hostname = 'quickqr-staging.pages.dev';
    return fetch(new Request(url.toString(), request));
  },
};
