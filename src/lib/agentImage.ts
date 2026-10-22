/**
 * The longest side, in pixels, of a photo as the style agent receives it. The agent only needs a photo's main colors, so
 * this is plenty, and it keeps the picture small enough for the server to read within its CPU budget (see
 * `LIMITS` in `edge/style/images/raster.ts`, which this must stay under: a 128 by 128 PNG is 65,664 bytes decoded).
 */
export const AGENT_IMAGE_SIDE = 128;

/** A file's contents as base64, without the `data:` prefix. */
export function fileToBase64(file: Blob): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const reader = new FileReader();
  reader.onload = () => {
    const value = String(reader.result ?? '');
    const comma = value.indexOf(',');
    resolve(comma >= 0 ? value.slice(comma + 1) : value);
  };
  reader.onerror = () => reject(new Error('Could not read that file'));
  reader.readAsDataURL(file);
  return promise;
}

export interface AgentImage {
  mediaType: string;
  dataBase64: string;
}

/** The photo drawn into a square of `AGENT_IMAGE_SIDE` pixels at most and written as PNG, or null if the browser cannot draw it. */
async function shrink(file: File): Promise<AgentImage | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  try {
    const scale = Math.min(1, AGENT_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const { promise, resolve } = Promise.withResolvers<Blob | null>();
    canvas.toBlob(resolve, 'image/png');
    const blob = await promise;
    return blob ? { mediaType: 'image/png', dataBase64: await fileToBase64(blob) } : null;
  } finally {
    bitmap.close();
  }
}

/**
 * A photo as the style agent should be sent it: shrunk to fit and re-encoded as PNG. A browser that cannot decode the
 * file or draw it (or an animated or oddly encoded one) sends the file as it is, and the server reads what it can.
 */
export async function readImageForAgent(file: File): Promise<AgentImage> {
  return (await shrink(file)) ?? { mediaType: file.type, dataBase64: await fileToBase64(file) };
}
