import { deflateSync } from 'node:zlib';

/** A PNG described by the samples a viewer should see: the decoder's tests encode these and expect them back. */
export interface PngSpec {
  width: number;
  height: number;
  colorType: 0 | 2 | 3 | 4 | 6;
  depth: 1 | 2 | 4 | 8 | 16;
  /** samples[y][x * channels + c], each within the depth's range. */
  samples: number[][];
  palette?: [number, number, number][];
  /** Palette alpha (type 3), or the one color in tRNS (types 0 and 2) as raw sample values. */
  transparency?: number[];
  /** The filter type for each row, repeating. */
  filters?: number[];
  interlace?: boolean;
}

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as const;
const ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
] as const;

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: Uint8Array): number => (bytes.reduce((crc, byte) => (CRC[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;

function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, body.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(body, 8);
  view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
  return out;
}

/** The samples of one row packed the way PNG stores them. */
function pack(samples: number[], depth: number): Uint8Array {
  if (depth === 16) return Uint8Array.from(samples.flatMap((v) => [v >> 8, v & 255]));
  if (depth === 8) return Uint8Array.from(samples);
  const out = new Uint8Array(Math.ceil((samples.length * depth) / 8));
  samples.forEach((v, i) => {
    const bit = i * depth;
    out[bit >> 3] = (out[bit >> 3] ?? 0) | (v << (8 - depth - (bit & 7)));
  });
  return out;
}

const paeth = (a: number, b: number, c: number): number => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

function filterRows(rows: Uint8Array[], bpp: number, filters: number[]): Uint8Array {
  const stride = rows[0]?.length ?? 0;
  const out = new Uint8Array(rows.length * (stride + 1));
  rows.forEach((row, y) => {
    const type = filters[y % filters.length] ?? 0;
    const above = rows[y - 1];
    const start = y * (stride + 1);
    out[start] = type;
    for (let i = 0; i < stride; i++) {
      const x = row[i] ?? 0;
      const left = i >= bpp ? (row[i - bpp] ?? 0) : 0;
      const up = above ? (above[i] ?? 0) : 0;
      const upLeft = above && i >= bpp ? (above[i - bpp] ?? 0) : 0;
      const predicted = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][type] ?? 0;
      out[start + 1 + i] = (x - predicted) & 255;
    }
  });
  return out;
}

export function encodePng(spec: PngSpec): Uint8Array {
  const channels = CHANNELS[spec.colorType];
  const bpp = Math.max(1, (channels * spec.depth) >> 3);
  const filters = spec.filters ?? [0];
  const passes = spec.interlace ? ADAM7 : ([[0, 0, 1, 1]] as const);
  const parts: Uint8Array[] = [];
  for (const [x0, y0, dx, dy] of passes) {
    const rows: Uint8Array[] = [];
    for (let y = y0; y < spec.height; y += dy) {
      const samples: number[] = [];
      for (let x = x0; x < spec.width; x += dx) for (let c = 0; c < channels; c++) samples.push(spec.samples[y]?.[x * channels + c] ?? 0);
      if (samples.length > 0) rows.push(pack(samples, spec.depth));
    }
    if (rows.length > 0) parts.push(filterRows(rows, bpp, filters));
  }
  const raw = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let at = 0;
  for (const part of parts) {
    raw.set(part, at);
    at += part.length;
  }

  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, spec.width);
  view.setUint32(4, spec.height);
  header.set([spec.depth, spec.colorType, 0, 0, spec.interlace ? 1 : 0], 8);
  const trns = ((): Uint8Array | null => {
    if (!spec.transparency) return null;
    if (spec.colorType === 3) return Uint8Array.from(spec.transparency);
    return Uint8Array.from(spec.transparency.flatMap((v) => [v >> 8, v & 255]));
  })();
  const pieces = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    ...(spec.palette ? [chunk('PLTE', Uint8Array.from(spec.palette.flat()))] : []),
    ...(trns ? [chunk('tRNS', trns)] : []),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(pieces.reduce((sum, p) => sum + p.length, 0));
  at = 0;
  for (const piece of pieces) {
    out.set(piece, at);
    at += piece.length;
  }
  return out;
}

/** What a viewer shows for the spec, worked out straight from its definition. */
export function expectedRgba(spec: PngSpec): Uint8ClampedArray {
  const channels = CHANNELS[spec.colorType];
  const max = (1 << spec.depth) - 1;
  const eight = (v: number): number => (spec.depth === 16 ? v >> 8 : spec.depth === 8 ? v : Math.round((v * 255) / max));
  const out = new Uint8ClampedArray(spec.width * spec.height * 4);
  for (let y = 0; y < spec.height; y++) {
    for (let x = 0; x < spec.width; x++) {
      const s = (c: number): number => spec.samples[y]?.[x * channels + c] ?? 0;
      const at = (y * spec.width + x) * 4;
      let pixel: number[];
      switch (spec.colorType) {
        case 0:
          pixel = [eight(s(0)), eight(s(0)), eight(s(0)), spec.transparency?.[0] === s(0) ? 0 : 255];
          break;
        case 2:
          pixel = [eight(s(0)), eight(s(1)), eight(s(2)), spec.transparency && [0, 1, 2].every((c) => spec.transparency?.[c] === s(c)) ? 0 : 255];
          break;
        case 3:
          pixel = [...(spec.palette?.[s(0)] ?? [0, 0, 0]), spec.transparency?.[s(0)] ?? 255];
          break;
        case 4:
          pixel = [eight(s(0)), eight(s(0)), eight(s(0)), eight(s(1))];
          break;
        default:
          pixel = [eight(s(0)), eight(s(1)), eight(s(2)), eight(s(3))];
      }
      out.set(pixel, at);
    }
  }
  return out;
}
