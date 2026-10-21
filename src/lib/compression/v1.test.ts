import vectors from './vectors-v0.json';
import { outputAlphabetQR } from '../alphabets';
import { qrCorpus } from './corpus';
import { ID_SETS } from './model';
import { syntheticModel } from './testing';
import { compress as compressV0, numberToString, stringToNumber } from './v0.js';
import { compressV1, decompressV1 } from './v1';

const model = syntheticModel();

/** What a browser would treat as the same address. An empty `?` or `#` is not kept. */
function same(url: string) {
  const u = new URL(url);
  return { protocol: u.protocol, host: u.host, pathname: u.pathname, search: u.search, hash: u.hash };
}

function encode(url: string): string {
  const payload = compressV1(new URL(url), outputAlphabetQR, model);
  if (payload === null) throw new Error(`v1 could not encode ${url}`);
  return payload;
}

function roundTrip(url: string) {
  return same(decompressV1(encode(url), outputAlphabetQR, model));
}

describe('v1 round trips', () => {
  test('every URL people put on QR codes comes back as the same address', () => {
    const wrong = qrCorpus.map(([, url]) => url).filter((url) => JSON.stringify(roundTrip(url)) !== JSON.stringify(same(url)));
    expect(wrong).toEqual([]);
  });

  test('so does every real-world URL in the recorded v0 set', () => {
    const wrong = vectors.map((v) => v.url).filter((url) => JSON.stringify(roundTrip(url)) !== JSON.stringify(same(url)));
    expect(wrong).toEqual([]);
  });

  test('awkward but legal URLs survive', () => {
    const urls = [
      'https://example.com',
      'https://example.com/',
      'http://example.com:8080/a',
      'https://[2001:db8::1]:8443/a?b=c',
      'https://a.b.c.d.example.co.uk/x',
      'https://www.example.com/index.html',
      'https://example.com/a/b/c/',
      'https://example.com/?q=1',
      'https://example.com/#only-a-fragment',
      'https://example.com/a?b=1&c=2&d=3#frag',
      'https://example.com/~user/page',
      'https://example.com/a%2Fb%3Fc%3d',
      'https://example.com/caf%C3%A9?q=r%C3%A9sum%C3%A9',
      'https://example.com/CaseSensitive/PATH?Key=Value',
      'https://example.com/Menu/Cafe/The',
      'https://example.com/' + 'x'.repeat(300),
      'https://example.com/' + '0123456789abcdef'.repeat(40),
      'https://example.com/a?' + Array.from({ length: 30 }, (_, i) => `k${i}=v${i * 7}`).join('&'),
      'https://example.com/ünïcödé/路径?q=日本語',
      'https://example.com/a b?c=d e',
      'https://xn--mnchen-3ya.de/',
      'http://127.0.0.1:5186/r/menu-cafe',
      'https://example.com/!$&\'()*+,;=:@/[]|^',
      'https://example.com:65535/',
      'https://www.com/a',
      'https://www.www.example.com/a',
      'https://example.constructor/a',
      'https://example.com./x',
      'https://localhost/',
      'https://a/',
      'https://a-b.c-d.example.net/x',
    ];
    const wrong = urls.filter((url) => JSON.stringify(roundTrip(url)) !== JSON.stringify(same(url)));
    expect(wrong).toEqual([]);
  });

  test('random URLs built from every printable character round trip', () => {
    let seed = 99;
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const chars = Array.from({ length: 94 }, (_, i) => String.fromCharCode(0x21 + i)).filter((c) => c !== '#' && c !== '?');
    const wrong: string[] = [];
    for (let round = 0; round < 600; round++) {
      const pick = (n: number) => Array.from({ length: n }, () => chars[Math.floor(next() * chars.length)]).join('');
      const url = `https://${round % 3 === 0 ? 'www.' : ''}site${round % 7}.${['com', 'org', 'io', 'xyz'][round % 4]}/${encodeURI(pick(1 + Math.floor(next() * 40)))}?${pick(1 + Math.floor(next() * 20))}#${pick(Math.floor(next() * 10))}`;
      if (JSON.stringify(roundTrip(url)) !== JSON.stringify(same(url))) wrong.push(url);
    }
    expect(wrong).toEqual([]);
  });

  test('an empty ? or # carries nothing and is not kept', () => {
    expect(roundTrip('https://example.com/p?')).toEqual(same('https://example.com/p'));
    expect(roundTrip('https://example.com/p#')).toEqual(same('https://example.com/p'));
  });

  test('the same address always gives the same payload', () => {
    expect(encode('https://example.com/menu?table=4')).toBe(encode('https://example.com/menu?table=4'));
  });
});

