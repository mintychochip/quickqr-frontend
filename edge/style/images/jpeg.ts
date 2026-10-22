import { LIMITS, UnreadableImage, type Raster } from './raster';

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

const FAST_BITS = 9;

interface Huffman {
  /** For codes of up to FAST_BITS bits: (length << 8) | symbol, or 0 when the code is longer. */
  fast: Uint16Array;
  maxcode: Int32Array;
  mincode: Int32Array;
  valptr: Int32Array;
  values: Uint8Array;
}

function buildHuffman(counts: Uint8Array, values: Uint8Array): Huffman {
  const table: Huffman = { fast: new Uint16Array(1 << FAST_BITS), maxcode: new Int32Array(18), mincode: new Int32Array(17), valptr: new Int32Array(17), values };
  let code = 0;
  let k = 0;
  for (let length = 1; length <= 16; length++) {
    const count = counts[length - 1] ?? 0;
    table.valptr[length] = k;
    table.mincode[length] = code;
    for (let i = 0; i < count && length <= FAST_BITS; i++) {
      const fill = 1 << (FAST_BITS - length);
      const start = (code + i) << (FAST_BITS - length);
      for (let j = 0; j < fill; j++) table.fast[start + j] = (length << 8) | (values[k + i] ?? 0);
    }
    k += count;
    code += count;
    table.maxcode[length] = count ? code - 1 : -1;
    code <<= 1;
  }
  table.maxcode[17] = 0xfffff;
  return table;
}

interface Component {
  id: number;
  h: number;
  v: number;
  quantTable: number;
  dcTable: number;
  acTable: number;
  blocksPerLine: number;
  /** One DC coefficient per block, before dequantizing. */
  dc: Int16Array;
}

/** Bits out of the entropy-coded part of a scan, undoing the 0xFF00 byte stuffing and stopping at any marker. */
class Bits {
  private bits = 0;
  private count = 0;
  private padding = 0;
  pos: number;
  private data: Uint8Array;
  constructor(data: Uint8Array, start: number) {
    this.data = data;
    this.pos = start;
  }

  private fill(): void {
    while (this.count <= 24) {
      let byte = 0;
      const next = this.data[this.pos];
      if (next === undefined || (next === 0xff && this.data[this.pos + 1] !== 0)) {
        this.padding += 8; // a marker or the end: what follows is zeros, and reading them is an error
      } else {
        byte = next;
        this.pos += next === 0xff ? 2 : 1;
      }
      this.bits = (this.bits << 8) | byte;
      this.count += 8;
    }
  }

  private spend(n: number): void {
    this.count -= n;
    if (this.count < this.padding) throw new UnreadableImage('truncated JPEG');
  }

  read(n: number): number {
    if (n === 0) return 0;
    if (this.count < n) this.fill();
    const value = (this.bits >>> (this.count - n)) & ((1 << n) - 1);
    this.spend(n);
    return value;
  }

  symbol(table: Huffman): number {
    if (this.count < 16) this.fill();
    const peeked = (this.bits >>> (this.count - FAST_BITS)) & ((1 << FAST_BITS) - 1);
    const hit = table.fast[peeked] ?? 0;
    if (hit) {
      this.spend(hit >> 8);
      return hit & 0xff;
    }
    let length = FAST_BITS + 1;
    let code = (this.bits >>> (this.count - length)) & ((1 << length) - 1);
    while (length <= 16 && code > (table.maxcode[length] ?? -1)) {
      length++;
      code = (this.bits >>> (this.count - length)) & ((1 << length) - 1);
    }
    if (length > 16) throw new UnreadableImage('bad JPEG data');
    this.spend(length);
    return table.values[(table.valptr[length] ?? 0) + code - (table.mincode[length] ?? 0)] ?? 0;
  }

  /** Drops the rest of the current byte and steps over the restart marker that follows. */
  restart(): void {
    this.bits = this.count = this.padding = 0;
    while (this.pos + 1 < this.data.length && !(this.data[this.pos] === 0xff && (this.data[this.pos + 1] ?? 0) >= 0xd0 && (this.data[this.pos + 1] ?? 0) <= 0xd7)) {
      if (this.data[this.pos] === 0xff && this.data[this.pos + 1] !== 0) throw new UnreadableImage('missing JPEG restart marker');
      this.pos++;
    }
    if (this.pos + 1 >= this.data.length) throw new UnreadableImage('missing JPEG restart marker');
    this.pos += 2;
  }
}

