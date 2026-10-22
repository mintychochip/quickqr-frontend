import { LIMITS, UnreadableImage, type Raster } from './raster';

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const VALID_DEPTHS: Record<number, number[]> = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
const ADAM7 = [
  { x: 0, y: 0, dx: 8, dy: 8 },
  { x: 4, y: 0, dx: 8, dy: 8 },
  { x: 0, y: 4, dx: 4, dy: 8 },
  { x: 2, y: 0, dx: 4, dy: 4 },
  { x: 0, y: 2, dx: 2, dy: 4 },
  { x: 1, y: 0, dx: 2, dy: 2 },
  { x: 0, y: 1, dx: 1, dy: 2 },
];

export function isPng(bytes: Uint8Array): boolean {
  return SIGNATURE.every((byte, i) => bytes[i] === byte);
}

interface Header {
  width: number;
  height: number;
  depth: number;
  colorType: number;
  interlaced: boolean;
}

interface Chunks {
  header: Header;
  palette: Uint8Array | null;
  transparency: Uint8Array | null;
  data: Uint8Array;
}

function readChunks(bytes: Uint8Array): Chunks {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let header: Header | null = null;
  let palette: Uint8Array | null = null;
  let transparency: Uint8Array | null = null;
  const parts: Uint8Array[] = [];
  let ended = false;
  for (let at = 8; at + 8 <= bytes.length && !ended; ) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const body = bytes.subarray(at + 8, at + 8 + length);
    if (body.length !== length) throw new UnreadableImage('truncated PNG chunk');
    at += 12 + length;
    if (type === 'IHDR') {
      if (length !== 13) throw new UnreadableImage('bad PNG header');
      const depth = body[8] ?? 0;
      const colorType = body[9] ?? -1;
      if (!VALID_DEPTHS[colorType]?.includes(depth) || body[10] !== 0 || body[11] !== 0 || (body[12] ?? 2) > 1) throw new UnreadableImage('unsupported PNG');
      const dimensions = new DataView(body.buffer, body.byteOffset, body.byteLength);
      header = { width: dimensions.getUint32(0), height: dimensions.getUint32(4), depth, colorType, interlaced: body[12] === 1 };
      if (header.width === 0 || header.height === 0) throw new UnreadableImage('empty PNG');
    } else if (!header) {
      throw new UnreadableImage('PNG chunk before header');
    } else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') transparency = body;
    else if (type === 'IDAT') parts.push(body);
    else if (type === 'IEND') ended = true;
  }
  if (!header || parts.length === 0) throw new UnreadableImage('PNG has no image data');
  const data = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    data.set(part, offset);
    offset += part.length;
  }
  return { header, palette, transparency, data };
}

/** The bytes the filtered scanlines of every pass add up to, which is how much a valid image inflates to. */
function rawLength(h: Header): number {
  const bitsPerPixel = (CHANNELS[h.colorType] ?? 1) * h.depth;
  const rows = (w: number, rowsInPass: number): number => (w === 0 || rowsInPass === 0 ? 0 : rowsInPass * (1 + Math.ceil((w * bitsPerPixel) / 8)));
  if (!h.interlaced) return rows(h.width, h.height);
  return ADAM7.reduce((sum, p) => sum + rows(Math.ceil((h.width - p.x) / p.dx), Math.ceil((h.height - p.y) / p.dy)), 0);
}

/** Inflates, but stops reading once `limit` bytes are out: a few bytes of zlib can claim gigabytes, and this runs on someone else's upload. */
async function inflate(data: Uint8Array, limit: number): Promise<Uint8Array> {
  const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  const out = new Uint8Array(limit);
  let length = 0;
  try {
    while (length < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      out.set(value.subarray(0, limit - length), length);
      length += value.length;
    }
  } catch {
    throw new UnreadableImage('PNG data is corrupt');
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  if (length < limit) throw new UnreadableImage('PNG data is short');
  return out;
}

function unfilter(raw: Uint8Array, start: number, rows: number, stride: number, bpp: number): Uint8Array {
  const out = new Uint8Array(rows * stride);
  for (let y = 0; y < rows; y++) {
    const filter = raw[start + y * (stride + 1)] ?? 0;
    const src = start + y * (stride + 1) + 1;
    const dst = y * stride;
    const up = dst - stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i] ?? 0;
      const left = i >= bpp ? (out[dst + i - bpp] ?? 0) : 0;
      const above = y > 0 ? (out[up + i] ?? 0) : 0;
      const aboveLeft = y > 0 && i >= bpp ? (out[up + i - bpp] ?? 0) : 0;
      let value: number;
      switch (filter) {
        case 0:
          value = x;
          break;
        case 1:
          value = x + left;
          break;
        case 2:
          value = x + above;
          break;
        case 3:
          value = x + ((left + above) >> 1);
          break;
        case 4: {
          const p = left + above - aboveLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - above);
          const pc = Math.abs(p - aboveLeft);
          value = x + (pa <= pb && pa <= pc ? left : pb <= pc ? above : aboveLeft);
          break;
        }
        default:
          throw new UnreadableImage('bad PNG filter');
      }
      out[dst + i] = value & 0xff;
    }
  }
  return out;
}

