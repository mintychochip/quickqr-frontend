import { LIMITS, UnreadableImage, type Raster } from './raster';

export function isGif(bytes: Uint8Array): boolean {
  const head = String.fromCharCode(...bytes.subarray(0, 6));
  return head === 'GIF87a' || head === 'GIF89a';
}

/** Joins a run of GIF data sub-blocks (length byte, then that many bytes, ended by a zero length) and says where it ended. */
function readSubBlocks(bytes: Uint8Array, start: number): { data: Uint8Array; end: number } {
  const parts: Uint8Array[] = [];
  let at = start;
  for (;;) {
    const length = bytes[at];
    if (length === undefined) throw new UnreadableImage('truncated GIF');
    at++;
    if (length === 0) break;
    if (at + length > bytes.length) throw new UnreadableImage('truncated GIF');
    parts.push(bytes.subarray(at, at + length));
    at += length;
  }
  const data = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    data.set(part, offset);
    offset += part.length;
  }
  return { data, end: at };
}

/** GIF's variable-width LZW. Stops at the end code or when the picture is full; a stream that ends early leaves the rest at index 0. */
function lzw(data: Uint8Array, minCodeSize: number, pixels: number): Uint8Array {
  if (minCodeSize < 2 || minCodeSize > 8) throw new UnreadableImage('bad GIF code size');
  const out = new Uint8Array(pixels);
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  const prefix = new Int16Array(4096);
  const suffix = new Uint8Array(4096);
  const stack = new Uint8Array(4097);
  let codeSize = minCodeSize + 1;
  let next = end + 1;
  let previous = -1;
  let first = 0;
  let written = 0;
  let bits = 0;
  let bitCount = 0;
  let at = 0;
  for (let i = 0; i < clear; i++) suffix[i] = i;

  while (written < pixels) {
    while (bitCount < codeSize) {
      if (at >= data.length) return out;
      bits |= (data[at++] ?? 0) << bitCount;
      bitCount += 8;
    }
    let code = bits & ((1 << codeSize) - 1);
    bits >>= codeSize;
    bitCount -= codeSize;

    if (code === clear) {
      codeSize = minCodeSize + 1;
      next = end + 1;
      previous = -1;
      continue;
    }
    if (code === end) break;
    if (previous === -1) {
      if (code >= clear) throw new UnreadableImage('bad GIF data');
      out[written++] = code;
      previous = code;
      first = code;
      continue;
    }

    const incoming = code;
    let top = 0;
    if (code >= next) {
      if (code > next) throw new UnreadableImage('bad GIF data');
      stack[top++] = first;
      code = previous;
    }
    while (code >= clear) {
      stack[top++] = suffix[code] ?? 0;
      code = prefix[code] ?? 0;
    }
    first = suffix[code] ?? 0;
    stack[top++] = first;
    if (next < 4096) {
      prefix[next] = previous;
      suffix[next] = first;
      next++;
      if (next === 1 << codeSize && codeSize < 12) codeSize++;
    }
    previous = incoming;
    while (top > 0 && written < pixels) out[written++] = stack[--top] ?? 0;
  }
  return out;
}

/**
 * The first frame of a GIF, as Go's image package reads it: the frame's own rectangle, with the transparent color
 * clear. Throws UnreadableImage for a damaged one; null for one over the pixel cap.
 */
export function decodeGif(bytes: Uint8Array): Raster | null {
  if (!isGif(bytes) || bytes.length < 13) throw new UnreadableImage('not a GIF');
  const flags = bytes[10] ?? 0;
  let at = 13;
  let globalTable: Uint8Array | null = null;
  if (flags & 0x80) {
    const size = 3 * (1 << ((flags & 7) + 1));
    globalTable = bytes.subarray(at, at + size);
    if (globalTable.length < size) throw new UnreadableImage('truncated GIF');
    at += size;
  }

  let transparent = -1;
  while (at < bytes.length) {
    const block = bytes[at++];
    if (block === 0x3b) break;
    if (block === 0x21) {
      const label = bytes[at++];
      if (label === 0xf9 && (bytes[at] ?? 0) >= 4) {
        if ((bytes[at + 1] ?? 0) & 1) transparent = bytes[at + 4] ?? -1;
      }
      at = readSubBlocks(bytes, at).end;
      continue;
    }
    if (block !== 0x2c) throw new UnreadableImage('bad GIF block');

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (at + 9 > bytes.length) throw new UnreadableImage('truncated GIF');
    const width = view.getUint16(at + 4, true);
    const height = view.getUint16(at + 6, true);
    const packed = bytes[at + 8] ?? 0;
    at += 9;
    if (width === 0 || height === 0) throw new UnreadableImage('empty GIF frame');
    if (width * height > LIMITS.gifPixels) return null;

    let table = globalTable;
    if (packed & 0x80) {
      const size = 3 * (1 << ((packed & 7) + 1));
      table = bytes.subarray(at, at + size);
      if (table.length < size) throw new UnreadableImage('truncated GIF');
      at += size;
    }
    if (!table) throw new UnreadableImage('GIF has no color table');

    const minCodeSize = bytes[at++];
    if (minCodeSize === undefined) throw new UnreadableImage('truncated GIF');
    const indices = lzw(readSubBlocks(bytes, at).data, minCodeSize, width * height);

    const rowFor = (y: number): number => {
      if (!(packed & 0x40)) return y;
      const quarter = Math.ceil(height / 8);
      const half = quarter + Math.ceil((height - 4) / 8);
      const third = half + Math.ceil((height - 2) / 4);
      if (y < quarter) return y * 8;
      if (y < half) return (y - quarter) * 8 + 4;
      if (y < third) return (y - half) * 4 + 2;
      return (y - third) * 2 + 1;
    };
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      const target = rowFor(y);
      for (let x = 0; x < width; x++) {
        const index = indices[y * width + x] ?? 0;
        const out = (target * width + x) * 4;
        rgba[out] = table[index * 3] ?? 0;
        rgba[out + 1] = table[index * 3 + 1] ?? 0;
        rgba[out + 2] = table[index * 3 + 2] ?? 0;
        rgba[out + 3] = index === transparent ? 0 : 255;
      }
    }
    return { width, height, rgba };
  }
  throw new UnreadableImage('GIF has no image');
}
