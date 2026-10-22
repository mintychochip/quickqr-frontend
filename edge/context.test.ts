import { describe, expect, test } from 'bun:test';
import { extractSiteContext, fetchPublicSiteContext, publicSiteUrl, ContextError } from './style/context';
import { go, rig, type NetworkHandler, type Rig } from './test/rig';

const context = (r: Rig, body: unknown): Promise<Response> => go(r, '/api/qr/context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const failure = async (res: Response): Promise<[number, string]> => [res.status, ((await res.json()) as { error: string }).error];
const page = (html: string, status = 200): NetworkHandler => () => new Response(html, { status, headers: { 'Content-Type': 'text/html' } });
const redirect = (to: string | null, status = 302): NetworkHandler => () => new Response(null, { status, headers: to ? { Location: to } : {} });

describe('which addresses may be read', () => {
  test.each([
    'https://example.com',
    'http://example.com/path?q=1',
    'https://sub.example.co.uk:8443/',
    'http://8.8.8.8/',
    'https://[2606:4700:4700::1111]/',
    'https://example.com.',
    'https://xn--bcher-kva.example/',
  ])('%s is public', (raw) => {
    expect(publicSiteUrl(raw).href).toBeTruthy();
  });

  test.each([
    'localhost',
    'LOCALHOST',
    'foo.local',
    'printer.internal',
    '127.0.0.1',
    '127.255.255.254',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '100.64.0.1',
    '100.127.255.255',
    '192.0.0.8',
    '192.0.2.1',
    '198.18.0.1',
    '198.19.255.255',
    '198.51.100.7',
    '203.0.113.5',
    '224.0.0.1',
    '239.255.255.255',
    '240.0.0.1',
    '255.255.255.255',
    '2130706433', // decimal for 127.0.0.1
    '0x7f.0.0.1',
    '0177.0.0.1',
    '127.1',
    '[::1]',
    '[::]',
    '[fe80::1]',
    '[fc00::1]',
    '[fd12:3456::1]',
    '[ff02::1]',
    '[::ffff:127.0.0.1]',
    '[::ffff:10.0.0.1]',
    '[::ffff:a9fe:a9fe]',
    '[64:ff9b::1]',
    '[100::1]',
    '[2001::1]',
    '[2001:db8::1]',
    '[2002::1]',
  ])('%s is not', (host) => {
    expect(() => publicSiteUrl(`http://${host}/`)).toThrow('That address is not a public site');
  });

  test('is a web address only', () => {
    for (const raw of ['', '   ', 'not a url', 'example.com', 'ftp://example.com', 'file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,hi', 'gopher://example.com']) {
      expect(() => publicSiteUrl(raw)).toThrow('Give a public http(s) site');
    }
  });

  test('ignores whitespace around it', () => {
    expect(publicSiteUrl('  https://example.com/a  ').hostname).toBe('example.com');
  });
});

describe('what is read from a page', () => {
  test('is a note with the site, its title, description, theme and background, and the start of its text', () => {
    const html = `<!doctype html><html><head>
      <title> Cafe  Nord &amp; Sons </title>
      <meta name="description" content="Coffee,&nbsp;cake &amp; calm.">
      <meta name="theme-color" content="#0D9488">
      <style>body { background: #FAF7F0; }</style></head>
      <body><h1>Welcome</h1><p>Open daily.</p></body></html>`;
    const { name, text } = extractSiteContext('cafe.example', html);
    expect(name).toBe('Cafe Nord & Sons');
    expect(text.split('\n').slice(0, 5)).toEqual([
      'Site cafe.example',
      'Title: Cafe Nord & Sons',
      'Coffee, cake & calm.', // a non-breaking space is whitespace, as it is to Go's strings.Fields
      'theme-color: #0d9488',
      'background: #faf7f0',
    ]);
    expect(text).toContain('Welcome Open daily.');
  });

  test('uses the social description when there is no plain one, and either quote style', () => {
    expect(extractSiteContext('a.example', `<meta property='og:description' content='Shared &quot;words&quot;'><title>T</title>`).text).toContain('Shared "words"');
    expect(extractSiteContext('a.example', `<meta name="description" content="plain"><meta property="og:description" content="social">`).text).toContain('plain');
  });

  test('keeps a theme color only when it contains a hex color', () => {
    expect(extractSiteContext('a.example', `<meta name="theme-color" content="rgb(1,2,3)"><title>T</title>`).text).not.toContain('theme-color');
    expect(extractSiteContext('a.example', `<meta name="theme-color" content="#abcdef"><title>T</title>`).text).toContain('theme-color: #abcdef');
  });

  test('takes the first background color written in a stylesheet, in either spelling', () => {
    expect(extractSiteContext('a.example', '<style>a{background-color:#112233} b{background:#445566}</style>').text).toContain('background: #112233');
  });

  test('names the site by its host when the page has no title', () => {
    expect(extractSiteContext('a.example', '<p>just text</p>').name).toBe('a.example');
  });

  test('cuts the visible text at 700 bytes, and tags and runs of spaces are gone', () => {
    const { text } = extractSiteContext('a.example', `<title>T</title><div>${'word  \n '.repeat(500)}</div>`);
    const visible = text.slice(text.indexOf('Title: T\n') + 'Title: T\n'.length);
    expect(new TextEncoder().encode(visible).length).toBeLessThanOrEqual(700);
    expect(visible).not.toMatch(/[<>]|\s{2}/);
    expect(visible.startsWith('T word word word')).toBe(true); // the title's own text is part of the page's text too
  });

  test('never cuts a character in half when it clips', () => {
    const { text } = extractSiteContext('a.example', `<p>${'日'.repeat(500)}</p>`);
    expect(text).not.toContain('\ufffd');
    expect(text.endsWith('日')).toBe(true);
  });

  test('numeric and common named entities are decoded, and unknown ones are left as written', () => {
    expect(extractSiteContext('a.example', '<title>&#65;&#x42;&copy;&hellip; &bogus; &#0; &#xD800;</title>').name).toBe('AB©… &bogus; \ufffd \ufffd');
  });
});

describe('reading a site over the network', () => {
  test('asks as quickqr-context, for HTML, and returns the note', async () => {
    let seen: Request | undefined;
    const r = rig({}, { 'GET https://example.com/': (req) => ((seen = req), new Response('<title>Hi</title><p>there</p>')) });
    const res = await context(r, { url: 'https://example.com' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: 'Hi', text: 'Site example.com\nTitle: Hi\nHi there' });
    expect(seen?.headers.get('User-Agent')).toBe('quickqr-context');
    expect(seen?.headers.get('Accept')).toBe('text/html,application/xhtml+xml');
    expect(seen?.redirect).toBe('manual');
  });

  test('only the first 256 KiB of a page is read', async () => {
    const filler = 'x'.repeat(256 * 1024);
    const r = rig({}, { 'GET https://big.example/': page(`<title>Early</title>${filler}<meta name="theme-color" content="#123456">`) });
    const { text } = (await (await context(r, { url: 'https://big.example/' })).json()) as { text: string };
    expect(text).toContain('Title: Early');
    expect(text).not.toContain('theme-color');
  });

  test.each([
    [404, 'That site returned 404'],
    [500, 'That site returned 500'],
    [403, 'That site returned 403'],
  ])('a %i is reported', async (status, message) => {
    const r = rig({}, { 'GET https://example.com/': page('x', status) });
    expect(await failure(await context(r, { url: 'https://example.com/' }))).toEqual([400, message]);
  });

  test('an unreachable site is reported', async () => {
    expect(await failure(await context(rig({}, {}), { url: 'https://nowhere.example/' }))).toEqual([400, 'Could not reach that site']);
  });

  test('a body that cannot be read is reported', async () => {
    const r = rig({}, { 'GET https://example.com/': () => new Response(new ReadableStream({ start: (c) => c.error(new Error('reset')) })) });
    expect(await failure(await context(r, { url: 'https://example.com/' }))).toEqual([400, 'Could not read that site']);
  });

  test('refuses an address that is not public before it asks anyone', async () => {
    let asked = 0;
    const r = rig({}, { 'GET http://127.0.0.1/': () => (asked++, new Response('secret')) });
    expect(await failure(await context(r, { url: 'http://127.0.0.1/' }))).toEqual([400, 'That address is not a public site']);
    expect(asked).toBe(0);
  });

  test('follows a redirect, including a relative one, and reports the site that was asked for', async () => {
    const r = rig({}, {
      'GET https://example.com/': redirect('/moved'),
      'GET https://example.com/moved': redirect('https://other.example/final'),
      'GET https://other.example/final': page('<title>Final</title>'),
    });
    const body = (await (await context(r, { url: 'https://example.com/' })).json()) as { name: string; text: string };
    expect(body.name).toBe('Final');
    expect(body.text.startsWith('Site example.com\n')).toBe(true);
  });

  test('holds every redirect to the same rule: a public page cannot send it to an internal address', async () => {
    let asked = 0;
    for (const target of ['http://127.0.0.1/admin', 'http://169.254.169.254/latest/meta-data/', 'http://[::1]/', 'http://localhost:8080/', 'http://internal.local/', 'ftp://example.com/', 'file:///etc/passwd']) {
      const r = rig({}, { 'GET https://example.com/': redirect(target), [`GET ${target}`]: () => (asked++, new Response('secret')) });
      const [status] = await failure(await context(r, { url: 'https://example.com/' }));
      expect([target, status, asked]).toEqual([target, 400, 0]);
    }
  });

  test('follows at most two redirects', async () => {
    const chain = (n: number): Record<string, NetworkHandler> =>
      Object.fromEntries(Array.from({ length: n }, (_, i) => [`GET https://example.com/${i === 0 ? '' : i}`, i === n - 1 ? page('<title>End</title>') : redirect(`/${i + 1}`)]));
    expect((await context(rig({}, chain(3)), { url: 'https://example.com/' })).status).toBe(200); // two redirects
    expect(await failure(await context(rig({}, chain(4)), { url: 'https://example.com/' }))).toEqual([400, 'That site redirected too many times']); // three
  });

  test('a redirect with nowhere to go is reported as the status it is', async () => {
    const r = rig({}, { 'GET https://example.com/': redirect(null, 302) });
    expect(await failure(await context(r, { url: 'https://example.com/' }))).toEqual([400, 'That site returned 302']);
  });

  test('can be given through the fetcher directly, with the same rules', async () => {
    await expect(fetchPublicSiteContext(async () => new Response('<title>X</title>'), 'https://example.com')).resolves.toEqual({ name: 'X', text: 'Site example.com\nTitle: X\nX' });
    await expect(fetchPublicSiteContext(async () => new Response(''), 'ftp://x')).rejects.toBeInstanceOf(ContextError);
  });
});

describe('the request', () => {
  test('is a small JSON object with a url', async () => {
    const r = rig();
    for (const raw of ['{', '[]', '{"url":5}', '"x"']) {
      const res = await go(r, '/api/qr/context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw });
      expect([raw, await failure(res)]).toEqual([raw, [400, 'Invalid request body']]);
    }
    const big = await go(r, '/api/qr/context', { method: 'POST', body: JSON.stringify({ url: `https://example.com/${'a'.repeat(5000)}` }) });
    expect(await failure(big)).toEqual([400, 'Invalid request body']);
    expect(await failure(await context(r, {}))).toEqual([400, 'Give a public http(s) site']);
  });

  test('needs no account', async () => {
    const r = rig({}, { 'GET https://example.com/': page('<title>Open</title>') });
    expect((await context(r, { url: 'https://example.com' })).status).toBe(200);
  });
});
