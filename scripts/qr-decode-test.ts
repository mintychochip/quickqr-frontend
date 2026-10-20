/**
 * Decodes rendered QRs with jsQR (same renderer as the app). Run: bun run test:qr
 *
 * Required cases must decode — CI fails if not.
 * Informational cases only report jsQR result (UNKNOWN for phone scanning until tested manually).
 */
import { createCanvas } from '@napi-rs/canvas';
import jsQR from 'jsqr';
import { qrRenderOptionsFromStyle, renderCustomQrToContext } from '../src/lib/qrCode';
import { presetStyleById, withQrStyleDefaults, type QrStyleResult } from '../src/lib/qrStylePresets';

const PAYLOAD = 'https://example.com/quickqr-decode-test';
const SIZE = 640;

function ensureRoundRect(ctx: CanvasRenderingContext2D): void {
  if (typeof ctx.roundRect === 'function') return;
  ctx.roundRect = function roundRectPolyfill(
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radii?: number | DOMPointInit | Iterable<number | DOMPointInit>,
  ) {
    const r = typeof radii === 'number' ? radii : 0;
    this.beginPath();
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
  };
}

function styleCase(
  name: string,
  patch: Partial<QrStyleResult> & { base?: ReturnType<typeof presetStyleById> },
): { name: string; style: QrStyleResult } {
  const base = patch.base ?? presetStyleById('print_safe');
  const { base: _b, ...rest } = patch;
  return { name, style: withQrStyleDefaults({ ...base, ...rest }) };
}

type CaseKind = 'required' | 'informational';

const cases: { name: string; style: QrStyleResult; kind: CaseKind }[] = [
  { ...styleCase('uniform_square', { moduleColorMode: 'uniform', dotShape: 'square' }), kind: 'required' },
  { ...styleCase('finder_accent', {
    base: presetStyleById('quickqr_brand'),
    moduleColorMode: 'finder_accent',
    dotShape: 'square',
  }), kind: 'required' },
  { ...styleCase('gradient', {
    moduleColorMode: 'gradient',
    fgColor: '#0f172a',
    accentColor: '#2563eb',
    bgColor: '#ffffff',
    dotShape: 'square',
  }), kind: 'required' },
  { ...styleCase('uniform_rounded', { moduleColorMode: 'uniform', dotShape: 'rounded' }), kind: 'informational' },
  { ...styleCase('uniform_circle', { moduleColorMode: 'uniform', dotShape: 'circle' }), kind: 'informational' },
  { ...styleCase('gradient_circle', {
    moduleColorMode: 'gradient',
    fgColor: '#000000',
    accentColor: '#333333',
    bgColor: '#ffffff',
    dotShape: 'circle',
  }), kind: 'informational' },
];

let requiredFailed = 0;

console.log(`QR decode test payload: ${PAYLOAD}\n`);

for (const { name, style, kind } of cases) {
  const opts = qrRenderOptionsFromStyle(style);
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.log(`${name}: ERROR (no 2d context)`);
    if (kind === 'required') requiredFailed++;
    continue;
  }
  ensureRoundRect(ctx as unknown as CanvasRenderingContext2D);
  renderCustomQrToContext(ctx as unknown as CanvasRenderingContext2D, PAYLOAD, opts, SIZE);
  const imageData = ctx.getImageData(0, 0, SIZE, SIZE);
  const decoded = jsQR(new Uint8ClampedArray(imageData.data), SIZE, SIZE);
  const ok = decoded?.data === PAYLOAD;

  if (kind === 'required') {
    if (ok) {
      console.log(`${name}: OK (jsQR decoded) → ${decoded!.data}`);
    } else {
      console.log(`${name}: FAIL (jsQR did not decode payload)`);
      requiredFailed++;
    }
  } else {
    const jsqr = ok ? 'jsQR decoded' : 'jsQR no decode';
    console.log(`${name}: UNKNOWN scanner compatibility (${jsqr}) — verify with a phone`);
  }
}

console.log(`\nRequired: ${cases.filter((c) => c.kind === 'required').length - requiredFailed}/${cases.filter((c) => c.kind === 'required').length} decoded`);
process.exit(requiredFailed > 0 ? 1 : 0);
