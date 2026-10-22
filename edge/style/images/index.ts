import { decodeGif, isGif } from './gif';
import { decodeJpeg, isJpeg } from './jpeg';
import { decodePng, isPng } from './png';
import { UnreadableImage, type Raster } from './raster';

export { UnreadableImage, type Raster } from './raster';

/**
 * A photo's pixels, whatever its format. Throws UnreadableImage when the bytes are not a PNG, JPEG, or GIF (or are a
 * damaged one). Null when it is one this server can read the header of but not afford to decode.
 */
export async function decodeRaster(bytes: Uint8Array): Promise<Raster | null> {
  if (isPng(bytes)) return decodePng(bytes);
  if (isJpeg(bytes)) return decodeJpeg(bytes);
  if (isGif(bytes)) return decodeGif(bytes);
  throw new UnreadableImage('not a PNG, JPEG, or GIF');
}
