import worker, { backendHeaders, isApi } from './worker.js';

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
});
