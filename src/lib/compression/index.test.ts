import vectors from './vectors-v0.json';
import { outputAlphabetQR } from '../alphabets';
import { qrCorpus } from './corpus';
import tables from './v1.json';
import { compress, decompress, printable } from './index';
import { Model } from './model';
import { compress as compressV0, decompress as decompressV0, numberToString, stringToNumber } from './v0.js';
import { compressV1 } from './v1';

const same = (a: string, b: string) => {
  const x = new URL(a);
  const y = new URL(b);
  return x.protocol === y.protocol && x.host === y.host && x.pathname === y.pathname && x.search === y.search && x.hash === y.hash;
};

const everyUrl = [...qrCorpus.map(([, url]) => url), ...vectors.map((v) => v.url)];
const isV1 = (payload: string) => (stringToNumber(payload, outputAlphabetQR) & 1n) === 1n;

describe('compress', () => {
  test('is never longer than the original encoder, wherever the original gets the address right', () => {
    const longer = everyUrl.filter((url) => {
      const v0 = compressV0(url, outputAlphabetQR);
      const faithful = same(decompressV0(v0, outputAlphabetQR), url);
      return faithful && compress(url, outputAlphabetQR).length > v0.length;
    });
    expect(longer).toEqual([]);
  });

  test('does not print a payload that would decode to a slightly different address', () => {
    // v0 lowercases percent escapes and turns `?b` into `?b=`; it can be shorter and still wrong.
    for (const url of ['https://example.com/a%2Fb%3Fc', 'https://example.com/a?b', 'https://example.com/caf%C3%A9']) {
      const back = new URL(decompress(compress(url, outputAlphabetQR), outputAlphabetQR));
      const want = new URL(url);
      expect([back.pathname, back.search]).toEqual([want.pathname, want.search]);
    }
  });

  test('comes back as the same address, whichever format it chose', () => {
    const wrong = everyUrl.filter((url) => !same(decompress(compress(url, outputAlphabetQR), outputAlphabetQR), url));
    expect(wrong).toEqual([]);
  });

  test('is a good deal shorter overall on the addresses people print', () => {
    const v0 = qrCorpus.reduce((sum, [, url]) => sum + compressV0(url, outputAlphabetQR).length, 0);
    const now = qrCorpus.reduce((sum, [, url]) => sum + compress(url, outputAlphabetQR).length, 0);
    expect(now / v0 < 0.84).toBe(true);
  });

  test('uses v1 where it wins and v0 where it does not, and v0 on a tie', () => {
    let v1Chosen = 0;
    let v0Chosen = 0;
    for (const url of everyUrl) {
      const chosen = compress(url, outputAlphabetQR);
      const v0 = compressV0(url, outputAlphabetQR);
      if (isV1(chosen)) {
        v1Chosen++;
        // v1 is only chosen for being shorter, or because v0's payload cannot be used: it would decode to another
        // address, or it cannot be printed (see printable)
        const v0Usable = same(decompressV0(v0, outputAlphabetQR), url) && printable(v0);
        expect(chosen.length < v0.length || !v0Usable).toBe(true);
      } else {
        v0Chosen++;
        expect(chosen).toBe(v0);
      }
    }
    expect(v1Chosen > 100 && v0Chosen > 5).toBe(true);
  });

  test('never prints a payload that starts with R/, which the scanner reads as a plain /r/ short link', () => {
    // About one payload in 1,800 starts that way. Find addresses whose v1 payload does and check the answer is another.
    const model = new Model(tables);
    let found = 0;
    for (let i = 0; i < 20000 && found < 3; i++) {
      const url = `https://example.com/page${i}`;
      if (!/^R\//.test(compressV1(new URL(url), outputAlphabetQR, model) ?? '')) continue;
      found++;
      const chosen = compress(url, outputAlphabetQR);
      expect(/^R\//i.test(chosen)).toBe(false);
      expect(same(decompress(chosen, outputAlphabetQR), url)).toBe(true);
    }
    expect(found).toBe(3);
  });

  test('never prints a payload that starts with /, which puts // in the printed address', () => {
    // About one payload in 43 starts that way. Routers collapse // (Go's mux answers 301 to the single-slash path)
    // and the payload loses its first character. Find addresses whose v1 payload does and check the answer is another.
    const model = new Model(tables);
    let found = 0;
    for (let i = 0; i < 4000 && found < 3; i++) {
      const url = `https://example.com/page${i}?x=${i * 7}`;
      if (!compressV1(new URL(url), outputAlphabetQR, model)?.startsWith('/')) continue;
      if (compressV0(url, outputAlphabetQR).startsWith('/')) continue; // v0 is no help here: the next tests
      found++;
      const chosen = compress(url, outputAlphabetQR);
      expect(chosen.startsWith('/')).toBe(false);
      expect(same(decompress(chosen, outputAlphabetQR), url)).toBe(true);
    }
    expect(found).toBe(3);
  });

  test('still compresses an address whose only faithful payload starts with /', () => {
    // v0 cannot carry a percent escape faithfully, so v1 is the only candidate for these addresses, and about one
    // v1 payload in 43 starts with /. The encoder pads v1 (an empty id run, see v1.test.ts) instead of giving up.
    const model = new Model(tables);
    let found = 0;
    for (let i = 0; i < 4000 && found < 3; i++) {
      const url = `https://example.com/caf%C3%A9/menu${i}`;
      if (!compressV1(new URL(url), outputAlphabetQR, model)?.startsWith('/')) continue;
      found++;
      const chosen = compress(url, outputAlphabetQR);
      expect(printable(chosen)).toBe(true);
      expect(isV1(chosen)).toBe(true);
      expect(same(decompress(chosen, outputAlphabetQR), url)).toBe(true);
    }
    expect(found).toBe(3);
  });

  test('still compresses an address whose every payload starts with /', () => {
    // Both formats start with / for about 1 address in 1,850, so a search finds one quickly.
    const model = new Model(tables);
    let url: string | undefined;
    for (let i = 0; i < 40000 && url === undefined; i++) {
      const candidate = `https://example.com/page${i}?x=${i * 7}`;
      if (compressV1(new URL(candidate), outputAlphabetQR, model)?.startsWith('/') && compressV0(candidate, outputAlphabetQR).startsWith('/')) url = candidate;
    }
    expect(typeof url).toBe('string');
    const chosen = compress(url!, outputAlphabetQR);
    expect(printable(chosen)).toBe(true);
    expect(same(decompress(chosen, outputAlphabetQR), url!)).toBe(true);
  });

  test('every payload it prints reaches the app unchanged when the printed address is opened', () => {
    // A phone opens HTTPS://HOST/<payload>. The browser resolves `.` and `..` segments before the app sees the path
    // (`A/.` becomes `A/`), and routers collapse `//`, so a payload holding either arrives changed. The URL parser is
    // the oracle: about 1 payload in 20 would fail it if the encoder did not choose.
    const changed: string[] = [];
    for (let i = 0; i < 3000; i++) {
      const payload = compress(`https://example.com/page${i}?x=${i * 7}&ref=qr`, outputAlphabetQR);
      const opened = new URL(`HTTPS://QUICKQR.APP/${payload}`).pathname;
      if (opened !== `/${payload}` || opened.includes('//')) changed.push(payload);
    }
    expect(changed).toEqual([]);
  });

  test('refuses what a web address cannot carry instead of quietly changing it', () => {
    for (const bad of ['ftp://example.com/a', 'https://user:secret@example.com/', 'mailto:me@example.com', 'javascript:alert(1)', 'not an address', '']) {
      expect(() => compress(bad, outputAlphabetQR)).toThrow();
    }
  });
});

describe('decompress', () => {
  test('reads both formats', () => {
    const v0 = compressV0('https://example.com/menu', outputAlphabetQR);
    expect(same(decompress(v0, outputAlphabetQR), 'https://example.com/menu')).toBe(true);
    const v1 = compress('https://example.com/blog/2026/10/how-to-print-a-qr-code?ref=newsletter', outputAlphabetQR);
    expect(isV1(v1)).toBe(true);
    expect(same(decompress(v1, outputAlphabetQR), 'https://example.com/blog/2026/10/how-to-print-a-qr-code?ref=newsletter')).toBe(true);
  });

  test('refuses a format it does not know instead of guessing', () => {
    const n = stringToNumber(compress('https://example.com/blog/2026/10/how-to-print-a-qr-code?ref=newsletter', outputAlphabetQR), outputAlphabetQR);
    const version2 = numberToString((n & ~3n) | 3n, outputAlphabetQR);
    expect(() => decompress(version2, outputAlphabetQR)).toThrow();
  });

  test('refuses text that is not a payload at all', () => {
    for (const bad of ['', 'hello world', 'lowercase', '%%%']) expect(() => decompress(bad, outputAlphabetQR)).toThrow();
  });

  test('refuses more text than a QR code can hold before reading any of it', () => {
    // 4,296 is the most alphanumeric characters a QR code carries. Reading a long path is quadratic work.
    expect(() => decompress('A'.repeat(4297), outputAlphabetQR)).toThrow();
    const started = performance.now();
    expect(() => decompress('A'.repeat(200_000), outputAlphabetQR)).toThrow();
    expect(performance.now() - started < 50).toBe(true);
  });
});

describe('printable', () => {
  test('accepts what survives being the path of a printed address', () => {
    for (const payload of ['ABC', 'A.B', 'A/B/C', 'A/B/', 'A/...', '$*+-.:', 'A..', '..A', 'A/.B', 'A/B.', 'RA/B', 'R']) expect(printable(payload)).toBe(true);
  });

  test('refuses a payload the scanner reads as a short link', () => {
    for (const payload of ['R/ABC', 'R/']) expect(printable(payload)).toBe(false);
  });

  test('refuses // inside a payload, and a leading / which makes one', () => {
    for (const payload of ['/ABC', 'A//B', 'A/B//', '//A', '/']) expect(printable(payload)).toBe(false);
  });

  test('refuses a . or .. segment wherever it is', () => {
    for (const payload of ['.', '..', './A', '../A', 'A/./B', 'A/../B', 'A/.', 'A/..']) expect(printable(payload)).toBe(false);
  });

  test('agrees with the URL parser on every short string over the characters that matter', () => {
    // The parser decides whether a path comes back as written; `R/` and `//` are checked by hand.
    const letters = ['A', '.', '/', 'R'];
    let strings = [''];
    let checked = 0;
    for (let length = 1; length <= 5; length++) {
      strings = strings.flatMap((s) => letters.map((c) => s + c));
      for (const payload of strings) {
        const opened = new URL(`HTTPS://QUICKQR.APP/${payload}`).pathname;
        expect(printable(payload)).toBe(opened === `/${payload}` && !opened.includes('//') && !payload.startsWith('R/'));
        checked++;
      }
    }
    expect(checked).toBe(1364);
  });
});
