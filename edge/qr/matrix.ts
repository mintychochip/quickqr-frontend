import QRCode from 'qrcode';

/** A QR symbol: `size` modules on a side, row by row, 1 for dark. */
export interface Matrix {
  size: number;
  data: Uint8Array;
}

/**
 * From this version up (a 57-module symbol and larger) the eight-mask search is skipped. The library builds and scores
 * every mask, so its cost grows with the area times eight: on Cloudflare a 14-version code took a median 14 ms of CPU
 * and up to 98 ms cold, against a 10 ms free-plan limit. The search matters least where it costs most, because a larger
 * symbol averages out the differences between masks, and every mask is valid and readable.
 */
const FULL_MASK_SEARCH_BELOW_VERSION = 10;

/** Encodes text at error-correction level M, the only level the Go server used. Throws when it does not fit any version. */
export function encodeMatrix(text: string): Matrix {
  const quick = QRCode.create(text, { errorCorrectionLevel: 'M', maskPattern: 0 });
  const { modules } = quick.version < FULL_MASK_SEARCH_BELOW_VERSION ? QRCode.create(text, { errorCorrectionLevel: 'M' }) : quick;
  return { size: modules.size, data: modules.data };
}