/** The pixel at `index` of an unfiltered row as up to four 8-bit channels written to rgba[at..at+3]. */
function pixelWriter(chunks: Chunks): (row: Uint8Array, index: number, rgba: Uint8ClampedArray, at: number) => void {
  const { depth, colorType } = chunks.header;
  const { palette, transparency } = chunks;
  const max = (1 << depth) - 1;
  const sample = (row: Uint8Array, n: number): number => {
    if (depth === 8) return row[n] ?? 0;
    if (depth === 16) return row[n * 2] ?? 0; // the high byte is what an 8-bit reading keeps
    const bit = n * depth;
    return ((row[bit >> 3] ?? 0) >> (8 - depth - (bit & 7))) & max;
  };
  const scale = (value: number): number => (depth >= 8 ? value : Math.round((value * 255) / max));
  const rawSample = (row: Uint8Array, n: number): number => (depth === 16 ? ((row[n * 2] ?? 0) << 8) | (row[n * 2 + 1] ?? 0) : sample(row, n));
  const keyed = (values: number[]): number[] | null => (transparency && transparency.length >= values.length * 2 ? values.map((_, i) => ((transparency[i * 2] ?? 0) << 8) | (transparency[i * 2 + 1] ?? 0)) : null);
  const key = colorType === 0 ? keyed([0]) : colorType === 2 ? keyed([0, 0, 0]) : null;

  return (row, index, rgba, at) => {
    switch (colorType) {
      case 0: {
        const g = scale(sample(row, index));
        rgba[at] = rgba[at + 1] = rgba[at + 2] = g;
        rgba[at + 3] = key && rawSample(row, index) === key[0] ? 0 : 255;
        break;
      }
      case 2: {
        rgba[at] = sample(row, index * 3);
        rgba[at + 1] = sample(row, index * 3 + 1);
        rgba[at + 2] = sample(row, index * 3 + 2);
        rgba[at + 3] = key && [0, 1, 2].every((c) => rawSample(row, index * 3 + c) === key[c]) ? 0 : 255;
        break;
      }
      case 3: {
        const entry = sample(row, index);
        rgba[at] = palette?.[entry * 3] ?? 0;
        rgba[at + 1] = palette?.[entry * 3 + 1] ?? 0;
        rgba[at + 2] = palette?.[entry * 3 + 2] ?? 0;
        rgba[at + 3] = transparency?.[entry] ?? 255;
        break;
      }
      case 4: {
        const g = sample(row, index * 2);
        rgba[at] = rgba[at + 1] = rgba[at + 2] = g;
        rgba[at + 3] = sample(row, index * 2 + 1);
        break;
      }
      default:
        rgba[at] = sample(row, index * 4);
        rgba[at + 1] = sample(row, index * 4 + 1);
        rgba[at + 2] = sample(row, index * 4 + 2);
        rgba[at + 3] = sample(row, index * 4 + 3);
    }
  };
}

/**
 * Reads a PNG into pixels. Throws UnreadableImage for a damaged one; null for one over the pixel cap. Every color type
 * and bit depth is handled, with Adam7 interlacing and tRNS transparency.
 */
export async function decodePng(bytes: Uint8Array): Promise<Raster | null> {
  if (!isPng(bytes)) throw new UnreadableImage('not a PNG');
  const chunks = readChunks(bytes);
  const { width, height, depth, colorType, interlaced } = chunks.header;
  const expected = rawLength(chunks.header);
  if (expected > LIMITS.pngRawBytes) return null;
  if (colorType === 3 && !chunks.palette) throw new UnreadableImage('PNG has no palette');

  const raw = await inflate(chunks.data, expected);
  const bitsPerPixel = (CHANNELS[colorType] ?? 1) * depth;
  const bpp = Math.max(1, bitsPerPixel >> 3);
  const write = pixelWriter(chunks);
  const rgba = new Uint8ClampedArray(width * height * 4);

  const passes = interlaced ? ADAM7 : [{ x: 0, y: 0, dx: 1, dy: 1 }];
  let offset = 0;
  for (const pass of passes) {
    const passWidth = Math.ceil((width - pass.x) / pass.dx);
    const passHeight = Math.ceil((height - pass.y) / pass.dy);
    if (passWidth <= 0 || passHeight <= 0) continue;
    const stride = Math.ceil((passWidth * bitsPerPixel) / 8);
    const rows = unfilter(raw, offset, passHeight, stride, bpp);
    offset += passHeight * (stride + 1);
    for (let py = 0; py < passHeight; py++) {
      const row = rows.subarray(py * stride, (py + 1) * stride);
      const y = pass.y + py * pass.dy;
      for (let px = 0; px < passWidth; px++) write(row, px, rgba, (y * width + pass.x + px * pass.dx) * 4);
    }
  }
  return { width, height, rgba };
}
