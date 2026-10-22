import type { Matrix } from './matrix';

export const IMAGE_SIZE = 1024;
export const QUIET_ZONE = 4;

/** The code as vector rectangles, one per run of dark modules, inside a 4-module quiet zone. */
export function renderSvg(code: Matrix): string {
  const total = code.size + QUIET_ZONE * 2;
  const rects: string[] = [];
  for (let y = 0; y < code.size; y++) {
    for (let x = 0; x < code.size; ) {
      if (!code.data[y * code.size + x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < code.size && code.data[y * code.size + x]) x++;
      rects.push(`<rect x="${start + QUIET_ZONE}" y="${y + QUIET_ZONE}" width="${x - start}" height="1" fill="#111113"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="#ffffff"/>${rects.join('')}</svg>`;
}
