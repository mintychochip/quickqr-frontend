import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_PDF_CHARS = 4000;
const MAX_PDF_PAGES = 12;

/** Extract readable text from a PDF without sending the file to the server. */
export async function extractPdfText(file: File): Promise<string> {
  if (file.size > MAX_PDF_BYTES) {
    throw new Error('PDF is larger than 8MB');
  }

  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, disableFontFace: true }).promise;
  try {
    let text = '';
    const pages = Math.min(doc.numPages, MAX_PDF_PAGES);
    for (let pageNumber = 1; pageNumber <= pages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      for (const item of content.items) {
        if (!('str' in item)) continue;
        text += item.str;
        text += item.hasEOL ? '\n' : ' ';
        if (text.length >= MAX_PDF_CHARS) break;
      }
      if (text.length >= MAX_PDF_CHARS) break;
    }
    const cleaned = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (!cleaned) {
      throw new Error('That PDF had no readable text');
    }
    return cleaned.slice(0, MAX_PDF_CHARS);
  } finally {
    await doc.cleanup();
  }
}
