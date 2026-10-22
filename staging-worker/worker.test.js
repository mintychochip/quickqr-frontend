import worker, { backendHeaders, isApi, isBlocked } from './worker.js';

const url = new URL('https://staging.quickqr.app/qr?url=x');
const request = (headers) => new Request(url, { headers });

// The backend builds client addresses (scan logs) and absolute share URLs (/qr) from these headers, and a visitor can
// send any of them.
describe('backendHeaders', () => {
  test('rebuilds what the backend believes from what Cloudflare saw, never from the visitor', () => {
    const out = backendHeaders(
      request({
        'CF-Connecting-IP': '203.0.113.9',
        'X-Forwarded-For': '6.6.6.6',
        'X-Forwarded-Host': 'evil.example',
        'X-Forwarded-Proto': 'http',
        'X-Forwarded-Port': '1234',
        'X-Real-IP': '7.7.7.7',
        Forwarded: 'for=8.8.8.8;host=evil.example',
      }),
      url,
    );
    expect(out.get('x-forwarded-for')).toBe('203.0.113.9');
    expect(out.get('x-forwarded-host')).toBe('staging.quickqr.app');
    expect(out.get('x-forwarded-proto')).toBe('https');
    expect(out.has('x-forwarded-port')).toBe(false);
    expect(out.has('x-real-ip')).toBe(false);
    expect(out.has('forwarded')).toBe(false);
  });

  test('forwards no client address when Cloudflare supplied none, even if the visitor sent one', () => {
    expect(backendHeaders(request({ 'X-Forwarded-For': '6.6.6.6' }), url).has('x-forwarded-for')).toBe(false);
  });

  test('keeps the headers the API itself needs', () => {
    const out = backendHeaders(request({ Authorization: 'Bearer t', 'Content-Type': 'application/json' }), url);
    expect(out.get('authorization')).toBe('Bearer t');
    expect(out.get('content-type')).toBe('application/json');
  });
});

describe('isApi', () => {
  test('sends the API, scan and embed paths to the backend, in both cases of /r/', () => {
    for (const path of [
      '/api/links',
      '/api/auth/oauth/providers',
      '/r/abc123',
      '/R/ABC123',
      '/healthz',
      '/qr',
      '/qr.png',
      '/qr.svg',
    ]) {
      expect(isApi(path)).toBe(true);
    }
  });

  test('keeps the app, its assets and bare compressed payloads on Pages', () => {
    // A printed static code is HTTPS://HOST/<payload>; the app decodes it in the browser (App.svelte).
    for (const path of [
      '/',
      '/dashboard',
      '/assets/index-abc.js',
      '/3DDIN+F:A-9KUG*O.B2-$',
      '/api',
      '/apix',
      '/r',
      '/R',
      '/rx/abc',
      '/healthz/x',
      '/qr/x',
      '/qr.json',
    ]) {
      expect(isApi(path)).toBe(false);
    }
  });
});

// The backend's site reader fetches whatever address the caller names, from the machine it runs on, and its test for
// "public" lets through every routable address, including hosts that only answer from inside the network it sits on.
describe('isBlocked', () => {
  test('refuses the site reader however the path is spelled', () => {
    for (const path of [
      '/api/qr/context',
      '/api/qr/context/',
      '/api/qr/%63ontext',
      '/api/qr/c%6Fntext',
      '/api/%71r/context',
      '/api/qr/%zz', // a path the worker cannot decode is refused, not guessed at
    ]) {
      expect(isBlocked(path)).toBe(true);
    }
  });

  test('leaves the rest of the API alone', () => {
    for (const path of ['/api/qr', '/api/qr/style-parser', '/api/qr/abc123/settings', '/api/qr/contextual', '/api/links']) {
      expect(isBlocked(path)).toBe(false);
    }
  });
});

describe('fetch', () => {
  test('answers 502 JSON, not a Cloudflare error page, when the backend cannot be reached', async () => {
    const env = {
      BACKEND: {
        fetch: async () => {
          throw new Error('tunnel down');
        },
      },
    };
    const res = await worker.fetch(new Request('https://staging.quickqr.app/api/links'), env);
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'The staging API is unreachable.' });
  });

  test('never passes a request for the site reader to the backend', async () => {
    const reached = [];
    const env = {
      BACKEND: {
        fetch: async (target) => {
          reached.push(target);
          return new Response('{}');
        },
      },
    };
    for (const path of ['/api/qr/context', '/api/qr/%63ontext']) {
      const body = JSON.stringify({ url: 'http://136.168.1.1/' });
      const res = await worker.fetch(new Request(`https://staging.quickqr.app${path}`, { method: 'POST', body }), env);
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: 'Reading a site is turned off on this server.' });
    }
    expect(reached).toEqual([]);
  });

  test('still passes the rest of the API through', async () => {
    const reached = [];
    const env = {
      BACKEND: {
        fetch: async (target) => {
          reached.push(target);
          return new Response('{}');
        },
      },
    };
    await worker.fetch(new Request('https://staging.quickqr.app/api/qr/style-parser'), env);
    expect(reached).toEqual(['http://staging.quickqr.app/api/qr/style-parser']);
  });

  test('a malformed escape outside /api/ still goes to Pages, as a printed code with a stray percent sign would', async () => {
    const seen = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (req) => {
      seen.push(new URL(req.url).host + new URL(req.url).pathname);
      return new Response('page');
    };
    try {
      const env = {
        BACKEND: {
          fetch: async () => {
            throw new Error('the backend is not for this path');
          },
        },
      };
      const res = await worker.fetch(new Request('https://staging.quickqr.app/3DDIN%zzF'), env);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe('page');
      expect(seen).toEqual(['quickqr-staging.pages.dev/3DDIN%zzF']);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