const extend = (value: number, size: number): number => (value < 1 << (size - 1) ? value - (1 << size) + 1 : value);

/**
 * A 1/8-scale picture of a baseline JPEG: each 8-by-8 block is read as its average color, which is its DC coefficient.
 * That is plenty for working out a photo's main colors and skips the transform and upsampling a full decode needs.
 * Throws UnreadableImage for a damaged file. Null for one it does not read: progressive, arithmetic-coded, CMYK,
 * not 8-bit, or over the size cap.
 */
export function decodeJpeg(bytes: Uint8Array): Raster | null {
  if (!isJpeg(bytes)) throw new UnreadableImage('not a JPEG');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const quant = new Map<number, number>(); // table id -> its DC step
  const dcTables = new Map<number, Huffman>();
  const acTables = new Map<number, Huffman>();
  let components: Component[] = [];
  let width = 0;
  let height = 0;
  let restartInterval = 0;
  let adobeTransform = -1;
  let supported = true;

  let at = 2;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) throw new UnreadableImage('bad JPEG marker');
    const marker = bytes[at + 1] ?? 0;
    if (marker === 0xff) {
      at++;
      continue;
    }
    if (marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      at += 2;
      continue;
    }
    const length = view.getUint16(at + 2);
    const start = at + 4;
    const end = at + 2 + length;
    if (length < 2 || end > bytes.length) throw new UnreadableImage('truncated JPEG segment');
    const body = bytes.subarray(start, end);

    if (marker === 0xdb) {
      for (let i = 0; i < body.length; ) {
        const info = body[i++] ?? 0;
        const wide = info >> 4 === 1;
        quant.set(info & 15, wide ? ((body[i] ?? 0) << 8) | (body[i + 1] ?? 0) : (body[i] ?? 0));
        i += wide ? 128 : 64;
      }
    } else if (marker === 0xc4) {
      for (let i = 0; i + 17 <= body.length; ) {
        const info = body[i] ?? 0;
        const counts = body.subarray(i + 1, i + 17);
        const total = counts.reduce((sum, n) => sum + n, 0);
        const values = body.subarray(i + 17, i + 17 + total);
        if (values.length < total) throw new UnreadableImage('bad JPEG Huffman table');
        (info >> 4 === 0 ? dcTables : acTables).set(info & 15, buildHuffman(counts, values));
        i += 17 + total;
      }
    } else if (marker === 0xc0 || marker === 0xc1) {
      if (body.length < 6) throw new UnreadableImage('bad JPEG frame');
      const count = body[5] ?? 0;
      height = view.getUint16(start + 1);
      width = view.getUint16(start + 3);
      if (body[0] !== 8) supported = false;
      if (body.length < 6 + count * 3 || width === 0 || height === 0 || (count !== 1 && count !== 3)) {
        if (count === 4) supported = false;
        else throw new UnreadableImage('bad JPEG frame');
      }
      components = Array.from({ length: supported ? count : 0 }, (_, i) => {
        const sampling = body[7 + i * 3] ?? 0x11;
        return { id: body[6 + i * 3] ?? 0, h: sampling >> 4, v: sampling & 15, quantTable: body[8 + i * 3] ?? 0, dcTable: 0, acTable: 0, blocksPerLine: 0, dc: new Int16Array(0) };
      });
    } else if (marker >= 0xc2 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      supported = false; // progressive, lossless, or arithmetic-coded
    } else if (marker === 0xdd) {
      restartInterval = view.getUint16(start);
    } else if (marker === 0xee && String.fromCharCode(...body.subarray(0, 5)) === 'Adobe' && body.length >= 12) {
      adobeTransform = body[11] ?? -1;
    } else if (marker === 0xda) {
      if (!supported || components.length === 0 || bytes.length > LIMITS.jpegBytes) return null;
      return readScan(bytes, end, body);
    }
    at = end;
  }
  if (width === 0) throw new UnreadableImage('JPEG has no image');
  throw new UnreadableImage('JPEG has no scan');

  function readScan(data: Uint8Array, entropyStart: number, header: Uint8Array): Raster | null {
    const count = header[0] ?? 0;
    if (count !== components.length) return null; // one scan per component is not read
    for (let i = 0; i < count; i++) {
      const component = components.find((c) => c.id === header[1 + i * 2]);
      if (!component) throw new UnreadableImage('bad JPEG scan');
      component.dcTable = (header[2 + i * 2] ?? 0) >> 4;
      component.acTable = (header[2 + i * 2] ?? 0) & 15;
    }

    const hMax = Math.max(...components.map((c) => c.h));
    const vMax = Math.max(...components.map((c) => c.v));
    if (components.some((c) => c.h < 1 || c.v < 1 || c.h > 4 || c.v > 4)) throw new UnreadableImage('bad JPEG sampling');
    const mcusX = Math.ceil(width / (8 * hMax));
    const mcusY = Math.ceil(height / (8 * vMax));
    const blocks = mcusX * mcusY * components.reduce((sum, c) => sum + c.h * c.v, 0);
    if (blocks > 4 * data.length) throw new UnreadableImage('JPEG is larger than its data');
    for (const c of components) {
      c.blocksPerLine = mcusX * c.h;
      c.dc = new Int16Array(mcusX * c.h * mcusY * c.v);
    }

    const bits = new Bits(data, entropyStart);
    const predictors = new Int32Array(components.length);
    for (let mcu = 0; mcu < mcusX * mcusY; mcu++) {
      if (restartInterval && mcu > 0 && mcu % restartInterval === 0) {
        bits.restart();
        predictors.fill(0);
      }
      const mcuX = mcu % mcusX;
      const mcuY = Math.floor(mcu / mcusX);
      components.forEach((c, ci) => {
        const dcTable = dcTables.get(c.dcTable);
        const acTable = acTables.get(c.acTable);
        if (!dcTable || !acTable) throw new UnreadableImage('JPEG is missing a Huffman table');
        for (let by = 0; by < c.v; by++) {
          for (let bx = 0; bx < c.h; bx++) {
            const size = bits.symbol(dcTable);
            if (size > 11) throw new UnreadableImage('bad JPEG data');
            predictors[ci] = (predictors[ci] ?? 0) + (size ? extend(bits.read(size), size) : 0);
            c.dc[(mcuY * c.v + by) * c.blocksPerLine + mcuX * c.h + bx] = predictors[ci] ?? 0;
            for (let k = 1; k < 64; ) {
              const rs = bits.symbol(acTable);
              const run = rs >> 4;
              const bitsToSkip = rs & 15;
              if (bitsToSkip === 0) {
                if (run !== 15) break;
                k += 16;
                continue;
              }
              k += run + 1;
              bits.read(bitsToSkip);
            }
          }
        }
      });
    }
    return thumbnail(hMax, vMax);
  }

  function thumbnail(hMax: number, vMax: number): Raster {
    const w = Math.ceil(width / 8);
    const h = Math.ceil(height / 8);
    const rgba = new Uint8ClampedArray(w * h * 4);
    const sample = (c: Component, x: number, y: number): number => {
      const dc = c.dc[Math.floor((y * c.v) / vMax) * c.blocksPerLine + Math.floor((x * c.h) / hMax)] ?? 0;
      return 128 + ((dc * (quant.get(c.quantTable) ?? 1) + 4) >> 3); // libjpeg rounds the DC's 1/8 scaling
    };
    const rgbDirect = components.length === 3 && (adobeTransform === 0 || (components[0]?.id === 0x52 && components[1]?.id === 0x47 && components[2]?.id === 0x42));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const out = (y * w + x) * 4;
        const [c0, c1, c2] = components;
        const first = c0 ? sample(c0, x, y) : 0;
        if (!c1 || !c2) {
          rgba[out] = rgba[out + 1] = rgba[out + 2] = first;
        } else if (rgbDirect) {
          rgba[out] = first;
          rgba[out + 1] = sample(c1, x, y);
          rgba[out + 2] = sample(c2, x, y);
        } else {
          const cb = sample(c1, x, y) - 128;
          const cr = sample(c2, x, y) - 128;
          rgba[out] = first + 1.402 * cr;
          rgba[out + 1] = first - 0.344136 * cb - 0.714136 * cr;
          rgba[out + 2] = first + 1.772 * cb;
        }
        rgba[out + 3] = 255;
      }
    }
    return { width: w, height: h, rgba };
  }
}
