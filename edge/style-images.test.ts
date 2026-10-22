import { describe, expect, test } from 'bun:test';
import { deflateSync } from 'node:zlib';
import { decodeRaster, UnreadableImage } from './style/images';
import { decodeGif } from './style/images/gif';
import { decodeJpeg } from './style/images/jpeg';
import { decodePng } from './style/images/png';
import { LIMITS } from './style/images/raster';
import vectors from './test/image-vectors.json';
import { encodePng, expectedRgba, type PngSpec } from './test/png';

const bytesOf = (data: string): Uint8Array => Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
const asArray = (pixels: Uint8ClampedArray): number[] => Array.from(pixels);

/** Deterministic pseudo-random samples, so a failure reproduces. */
function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function specFor(colorType: PngSpec['colorType'], depth: PngSpec['depth'], width: number, height: number, seed: number, extra: Partial<PngSpec> = {}): PngSpec {
  const random = rng(seed);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const palette: [number, number, number][] = Array.from({ length: 1 << Math.min(depth, 8) }, () => [Math.floor(random() * 256), Math.floor(random() * 256), Math.floor(random() * 256)]);
  const samples = Array.from({ length: height }, () =>
    Array.from({ length: width * channels }, () => Math.floor(random() * (colorType === 3 ? palette.length : 2 ** depth))),
  );
  return { width, height, colorType, depth, samples, ...(colorType === 3 ? { palette } : {}), ...extra };
}

describe('PNG, against pictures made by other encoders', () => {
  test.each(vectors.png)('$name', async (f) => {
    const raster = await decodePng(bytesOf(f.data));
    expect(raster).not.toBeNull();
    expect([raster?.width, raster?.height]).toEqual([f.width, f.height]);
    expect(asArray(raster?.rgba ?? new Uint8ClampedArray())).toEqual(Array.from(bytesOf(f.rgba)));
  });
});

