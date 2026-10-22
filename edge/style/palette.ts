import { relLum, relLumRGB, rgbHex, saturation } from './colors';
import type { AgentImage } from './decision';
import { decodeRaster } from './images';

export interface Palette {
  accent: string;
  background: string;
}

/** About this many pixels are looked at per photo, however large it is. */
const SAMPLE_PIXELS = 40000;

/** The photo's pixels, read once and remembered on the photo. Null when this server cannot afford to read it. */
async function rasterOf(image: AgentImage) {
  if (image.raster === undefined) image.raster = await decodeRaster(image.bytes);
  return image.raster;
}

/**
 * The colors a photo is mostly made of: modules take its most vivid color and the page its most common light one.
 * Pixels are grouped into 16-level steps per channel, mostly transparent ones are skipped, and the rest count in the
 * premultiplied form Go's image package reports, so a half-see-through red counts as the darker red it looks like.
 */
export async function paletteFromImages(images: AgentImage[]): Promise<Palette | null> {
  const counts = new Map<number, number>();
  let total = 0;
  for (const image of images) {
    const raster = await rasterOf(image);
    if (!raster) continue;
    const { width, height, rgba } = raster;
    const pixels = width * height;
    const step = pixels > SAMPLE_PIXELS ? Math.max(1, Math.trunc(Math.sqrt(pixels / SAMPLE_PIXELS))) : 1;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const at = (y * width + x) * 4;
        const alpha = (rgba[at + 3] ?? 0) * 257;
        if (alpha < 0x8000) continue;
        const premultiplied = (value: number): number => (alpha === 0xffff ? value : Math.floor((value * 257 * alpha) / 0xffff) >> 8) & 0xf0;
        const r = premultiplied(rgba[at] ?? 0);
        const g = premultiplied(rgba[at + 1] ?? 0);
        const b = premultiplied(rgba[at + 2] ?? 0);
        const key = (r << 16) | (g << 8) | b;
        counts.set(key, (counts.get(key) ?? 0) + 1);
        total++;
      }
    }
  }
  if (total === 0) return null;

  let accent: [number, number, number] | null = null;
  let accentScore = -1;
  let background: [number, number, number] = [255, 255, 255];
  let backgroundCount = 0;
  for (const [key, count] of counts) {
    const r = (key >> 16) & 0xff;
    const g = (key >> 8) & 0xff;
    const b = key & 0xff;
    const vividness = saturation(r, g, b);
    if (vividness > 0.25 && vividness * count > accentScore) {
      accentScore = vividness * count;
      accent = [r, g, b];
    }
    if (relLumRGB(r, g, b) > 0.82 && count > backgroundCount) {
      background = [r, g, b];
      backgroundCount = count;
    }
  }
  const accentHex = accent ? rgbHex(...accent) : '#111113';
  const lightHex = rgbHex(...background);
  return { accent: accentHex, background: backgroundCount > 0 && relLum(lightHex) > 0.82 ? lightHex : '#ffffff' };
}
