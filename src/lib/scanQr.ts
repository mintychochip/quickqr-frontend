import jsQR from 'jsqr';
import { dynamicCodeFromQrPayload } from './dynamicQr';

/** Read a QR payload from canvas pixels. Returns null when no code is present. */
export function decodeQrImageData(data: ImageData): string | null {
  const code = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
  return code?.data ?? null;
}

export function decodeQrCanvas(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width < 1 || canvas.height < 1) return null;
  return decodeQrImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

/**
 * Map a scanned QR payload to this app's menu path.
 * The code is the identity, so a LAN host and localhost both open `/r/:code`.
 */
export function menuLocationFromScan(payload: string): string | null {
  const trimmed = payload.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed, 'http://scan.local');
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const code = dynamicCodeFromQrPayload(url.href);
  return code ? `/r/${code}` : null;
}
