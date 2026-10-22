import { IMAGE_SIZE, QUIET_ZONE } from './svg';
import type { Matrix } from './matrix';

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(...parts: Uint8Array[]): number {
  let crc = 0xffffffff;
  for (const part of parts) for (let i = 0; i < part.length; i++) crc = (CRC_TABLE[(crc ^ (part[i] ?? 0)) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();

function chunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length);
  const view = new DataView(out.buffer);
  const name = encoder.encode(type);
  view.setUint32(0, body.length);
  out.set(name, 4);
  out.set(body, 8);
  view.setUint32(8 + body.length, crc32(name, body));
  return out;
}

async function deflate(raw: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * The picture's scanlines: 1024 rows of a filter byte (0) and 128 bytes of bits, 0 being black. A module covers the
 * pixels from `m * 1024 / total` to `(m + 1) * 1024 / total`, as the Go renderer drew it, so modules differ by a pixel in
 * width and none is blurred. Every pixel row inside one module row is the same, so the first is drawn and the rest are
 * copies, made by doubling: about four native calls for a module row instead of one for each of its fifteen pixel rows.
 */
export function pngScanlines(code: Matrix): Uint8Array {
  const total = code.size + QUIET_ZONE * 2;
  const rowBytes = IMAGE_SIZE / 8;
  const stride = rowBytes + 1;
  const edges = Int32Array.from({ length: total + 1 }, (_, m) => Math.floor((m * IMAGE_SIZE) / total));
  const raw = new Uint8Array(IMAGE_SIZE * stride);

  for (let m = 0; m < total; m++) {
    const top = edges[m] ?? 0;
    const rows = (edges[m + 1] ?? 0) - top;
    const first = top * stride;
    raw.fill(0xff, first + 1, first + stride);
    const y = m - QUIET_ZONE;
    if (y >= 0 && y < code.size) {
      for (let x = 0; x < code.size; x++) {
        if (!code.data[y * code.size + x]) continue;
        for (let px = edges[x + QUIET_ZONE] ?? 0, end = edges[x + QUIET_ZONE + 1] ?? 0; px < end; px++) {
          const at = first + 1 + (px >> 3);
          raw[at] = (raw[at] ?? 0xff) & ~(0x80 >> (px & 7));
        }
      }
    }
    for (let filled = 1; filled < rows; ) {
      const copies = Math.min(filled, rows - filled);
      raw.copyWithin(first + filled * stride, first, first + copies * stride);
      filled += copies;
    }
  }
  return raw;
}

/** The code as a 1024 by 1024, 1-bit grey PNG. */
export async function renderPng(code: Matrix): Promise<Uint8Array> {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, IMAGE_SIZE);
  view.setUint32(4, IMAGE_SIZE);
  header[8] = 1; // bit depth
  header[9] = 0; // colour type: greyscale
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', await deflate(pngScanlines(code))),
    chunk('IEND', new Uint8Array(0)),
  ];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
