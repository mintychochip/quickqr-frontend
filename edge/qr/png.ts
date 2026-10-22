import { IMAGE_SIZE, QUIET_ZONE } from './svg';
import type { Matrix } from './matrix';

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(parts: Uint8Array[]): number {
  let crc = 0xffffffff;
  for (const part of parts) for (const byte of part) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length);
  const view = new DataView(out.buffer);
  const name = new TextEncoder().encode(type);
  view.setUint32(0, body.length);
  out.set(name, 4);
  out.set(body, 8);
  view.setUint32(8 + body.length, crc32([name, body]));
  return out;
}

async function deflate(raw: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * The code as a 1024 by 1024, 1-bit grey PNG (0 is black). A module covers the pixels from `m * 1024 / total` to
 * `(m + 1) * 1024 / total`, as the Go renderer drew it, so modules differ by a pixel in width and none is blurred.
 * Rows that fall inside one module row are identical, so each distinct row is built once.
 */
export async function renderPng(code: Matrix): Promise<Uint8Array> {
  const total = code.size + QUIET_ZONE * 2;
  const rowBytes = IMAGE_SIZE / 8;
  const edge = (m: number): number => Math.floor((m * IMAGE_SIZE) / total);

  const raw = new Uint8Array(IMAGE_SIZE * (rowBytes + 1));
  let previous = -1;
  let rowStart = 0;
  for (let py = 0; py < IMAGE_SIZE; py++) {
    // The module row this pixel row belongs to: the largest m with edge(m) <= py.
    let m = Math.floor((py * total) / IMAGE_SIZE);
    while (edge(m + 1) <= py) m++;
    while (edge(m) > py) m--;
    const start = py * (rowBytes + 1);
    if (m === previous) {
      raw.copyWithin(start, rowStart, rowStart + rowBytes + 1);
      continue;
    }
    previous = m;
    rowStart = start;
    raw[start] = 0; // filter: none
    raw.fill(0xff, start + 1, start + 1 + rowBytes); // white
    const y = m - QUIET_ZONE;
    if (y < 0 || y >= code.size) continue;
    for (let x = 0; x < code.size; x++) {
      if (!code.data[y * code.size + x]) continue;
      for (let px = edge(x + QUIET_ZONE); px < edge(x + QUIET_ZONE + 1); px++) {
        const at = start + 1 + (px >> 3);
        raw[at] = (raw[at] ?? 0xff) & ~(0x80 >> (px & 7));
      }
    }
  }

  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, IMAGE_SIZE);
  view.setUint32(4, IMAGE_SIZE);
  header[8] = 1; // bit depth
  header[9] = 0; // colour type: greyscale
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', await deflate(raw)), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