describe('PNG, against pixels we chose', () => {
  const combos: [PngSpec['colorType'], PngSpec['depth']][] = [
    [0, 1], [0, 2], [0, 4], [0, 8], [0, 16],
    [2, 8], [2, 16],
    [3, 1], [3, 2], [3, 4], [3, 8],
    [4, 8], [4, 16],
    [6, 8], [6, 16],
  ];

  test.each(combos)('color type %i at %i bits, with each row filtered a different way', async (colorType, depth) => {
    const spec = specFor(colorType, depth, 13, 11, colorType * 100 + depth, { filters: [0, 1, 2, 3, 4] });
    const raster = await decodePng(encodePng(spec));
    expect(asArray(raster?.rgba ?? new Uint8ClampedArray())).toEqual(Array.from(expectedRgba(spec)));
  });

  test.each(combos)('color type %i at %i bits, interlaced', async (colorType, depth) => {
    for (const [width, height] of [[13, 11], [1, 1], [2, 9], [9, 2], [8, 8]] as const) {
      const spec = specFor(colorType, depth, width, height, width * 31 + height, { interlace: true, filters: [4, 3, 2, 1, 0] });
      const raster = await decodePng(encodePng(spec));
      expect([width, height, asArray(raster?.rgba ?? new Uint8ClampedArray())]).toEqual([width, height, Array.from(expectedRgba(spec))]);
    }
  });

  test('transparency: palette alpha, and the one transparent color of gray and RGB', async () => {
    const palette = specFor(3, 8, 6, 4, 1, { transparency: [0, 64, 128, 255] });
    palette.samples = palette.samples.map((row) => row.map((v) => v % 6));
    expect(asArray((await decodePng(encodePng(palette)))?.rgba ?? new Uint8ClampedArray())).toEqual(Array.from(expectedRgba(palette)));

    for (const depth of [1, 8, 16] as const) {
      const gray = specFor(0, depth, 8, 5, depth, { transparency: [0] });
      gray.samples[0] = gray.samples[0]?.map(() => 0) ?? [];
      const got = asArray((await decodePng(encodePng(gray)))?.rgba ?? new Uint8ClampedArray());
      expect(got).toEqual(Array.from(expectedRgba(gray)));
      expect(got[3]).toBe(0);
    }
    const rgb = specFor(2, 16, 5, 5, 3, { transparency: [1000, 2000, 3000] });
    rgb.samples[1] = [1000, 2000, 3000, ...(rgb.samples[1]?.slice(3) ?? [])];
    const got = asArray((await decodePng(encodePng(rgb)))?.rgba ?? new Uint8ClampedArray());
    expect(got).toEqual(Array.from(expectedRgba(rgb)));
    expect(got[5 * 4 + 3]).toBe(0);
  });

  test('a picture over the pixel cap is not decoded, and its data is never inflated', async () => {
    const spec = specFor(6, 8, 4, 4, 1);
    const png = encodePng(spec);
    const view = new DataView(png.buffer, png.byteOffset);
    view.setUint32(16, 5000); // IHDR width
    view.setUint32(20, 5000); // IHDR height
    expect(await decodePng(png)).toBeNull();
  });

  test('a few bytes that claim to be gigabytes are cut off, not inflated', async () => {
    const spec = specFor(0, 8, 100, 100, 5);
    const png = encodePng(spec);
    // Replace the IDAT body with 80 MB of zeros, compressed to a few tens of KB.
    const bomb = deflateSync(Buffer.alloc(80_000_000));
    const idatStart = png.findIndex((_, i) => i > 8 && String.fromCharCode(...png.subarray(i, i + 4)) === 'IDAT') - 4;
    const head = png.subarray(0, idatStart);
    const tail = encodePng({ ...spec, width: 1, height: 1, samples: [[0]] }).subarray(-12); // IEND
    const body = new Uint8Array(12 + bomb.length);
    new DataView(body.buffer).setUint32(0, bomb.length);
    body.set(new TextEncoder().encode('IDAT'), 4);
    body.set(bomb, 8);
    const out = new Uint8Array(head.length + body.length + tail.length);
    out.set(head);
    out.set(body, head.length);
    out.set(tail, head.length + body.length);
    const started = performance.now();
    const raster = await decodePng(out);
    expect(raster?.width).toBe(100);
    expect(performance.now() - started).toBeLessThan(1000);
  });

  test('damage is reported as unreadable, not guessed at', async () => {
    const good = encodePng(specFor(2, 8, 10, 10, 9));
    await expect(decodePng(good.subarray(0, 20))).rejects.toThrow(UnreadableImage); // cut inside the header
    await expect(decodePng(good.subarray(0, good.length - 30))).rejects.toThrow(UnreadableImage); // cut inside the data
    await expect(decodePng(new Uint8Array(40))).rejects.toThrow(UnreadableImage); // no signature
    const noData = good.slice();
    noData.set(new TextEncoder().encode('JUNK'), noData.findIndex((_, i) => String.fromCharCode(...noData.subarray(i, i + 4)) === 'IDAT'));
    await expect(decodePng(noData)).rejects.toThrow(UnreadableImage);
    const badFilter = encodePng(specFor(0, 8, 4, 4, 2, { filters: [9] }));
    await expect(decodePng(badFilter)).rejects.toThrow(UnreadableImage);
    const badTable = good.slice();
    badTable[9 + 8 + 3] = 0; // IHDR width -> 0 for the low byte, then a zero height below
    new DataView(badTable.buffer).setUint32(16, 0);
    await expect(decodePng(badTable)).rejects.toThrow(UnreadableImage);
  });
});

describe('GIF', () => {
  test.each(vectors.gif)('$name matches the pixels another decoder reads', (f) => {
    const raster = decodeGif(bytesOf(f.data));
    expect([raster?.width, raster?.height]).toEqual([f.width, f.height]);
    expect(asArray(raster?.rgba ?? new Uint8ClampedArray())).toEqual(Array.from(bytesOf(f.rgba)));
  });

  test('a frame over the pixel cap is not decoded', () => {
    const header = [...new TextEncoder().encode('GIF89a'), 0xd0, 0x07, 0xd0, 0x07, 0x80, 0, 0]; // 2000 x 2000, a global table of 2
    const frame = [0x2c, 0, 0, 0, 0, 0xd0, 0x07, 0xd0, 0x07, 0]; // 2000 x 2000 at the origin
    expect(decodeGif(new Uint8Array([...header, 0, 0, 0, 255, 255, 255, ...frame, 2, 0, 0x3b]))).toBeNull();
    const fits = [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0]; // 1 x 1
    expect(decodeGif(new Uint8Array([...header, 0, 0, 0, 255, 255, 255, ...fits, 2, 2, 0x44, 0x01, 0, 0x3b]))).not.toBeNull();
  });

  test('damage is reported as unreadable', () => {
    const good = bytesOf(vectors.gif.find((f) => f.name === 'noise-256.gif')?.data ?? '');
    expect(() => decodeGif(good.subarray(0, 8))).toThrow(UnreadableImage);
    expect(() => decodeGif(good.subarray(0, 300))).toThrow(UnreadableImage);
    expect(() => decodeGif(new TextEncoder().encode('GIF89a'))).toThrow(UnreadableImage);
    const noImage = new Uint8Array([...new TextEncoder().encode('GIF89a'), 1, 0, 1, 0, 0, 0, 0, 0x3b]);
    expect(() => decodeGif(noImage)).toThrow(UnreadableImage);
  });
});

