import { outputAlphabetQR } from './alphabets';
import { compress as compressV0 } from './compression/v0.js';
import { dynamicCodeFromQrPayload, staticDestinationFromQrPayload } from './dynamicQr';

/**
 * A payload can start with `/`, which puts `//` after the host. The encoder no longer prints those, but codes
 * made before that rule exist on paper, and only the slash between the host and the payload is not part of it.
 */
describe('a payload that starts with /', () => {
  function firstWithLeadingSlash(address: (i: number) => string): { address: string; payload: string } {
    for (let i = 0; i < 4000; i++) {
      const payload = compressV0(address(i), outputAlphabetQR);
      if (payload.startsWith('/')) return { address: address(i), payload };
    }
    throw new Error('no address with such a payload in 4000 tries');
  }

  test('a static code still opens its destination', () => {
    const { address, payload } = firstWithLeadingSlash((i) => `https://example.com/page${i}`);
    expect(staticDestinationFromQrPayload(`HTTPS://QUICKQR.APP/${payload}`)).toBe(new URL(address).toString());
  });

  test('a dynamic short link still opens its code', () => {
    const { address, payload } = firstWithLeadingSlash((i) => `https://quickqr.app/r/code-${i}`);
    expect(dynamicCodeFromQrPayload(`HTTPS://QUICKQR.APP/${payload}`)).toBe(address.split('/r/')[1]);
  });
});
