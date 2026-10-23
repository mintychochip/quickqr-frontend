import worker from './worker.js';

// Run the worker against a stand-in for fetch and report what it asked the Pages project for.
async function through(request) {
  const asked = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (req, init) => {
    asked.push({ url: new URL(req.url), method: req.method, headers: req.headers, init });
    return new Response('from pages', { status: 200 });
  };
  try {
    const res = await worker.fetch(request);
    return { res, asked };
  } finally {
    globalThis.fetch = realFetch;
  }
}

describe('the staging proxy', () => {
  test('asks the Pages project, and only it, for the same path, query, method, and headers', async () => {
    const { res, asked } = await through(
      new Request('https://staging.quickqr.app/api/links?x=1', { headers: { Authorization: 'Bearer t' } }),
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('from pages');
    expect(asked).toHaveLength(1);
    expect(asked[0].url.host).toBe('quickqr-staging.pages.dev');
    expect(asked[0].url.pathname + asked[0].url.search).toBe('/api/links?x=1');
    expect(asked[0].method).toBe('GET');
    expect(asked[0].headers.get('authorization')).toBe('Bearer t');
  });

  test('keeps a printed code with a stray percent sign exactly as scanned', async () => {
    const { asked } = await through(new Request('https://staging.quickqr.app/3DDIN%zzF'));
    expect(asked[0].url.host + asked[0].url.pathname).toBe('quickqr-staging.pages.dev/3DDIN%zzF');
  });

  // A scan with the direct style and the sign-in start answer with a redirect. If the proxy followed it, the browser would
  // get the destination's page from this hostname instead of being sent there.
  test('does not follow redirects, so a scan or sign-in redirect reaches the browser', async () => {
    const { asked } = await through(new Request('https://staging.quickqr.app/r/abc?direct=1'));
    expect(asked[0].init.redirect).toBe('manual');
  });
});
