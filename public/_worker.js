export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api' || path.startsWith('/api/') || path === '/r' || path.startsWith('/r/')) {
      return new Response(
        JSON.stringify({ error: 'quickqr API is not available on this static deployment.' }),
        { status: 404, headers: { 'content-type': 'application/json; charset=utf-8' } },
      );
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status === 404 && request.method === 'GET' && !path.includes('.')) {
      return env.ASSETS.fetch(new URL('/index.html', url));
    }
    return response;
  },
};
