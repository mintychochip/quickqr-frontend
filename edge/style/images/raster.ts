/** Pixels, 8 bits a channel, with straight (not premultiplied) alpha. */
export interface Raster {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

/** The bytes are not a readable PNG, JPEG, or GIF. */
export class UnreadableImage extends Error {}

/**
 * Reading a photo has to fit the free plan's 10 ms of CPU for the whole request. These caps are sized from CPU measured
 * on Cloudflare itself, which ran about seven times what the same code costs warm on a laptop: a cold isolate runs a
 * decode loop in the interpreter. A 165 KB JPEG took 22 to 40 ms; reading a 128 by 128 PNG took about 6 ms, of which the
 * inflate was one. A photo over a cap is accepted and listed, but its colors are not read (the response says
 * `used: false`). The app shrinks a photo to fit before it sends it, so the studio's photos are always under these.
 */
export const LIMITS = {
  /** Largest PNG, in bytes of decoded scanlines: a 96 by 96 RGBA picture is 36,960. */
  pngRawBytes: 40 * 1024,
  /** Largest GIF frame, in pixels (96 by 96 is 9,216). */
  gifPixels: 12_000,
  /** Largest JPEG, in bytes: reading it means decoding every coefficient, which costs in proportion to its size. */
  jpegBytes: 48 * 1024,
};