describe('JPEG', () => {
  const readable = vectors.jpeg.filter((f) => f.expected);
  const skipped = vectors.jpeg.filter((f) => !f.expected);

  test.each(readable)('$name reads as the average of each 8-by-8 block of the full decode', (f) => {
    const raster = decodeJpeg(bytesOf(f.data));
    const want = f.expected;
    if (!raster || !want) throw new Error('expected a picture');
    expect([raster.width, raster.height]).toEqual([want.width, want.height]);
    const expected = bytesOf(want.rgb);
    let worst = 0;
    for (let i = 0; i < raster.width * raster.height; i++) {
      for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs((raster.rgba[i * 4 + c] ?? 0) - (expected[i * 3 + c] ?? 0)));
      expect(raster.rgba[i * 4 + 3]).toBe(255);
    }
    // Rounding and color clipping leave a level or two. Pictures that end inside an MCU are padded by the encoder in a way
    // the oracle only approximates. A block read from the wrong place would be off by tens.
    const partialMcu = f.name.startsWith('odd-size') || f.name === 'tiny.jpg';
    expect(worst).toBeLessThanOrEqual(partialMcu ? 6 : 4);
  });

  test.each(skipped)('$name is accepted but not read here', (f) => {
    expect(decodeJpeg(bytesOf(f.data))).toBeNull();
  });

  test('a file over the size cap is not read, however small its picture', () => {
    const small = bytesOf(vectors.jpeg[0]?.data ?? '');
    const padded = new Uint8Array(LIMITS.jpegBytes + 1);
    padded.set(small);
    expect(decodeJpeg(padded)).toBeNull();
  });

  test('damage is reported as unreadable', () => {
    const good = bytesOf(vectors.jpeg.find((f) => f.name === '420.jpg')?.data ?? '');
    expect(() => decodeJpeg(good.subarray(0, 100))).toThrow(UnreadableImage); // cut inside the tables
    expect(() => decodeJpeg(good.subarray(0, Math.floor(good.length / 2)))).toThrow(UnreadableImage); // cut inside the picture
    expect(() => decodeJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toThrow(UnreadableImage); // no frame
    expect(() => decodeJpeg(new Uint8Array(20))).toThrow(UnreadableImage);
  });

  test('a header that claims a huge picture with little data is refused before anything is allocated for it', () => {
    const good = bytesOf(vectors.jpeg.find((f) => f.name === '420.jpg')?.data ?? '').slice();
    const sof = good.findIndex((b, i) => b === 0xff && good[i + 1] === 0xc0);
    new DataView(good.buffer).setUint16(sof + 5, 65535); // height
    new DataView(good.buffer).setUint16(sof + 7, 65535); // width
    expect(() => decodeJpeg(good)).toThrow('JPEG is larger than its data');
  });
});

describe('any format', () => {
  test('is told apart by its first bytes, and anything else is unreadable', async () => {
    expect((await decodeRaster(bytesOf(vectors.png[0]?.data ?? '')))?.width).toBe(vectors.png[0]?.width);
    expect((await decodeRaster(bytesOf(vectors.gif[0]?.data ?? '')))?.width).toBe(vectors.gif[0]?.width);
    expect((await decodeRaster(bytesOf(vectors.jpeg[0]?.data ?? '')))?.width).toBeGreaterThan(0);
    await expect(decodeRaster(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).rejects.toThrow(UnreadableImage);
    await expect(decodeRaster(new Uint8Array(0))).rejects.toThrow(UnreadableImage);
  });
});
