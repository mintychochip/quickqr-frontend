/**
 * Printed codes never expire. Every payload in the two vector files was produced by a shipped encoder (v0 is the
 * original format; v1 is this project's) and recorded together with what it decoded to. Whatever the compressor
 * becomes, these must keep decoding to exactly the same URLs. The Go decoder is held to the same files.
 */
import vectorsV0 from './vectors-v0.json';
import vectorsV1 from './vectors-v1.json';
import { outputAlphabetQR } from '../alphabets';
import { decompress } from './index';

type Vector = { payload: string; decoded: string };

function mismatches(vectors: readonly Vector[]) {
  return vectors.map((v) => ({ payload: v.payload, want: v.decoded, got: decompress(v.payload, outputAlphabetQR) })).filter((r) => r.got !== r.want);
}

describe('payloads printed by the original (v0) encoder', () => {
  test('there are enough of them to mean something', () => {
    expect(vectorsV0.length >= 200).toBe(true);
  });

  test('every recorded payload still decodes to exactly what it decoded to when it was printed', () => {
    expect(mismatches(vectorsV0)).toEqual([]);
  });
});

describe('payloads printed by the v1 encoder', () => {
  test('there are enough of them to mean something', () => {
    expect(vectorsV1.length >= 600).toBe(true);
  });

  test('every recorded payload still decodes to exactly what it decoded to when it was printed', () => {
    expect(mismatches(vectorsV1)).toEqual([]);
  });
});
