import QRCodeLib from 'qrcode';
import type { QRCode as QrCodeModel } from 'qrcode';
import type { QrDotShape, QrErrorLevel, QrFrameStyle, QrModuleColorMode } from './qrStylePresets';
import { withQrStyleDefaults, type QrStyleResult } from './qrStylePresets';
import { logoImageSource, type QrLogoMode } from './qrSymbolSchema';

export type { QrErrorLevel, QrFrameStyle };

export interface QrRenderOptions {
  fgColor: string;
  bgColor: string;
  accentColor: string;
  errorCorrectionLevel: QrErrorLevel;
  margin: number;
  moduleColorMode: QrModuleColorMode;
  dotShape: QrDotShape;
  logoMode: QrLogoMode;
  logoDataUrl: string | null;
  logoScale: number;
  logoImageSrc: string | null;
}

export const QR_PREVIEW_WIDTH = 240;
export const QR_EXPORT_PNG_WIDTH = 1024;

export function qrRenderOptionsFromStyle(style: QrStyleResult): QrRenderOptions {
  const full = withQrStyleDefaults(style);
  const logoMode = full.logoMode;
  return {
    fgColor: full.fgColor,
    bgColor: full.bgColor,
    accentColor: full.accentColor,
    errorCorrectionLevel: full.errorLevel,
    margin: full.margin,
    moduleColorMode: full.moduleColorMode,
    dotShape: full.dotShape,
    logoMode,
    logoDataUrl: full.logoDataUrl ?? null,
    logoScale: full.logoScale,
    logoImageSrc: logoImageSource(logoMode, full.logoDataUrl),
  };
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = Number.parseInt(h.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function lerpHex(a: string, b: string, t: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const c1 = parseHex(a);
  const c2 = parseHex(b);
  const f = Math.max(0, Math.min(1, t));
  return `#${[clamp(c1.r + (c2.r - c1.r) * f), clamp(c1.g + (c2.g - c1.g) * f), clamp(c1.b + (c2.b - c1.b) * f)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')}`;
}

function isFinderModule(row: number, col: number, size: number): boolean {
  if (row < 7 && col < 7) return true;
  if (row < 7 && col >= size - 7) return true;
  if (row >= size - 7 && col < 7) return true;
  return false;
}

function moduleFillColor(
  row: number,
  col: number,
  size: number,
  opts: QrRenderOptions,
): string {
  switch (opts.moduleColorMode) {
    case 'finder_accent':
      return isFinderModule(row, col, size) ? opts.accentColor : opts.fgColor;
    case 'gradient': {
      const t = size <= 1 ? 0 : (row + col) / (2 * (size - 1));
      return isFinderModule(row, col, size)
        ? opts.accentColor
        : lerpHex(opts.fgColor, opts.accentColor, t);
    }
    default:
      return opts.fgColor;
  }
}

function createQrData(text: string, errorCorrectionLevel: QrErrorLevel): QrCodeModel {
  return QRCodeLib.create(text, { errorCorrectionLevel });
}

function paintModule(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellW: number,
  cellH: number,
  color: string,
  shape: QrDotShape,
): void {
  ctx.fillStyle = color;
  if (shape === 'circle') {
    const r = Math.min(cellW, cellH) * 0.46;
    ctx.beginPath();
    ctx.arc(x + cellW / 2, y + cellH / 2, r, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (shape === 'square') {
    ctx.fillRect(x, y, cellW, cellH);
    return;
  }
  const inset = Math.min(cellW, cellH) * 0.12;
  const w = cellW - inset * 2;
  const h = cellH - inset * 2;
  const radius = Math.min(cellW, cellH) * 0.22;
  ctx.beginPath();
  ctx.roundRect(x + inset, y + inset, w, h, radius);
  ctx.fill();
}

function paintQrToContext(
  ctx: CanvasRenderingContext2D,
  qr: QrCodeModel,
  opts: QrRenderOptions,
  pixelSize: number,
): void {
  const modules = qr.modules.size;
  const quiet = opts.margin;
  const grid = modules + quiet * 2;
  // Integer cells, then center the leftover pixels so the symbol is not biased up-left.
  const cell = Math.max(1, Math.floor(pixelSize / grid));
  const drawn = cell * grid;
  const offset = Math.floor((pixelSize - drawn) / 2);

  ctx.clearRect(0, 0, pixelSize, pixelSize);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = opts.bgColor;
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (!qr.modules.get(row, col)) continue;
      const x = offset + (col + quiet) * cell;
      const y = offset + (row + quiet) * cell;
      const color = moduleFillColor(row, col, modules, opts);
      paintModule(ctx, x, y, cell, cell, color, opts.dotShape);
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  const { promise, resolve, reject } = Promise.withResolvers<HTMLImageElement>();
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Logo image failed to load'));
  img.src = src;
  return promise;
}

function paintCenterLogo(
  ctx: CanvasRenderingContext2D,
  pixelSize: number,
  opts: QrRenderOptions,
  img: HTMLImageElement,
): void {
  const side = pixelSize * opts.logoScale;
  const x = (pixelSize - side) / 2;
  const y = (pixelSize - side) / 2;
  const pad = side * 0.08;
  const plateR = side * 0.12;

  ctx.fillStyle = opts.bgColor;
  ctx.beginPath();
  ctx.roundRect(x - pad, y - pad, side + pad * 2, side + pad * 2, plateR);
  ctx.fill();

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, side, side);
}

async function paintQrWithOptionalLogo(
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: QrRenderOptions,
  pixelSize: number,
): Promise<void> {
  const qr = createQrData(text, opts.errorCorrectionLevel);
  paintQrToContext(ctx, qr, opts, pixelSize);
  if (opts.logoMode !== 'none' && opts.logoImageSrc) {
    const img = await loadImage(opts.logoImageSrc);
    paintCenterLogo(ctx, pixelSize, opts, img);
  }
}

/** Paint using the same path as the UI (usable with browser or @napi-rs/canvas). */
export function renderCustomQrToContext(
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: QrRenderOptions,
  pixelSize: number,
): void {
  const qr = createQrData(text, opts.errorCorrectionLevel);
  paintQrToContext(ctx, qr, opts, pixelSize);
}

/** Browser path with optional async logo overlay. */
export async function renderCustomQrToContextAsync(
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: QrRenderOptions,
  pixelSize: number,
): Promise<void> {
  await paintQrWithOptionalLogo(ctx, text, opts, pixelSize);
}

/** Bitmap size that fills the requested box with whole modules and no leftover padding. */
function tightPixelSize(text: string, opts: QrRenderOptions, pixelSize: number): number {
  const qr = createQrData(text, opts.errorCorrectionLevel);
  const grid = qr.modules.size + opts.margin * 2;
  const cell = Math.max(1, Math.floor(pixelSize / grid));
  return cell * grid;
}

function renderToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  opts: QrRenderOptions,
  pixelSize: number,
  tight = false,
): Promise<void> {
  const size = tight ? tightPixelSize(text, opts, pixelSize) : pixelSize;
  canvas.width = size;
  canvas.height = size;
  if (!tight) {
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.maxWidth = `${pixelSize}px`;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  return renderCustomQrToContextAsync(ctx, text, opts, size);
}

export function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  value: string,
  style: QrRenderOptions | QrStyleResult,
  width = QR_PREVIEW_WIDTH,
  tight = false,
): Promise<void> {
  const opts = 'errorCorrectionLevel' in style ? style : qrRenderOptionsFromStyle(style);
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  if (!value) {
    reject(new Error('Empty QR value'));
    return promise;
  }
  renderToCanvas(canvas, value, opts, width, tight).then(resolve).catch(reject);
  return promise;
}

export function renderQrToDataURL(
  value: string,
  style: QrRenderOptions | QrStyleResult,
  width = QR_EXPORT_PNG_WIDTH,
): Promise<string> {
  const opts = 'errorCorrectionLevel' in style ? style : qrRenderOptionsFromStyle(style);
  const off = document.createElement('canvas');
  return renderToCanvas(off, value, opts, width).then(() => off.toDataURL('image/png'));
}

export async function renderQrToSvg(value: string, style: QrRenderOptions | QrStyleResult): Promise<string> {
  const opts = 'errorCorrectionLevel' in style ? style : qrRenderOptionsFromStyle(style);
  const qr = createQrData(value, opts.errorCorrectionLevel);
  const modules = qr.modules.size;
  const quiet = opts.margin;
  const grid = modules + quiet * 2;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${grid} ${grid}" shape-rendering="crispEdges">`,
    `<rect width="${grid}" height="${grid}" fill="${opts.bgColor}"/>`,
  ];

  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (!qr.modules.get(row, col)) continue;
      const cx = col + quiet + 0.5;
      const cy = row + quiet + 0.5;
      const fill = moduleFillColor(row, col, modules, opts);
      if (opts.dotShape === 'circle') {
        parts.push(`<circle cx="${cx}" cy="${cy}" r="0.42" fill="${fill}"/>`);
      } else {
        const rx = opts.dotShape === 'rounded' ? 0.15 : 0;
        parts.push(
          `<rect x="${col + quiet}" y="${row + quiet}" width="1" height="1" rx="${rx}" fill="${fill}"/>`,
        );
      }
    }
  }

  if (opts.logoMode !== 'none' && opts.logoImageSrc) {
    const s = opts.logoScale * grid;
    const x = (grid - s) / 2;
    const y = (grid - s) / 2;
    const pad = s * 0.08;
    parts.push(
      `<rect x="${x - pad}" y="${y - pad}" width="${s + pad * 2}" height="${s + pad * 2}" rx="${s * 0.12}" fill="${opts.bgColor}"/>`,
      `<image href="${opts.logoImageSrc}" x="${x}" y="${y}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  parts.push('</svg>');
  return parts.join('');
}

export function qrFrameWrapperClass(frame: QrFrameStyle): string {
  switch (frame) {
    case 'ring':
      return 'qr-frame-ring';
    case 'soft':
      return 'qr-frame-soft';
    default:
      return 'qr-frame-plain';
  }
}
