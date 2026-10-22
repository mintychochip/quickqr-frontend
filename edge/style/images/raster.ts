/** Pixels, 8 bits a channel, with straight (not premultiplied) alpha. */
export interface Raster {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

/** The bytes are not a readable PNG, JPEG, or GIF. */
export class UnreadableImage extends Error {}

/**
 * Reading a photo has to fit the free plan's 10 ms of CPU for the whole request. These caps keep a decode well inside
 * that; a photo over one is accepted and listed, but its colors are not read (the response says `used: false`).
 */
export const LIMITS = {
  /** Largest PNG, in bytes of decoded scanlines (about 250,000 RGBA pixels): inflating and unfiltering cost in proportion. */
  pngRawBytes: 1 << 20,
  /** Largest GIF frame, in pixels. */
  gifPixels: 500_000,
  /** Largest JPEG, in bytes: reading it means decoding every coefficient, which costs in proportion to its size. */
  jpegBytes: 256 * 1024,
};
