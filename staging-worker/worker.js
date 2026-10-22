// Staging edge. Pages serves the static app. The API paths go to the backend on odin through a Workers VPC binding
// (a Cloudflare Tunnel from odin), so the backend has no public hostname and no open port.
// These are the paths frontend/nginx.conf sends to the API, plus /R/ (printed codes use the uppercase form).
const API_PREFIXES = ['/api/', '/r/', '/R/'];
const API_PATHS = new Set(['/healthz', '/qr', '/qr.png', '/qr.svg']);

export const isApi = (pathname) => API_PATHS.has(pathname) || API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

// The backend builds client addresses (scan logs) and absolute share URLs (/qr) from these headers, and a visitor can
// send any of them. None of the visitor's are passed on: they are rebuilt from what Cloudflare saw.
export function backendHeaders(request, url) {
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (name === 'forwarded' || name === 'x-real-ip' || name.startsWith('x-forwarded-')) headers.delete(name);
  }
  const client = request.headers.get('CF-Connecting-IP');
  if (client) headers.set('X-Forwarded-For', client);
  headers.set('X-Forwarded-Proto', 'https');
  headers.set('X-Forwarded-Host', url.host);
  return headers;
}

async function callBackend(request, env, url) {
  const headers = backendHeaders(request, url);

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
