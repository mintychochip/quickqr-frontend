import QRCode from 'qrcode';

/** A QR symbol: `size` modules on a side, row by row, 1 for dark. */
export interface Matrix {
  size: number;
  data: Uint8Array;
}

/** Encodes text at error-correction level M, the only level the Go server used. Throws when it does not fit any version. */
export function encodeMatrix(text: string): Matrix {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
  return { size: modules.size, data: modules.data };
}
