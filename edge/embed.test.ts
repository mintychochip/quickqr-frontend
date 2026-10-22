import QRCode from 'qrcode';
import { encodeMatrix } from './qr/matrix';
import { describe, expect, test } from 'bun:test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { normalizeTargetUrl } from './routes/embed';
import { go, rig, type Rig } from './test/rig';

const TARGET = 'https://example.com/embed-test?table=4';
const LONG_PATH = `https://example.com/a/very/long/path/${'x'.repeat(260)}`;
const LONG_QUERY = `https://example.com/?q=${'z9'.repeat(400)}`;

/** Reads a code the way a phone would: from its pixels. */
function readPixels(data: Uint8ClampedArray, width: number, height: number): string | null {
  return jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}

function decodePng(bytes: Uint8Array): { text: string | null; width: number; height: number } {
  const png = PNG.sync.read(Buffer.from(bytes));
  return { text: readPixels(new Uint8ClampedArray(png.data), png.width, png.height), width: png.width, height: png.height };
}

/** Black modules on a white page, not the reverse: jsQR reads both, but most phone cameras read only this one. */
function polarity(bytes: Uint8Array): { corner: number; finder: number } {
  const png = PNG.sync.read(Buffer.from(bytes));
  const found = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, { inversionAttempts: 'dontInvert' });
  const size = 17 + 4 * (found?.version ?? 0);
  const at = (x: number, y: number): number => png.data[(y * png.width + x) * 4] ?? -1;
  const middleOfModule = Math.floor((4.5 * png.width) / (size + 8)); // the top-left finder pattern starts at module (4, 4)
  return { corner: at(0, 0), finder: at(middleOfModule, middleOfModule) };
}

/** Draws the SVG's rectangles at 8 pixels per unit, which is all the file contains. */
function decodeSvg(svg: string): { text: string | null; units: number } {
  const units = Number(/viewBox="0 0 (\d+) (\d+)"/.exec(svg)?.[1]);
  const scale = 8;
  const side = units * scale;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
  for (const match of svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="#111113"\/>/g)) {
    const [x = 0, y = 0, w = 0, h = 0] = match.slice(1).map(Number);
    for (let py = y * scale; py < (y + h) * scale; py++) {
      for (let px = x * scale; px < (x + w) * scale; px++) {
        const at = (py * side + px) * 4;
        pixels[at] = pixels[at + 1] = pixels[at + 2] = 17;
      }
    }
  }
  return { text: readPixels(pixels, side, side), units };
}

const text = async (res: Response): Promise<string> => res.text();
const bytes = async (res: Response): Promise<Uint8Array> => new Uint8Array(await res.arrayBuffer());

describe('which address a code is made for', () => {
  test.each([
    ['example.com/menu', 'https://example.com/menu'],
    ['  example.com  ', 'https://example.com/'],
    ['http://example.com/a?b=1#c', 'http://example.com/a?b=1#c'],
    ['HTTPS://Example.com/Path', 'https://example.com/Path'],
    ['https://example.com/a b', 'https://example.com/a%20b'],
    ['example.com/日本', 'https://example.com/%E6%97%A5%E6%9C%AC'],
  ])('%s is %s', (raw, expected) => {
    expect(normalizeTargetUrl(raw)).toBe(expected);
  });

  test.each([
    ['', 'url is required'],
    ['   ', 'url is required'],
    ['x'.repeat(2049), 'url is too long'],
    ['javascript:alert(1)', 'url must start with http:// or https://'],
    ['data:text/html,hi', 'url must start with http:// or https://'],
    ['ftp://example.com/file', 'url must start with http:// or https://'],
    ['mailto:ada@example.com', 'url must start with http:// or https://'],
    ['file:///etc/passwd', 'url must start with http:// or https://'],
    ['https://', 'url must include a host'],
    ['http:///path', 'url must include a host'],
    ['https://exa mple.com', 'url is not valid'],
    ['https://%zz', 'url is not valid'],
  ])('%s is refused: %s', (raw, message) => {
    expect(() => normalizeTargetUrl(raw)).toThrow(message);
  });

  test('2048 characters are fine, and 2049 are not', () => {
    const base = 'https://example.com/';
    expect(normalizeTargetUrl(base + 'a'.repeat(2048 - base.length))).toHaveLength(2048);
    expect(() => normalizeTargetUrl(base + 'a'.repeat(2049 - base.length))).toThrow('url is too long');
  });
});