describe('v1 payload layout', () => {
  test('is marked version 1: the lowest bits read 1 then 0', () => {
    for (const [, url] of qrCorpus) expect(stringToNumber(encode(url), outputAlphabetQR) & 3n).toBe(1n);
  });

  test('uses only characters from the output alphabet', () => {
    for (const [, url] of qrCorpus) expect([...encode(url)].every((c) => outputAlphabetQR.includes(c))).toBe(true);
  });

  test('is never decoded as a v0 payload by accident: v0 payloads are refused', () => {
    const v0 = compressV0('https://example.com/menu', outputAlphabetQR);
    expect(() => decompressV1(v0, outputAlphabetQR, model)).toThrow();
  });
});

describe('v1 refuses what it cannot represent or trust', () => {
  test('a path too long to be worth coding is declined rather than attempted', () => {
    expect(compressV1(new URL('https://example.com/' + 'x'.repeat(5000)), outputAlphabetQR, model)).toBe(null);
  });

  test('a host that v0 cannot spell is declined, not garbled', () => {
    expect(compressV1(new URL('https://example.__proto__/a'), outputAlphabetQR, model)).toBe(null);
    expect(compressV1(new URL('https://my_host.example.com/a'), outputAlphabetQR, model)).toBe(null);
  });

  test('data left over after a known domain means the payload is damaged', () => {
    // Extra bits above the host with every field below them intact. After a known domain there is nothing
    // left to read, so only the final check can see them. (A spelled host would read them as more letters.)
    const n = stringToNumber(encode('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), outputAlphabetQR);
    for (const extra of [1n, 2n, 3n, 5n]) {
      const damaged = numberToString(n + (extra << BigInt(n.toString(2).length)), outputAlphabetQR);
      expect(() => decompressV1(damaged, outputAlphabetQR, model)).toThrow();
    }
  });

  test('garbage never hangs or crashes, it either decodes to something or is refused', () => {
    let seed = 7;
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    let refused = 0;
    for (let round = 0; round < 400; round++) {
      const length = 1 + Math.floor(next() * 400);
      const garbage = '1' + Array.from({ length }, () => outputAlphabetQR[Math.floor(next() * outputAlphabetQR.length)]).join('');
      try {
        decompressV1(garbage, outputAlphabetQR, model);
      } catch (e) {
        if (!(e instanceof Error)) throw e;
        refused++;
      }
    }
    expect(refused > 0).toBe(true);
  });
});

describe('v1 padding', () => {
  test('an empty id run decodes to nothing, so one address has a different payload for every id set', () => {
    for (const url of ['https://example.com', 'https://example.com/menu', 'https://www.example.com/a/b?c=d#e', 'https://[2001:db8::1]:8443/a?b=c']) {
      const plain = encode(url);
      const padded = ID_SETS.map((_, set) => compressV1(new URL(url), outputAlphabetQR, model, set));
      for (const payload of padded) {
        expect(payload === null).toBe(false);
        expect(payload === plain).toBe(false);
        expect(JSON.stringify(same(decompressV1(payload!, outputAlphabetQR, model)))).toBe(JSON.stringify(same(url)));
      }
      expect(new Set(padded).size).toBe(ID_SETS.length);
    }
  });
});