describe('the PNG', () => {
  test('is a 1024 by 1024 picture a phone reads back as the address', async () => {
    const res = await go(rig(), `/qr.png?url=${encodeURIComponent(TARGET)}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="quickqr.png"');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const decoded = decodePng(await bytes(res));
    expect(decoded).toEqual({ text: TARGET, width: 1024, height: 1024 });
  });

  test('says https when the scheme is missing, and decodes for many shapes of address', async () => {
    const r = rig();
    for (const [given, expected] of [
      ['example.com/menu', 'https://example.com/menu'],
      ['http://example.com', 'http://example.com/'],
      [LONG_PATH, LONG_PATH],
      [LONG_QUERY, LONG_QUERY],
    ] as const) {
      const res = await go(r, `/qr.png?url=${encodeURIComponent(given)}`);
      expect([given.slice(0, 40), decodePng(await bytes(res)).text]).toEqual([given.slice(0, 40), expected]);
    }
  });

  test('is a valid, small PNG: black and white only, and far smaller than the raw pixels', async () => {
    const res = await go(rig(), `/qr.png?url=${encodeURIComponent(TARGET)}`);
    const body = await bytes(res);
    expect(Array.from(body.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(body.byteLength).toBeLessThan(20_000);
    const png = PNG.sync.read(Buffer.from(body));
    const shades = new Set<number>();
    for (let i = 0; i < png.data.length; i += 4) shades.add(((png.data[i] ?? 0) << 16) | ((png.data[i + 1] ?? 0) << 8) | (png.data[i + 2] ?? 0));
    expect([...shades].sort()).toEqual([0x000000, 0xffffff]);
  });

  test('is black modules on white, with the quiet zone white', async () => {
    const res = await go(rig(), `/qr.png?url=${encodeURIComponent(TARGET)}`);
    expect(polarity(await bytes(res))).toEqual({ corner: 255, finder: 0 });
  });

  test('refuses a missing, unsafe, or unreadable address with a plain-text 400', async () => {
    const r = rig();
    for (const [query, message] of [
      ['', 'url is required'],
      ['?url=', 'url is required'],
      [`?url=${encodeURIComponent('javascript:alert(1)')}`, 'url must start with http:// or https://'],
      [`?url=${'a'.repeat(3000)}`, 'url is too long'],
    ]) {
      const res = await go(r, `/qr.png${query}`);
      expect([res.status, res.headers.get('Content-Type'), await text(res)]).toEqual([400, 'text/plain; charset=utf-8', `${message}\n`]);
    }
  });
});

describe('the code itself', () => {
  const url = (length: number): string => `https://example.com/${Array.from({ length }, (_, i) => 'abcdefghijklmnopqrstuvwxyz0123456789'[(i * 7 + (i >> 3)) % 36]).join('')}`;
  const bestMask = (address: string) => QRCode.create(address, { errorCorrectionLevel: 'M' });

  test('a small code is the best of all eight masks, as the library finds it', () => {
    for (const length of [5, 30, 60, 100]) {
      const address = url(length);
      const best = bestMask(address);
      expect(best.version).toBeLessThan(10);
      expect(Array.from(encodeMatrix(address).data)).toEqual(Array.from(best.modules.data));
    }
  });

  test('a large code skips the eight-mask search, which costs CPU in proportion to its area', () => {
    for (const length of [300, 600, 1200]) {
      const address = url(length);
      expect(bestMask(address).version).toBeGreaterThanOrEqual(10);
      expect(Array.from(encodeMatrix(address).data)).toEqual(Array.from(QRCode.create(address, { errorCorrectionLevel: 'M', maskPattern: 0 }).modules.data));
    }
  });

  /** The module grid read straight off the PNG's pixels, at the middle of each module: no decoder in between. */
  function modulesFromPng(body: Uint8Array, size: number): Uint8Array {
    const png = PNG.sync.read(Buffer.from(body));
    const total = size + 8;
    const out = new Uint8Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = Math.floor(((x + 4.5) * png.width) / total);
        const py = Math.floor(((y + 4.5) * png.height) / total);
        out[y * size + x] = (png.data[(py * png.width + px) * 4] ?? 255) < 128 ? 1 : 0;
      }
    }
    return out;
  }

  test('every size is drawn exactly: the PNG holds its module grid, and the SVG reads back as its address', async () => {
    const r = rig();
    for (const length of [10, 60, 150, 250, 400, 700, 1000, 1500, 1970]) {
      const address = url(length);
      const matrix = encodeMatrix(address);
      const png = await bytes(await go(r, `/qr.png?url=${encodeURIComponent(address)}`));
      expect([length, Array.from(modulesFromPng(png, matrix.size)).join('') === Array.from(matrix.data).join('')]).toEqual([length, true]);
      const svg = decodeSvg(await text(await go(r, `/qr.svg?url=${encodeURIComponent(address)}`)));
      expect([length, svg.text === address]).toEqual([length, true]);
    }
  });

  test('a phone-sized picture of any code a decoder can resample reads back as its address', async () => {
    const r = rig();
    for (const length of [10, 60, 150, 250, 400, 700, 1000]) {
      const address = url(length);
      expect([length, decodePng(await bytes(await go(r, `/qr.png?url=${encodeURIComponent(address)}`))).text === address]).toEqual([length, true]);
    }
  });
});

describe('the SVG', () => {
  test('is the same code with a 4-unit quiet zone, and reads back as the address', async () => {
    const res = await go(rig(), `/qr.svg?url=${encodeURIComponent(TARGET)}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toBe('inline; filename="quickqr.svg"');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
    const svg = await text(res);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ');
    expect(svg).toContain('width="1024" height="1024" shape-rendering="crispEdges" role="img" aria-label="QR code">');
    expect(svg).toContain('<rect width="100%" height="100%" fill="#ffffff"/>');
    const decoded = decodeSvg(svg);
    expect(decoded.text).toBe(TARGET);
    expect(decoded.units).toBeGreaterThanOrEqual(21 + 8);
    const xs = [...svg.matchAll(/<rect x="(\d+)"/g)].map((m) => Number(m[1]));
    expect(Math.min(...xs)).toBe(4);
    expect(Math.max(...xs)).toBeLessThanOrEqual(decoded.units - 5);
  });

  test('and the PNG are the same code', async () => {
    const r = rig();
    const query = `?url=${encodeURIComponent('https://example.com/same?x=1')}`;
    expect(decodeSvg(await text(await go(r, `/qr.svg${query}`))).text).toBe(decodePng(await bytes(await go(r, `/qr.png${query}`))).text);
  });

  test('refuses what the PNG refuses', async () => {
    const res = await go(rig(), '/qr.svg?url=ftp%3A%2F%2Fa.co');
    expect([res.status, await text(res)]).toEqual([400, 'url must start with http:// or https://\n']);
  });
});

describe('the share page', () => {
  const INDEX = '<!doctype html><html><head>\n  <title>quickqr.app</title>\n  <meta name="description" content="Old description" />\n  </head><body><div id="app"></div></body></html>';
  const withAssets = (index: string, status = 200): Rig => {
    const r = rig();
    r.env.ASSETS = { fetch: async () => new Response(index, { status, headers: { 'Content-Type': 'text/html' } }) };
    return r;
  };

  test('with no address says how to make one', async () => {
    const res = await go(rig(), '/qr');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    const page = await text(res);
    expect(page).toContain('<title>Create a QR code | quickqr.app</title>');
    expect(page).toContain('<meta property="og:title" content="Create a QR code">');
    expect(page).toContain('<meta name="twitter:card" content="summary">');
    expect(page).toContain('<link rel="canonical" href="https://staging.quickqr.app/qr">');
    expect(page).not.toContain('og:image');
  });

  test('with an address names the site, links the picture, and asks for a large card', async () => {
    const page = await text(await go(rig(), `/qr?url=${encodeURIComponent('https://www.example.com/menu?table=4&x=<1>')}`));
    const image = `https://staging.quickqr.app/qr.png?url=${encodeURIComponent('https://www.example.com/menu?table=4&x=%3C1%3E')}`;
    expect(page).toContain('<title>QR code for example.com | quickqr.app</title>');
    expect(page).toContain(`<meta property="og:image" content="${image.replaceAll('&', '&amp;')}">`);
    expect(page).toContain('<meta property="og:image:width" content="1024">');
    expect(page).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(page).toContain('<meta property="og:description" content="Scan to open https://www.example.com/menu?table=4&amp;x=%3C1%3E">');
    expect(page).toContain(`<link rel="canonical" href="https://staging.quickqr.app/qr?url=${encodeURIComponent('https://www.example.com/menu?table=4&x=%3C1%3E').replaceAll('&', '&amp;')}">`);
    expect(page).not.toContain('<1>');
  });

  test('an address it would refuse is treated as none, not as an error page', async () => {
    const res = await go(rig(), `/qr?url=${encodeURIComponent('javascript:alert(1)')}`);
    expect(res.status).toBe(200);
    const page = await text(res);
    expect(page).toContain('<title>Create a QR code | quickqr.app</title>');
    expect(page).not.toContain('javascript:alert');
  });

  test('builds absolute links from the host and scheme the visitor used, or the proxy reports', async () => {
    const r = rig();
    const direct = await text(await r.app.dispatch(new Request('https://qr.example.org/qr?url=a.co'), r.env, { waitUntil() {} }));
    expect(direct).toContain('content="https://qr.example.org/qr.png?url=https%3A%2F%2Fa.co%2F"');
    const proxied = await text(
      await r.app.dispatch(new Request('http://internal:8788/qr?url=a.co', { headers: { 'X-Forwarded-Proto': 'https, http', 'X-Forwarded-Host': 'quickqr.app, other' } }), r.env, { waitUntil() {} }),
    );
    expect(proxied).toContain('content="https://quickqr.app/qr.png?url=https%3A%2F%2Fa.co%2F"');
    const odd = await text(await r.app.dispatch(new Request('https://qr.example.org/qr', { headers: { 'X-Forwarded-Proto': 'javascript' } }), r.env, { waitUntil() {} }));
    expect(odd).toContain('<link rel="canonical" href="https://qr.example.org/qr">');
  });

  test('is the site\'s own page with the title, description and tags swapped in', async () => {
    const r = withAssets(INDEX);
    const page = await text(await go(r, `/qr?url=${encodeURIComponent('https://example.com/a')}`));
    expect(page.match(/<title>/g)).toHaveLength(1);
    expect(page).toContain('<title>QR code for example.com | quickqr.app</title>');
    expect(page).toContain('<meta name="description" content="Scan to open https://example.com/a" />');
    expect(page).not.toContain('Old description');
    expect(page).toContain('<meta property="og:image" content="https://staging.quickqr.app/qr.png?url=https%3A%2F%2Fexample.com%2Fa">');
    expect(page.indexOf('og:image')).toBeLessThan(page.indexOf('</head>'));
    expect(page).toContain('<div id="app"></div>');
  });

  test('a $ in the address is not read as a replacement pattern', async () => {
    const r = withAssets(INDEX);
    const page = await text(await go(r, `/qr?url=${encodeURIComponent('https://example.com/?a=$&b=$1$`')}`));
    expect(page).toContain('<meta name="description" content="Scan to open https://example.com/?a=$&amp;b=$1$`" />');
    expect(page).toContain('<meta property="og:description" content="Scan to open https://example.com/?a=$&amp;b=$1$`">');
    expect(page.match(/<title>/g)).toHaveLength(1);
  });

  test('falls back to a page of its own when the site\'s page is not there', async () => {
    for (const r of [rig(), withAssets('gone', 404)]) {
      const page = await text(await go(r, `/qr?url=${encodeURIComponent('https://example.com/a?x=<y>')}`));
      expect(page).toContain('<!doctype html>');
      expect(page).toContain('<img src="https://staging.quickqr.app/qr.png?url=https%3A%2F%2Fexample.com%2Fa%3Fx%3D%253Cy%253E" alt="QR code" width="320" height="320">');
      expect(page).toContain('<p class="target">https://example.com/a?x=%3Cy%3E</p>');
      expect(page).not.toContain('<y>');
    }
    const bare = await text(await go(rig(), '/qr'));
    expect(bare).toContain('Open this page with <code>?url=https://example.com</code> to generate a QR code.');
  });
});
