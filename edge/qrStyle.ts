import { HttpError, isRecord, stringValue } from './http';
import type { QRStyle } from './types';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const SETTINGS = ['fgColor', 'bgColor', 'accentColor', 'errorLevel', 'frame', 'moduleColorMode', 'dotShape', 'summary'];
const ERROR_LEVELS = ['L', 'M', 'Q', 'H'];
const FRAMES = ['plain', 'soft', 'ring'];
const MODULE_COLOR_MODES = ['uniform', 'finder_accent', 'gradient'];
const DOT_SHAPES = ['square', 'rounded', 'circle'];

/** What a code that has never been styled is drawn with: plain, high-contrast, and scannable. */
const DEFAULT_STYLE: QRStyle = {
  fgColor: '#111113',
  bgColor: '#ffffff',
  accentColor: '#111113',
  errorLevel: 'M',
  frame: 'plain',
  moduleColorMode: 'uniform',
  dotShape: 'square',
};

function color(raw: unknown, name: string): string {
  if (typeof raw !== 'string' || !HEX_COLOR.test(raw)) throw new HttpError(400, `${name} must be a #rrggbb color`);
  return raw.toLowerCase();
}

function choice(raw: unknown, name: string, allowed: string[], message: string, normalize = (value: string) => value): string {
  const value = normalize(stringValue(raw, name));
  if (!allowed.includes(value)) throw new HttpError(400, message);
  return value;
}

/**
 * Applies a partial style to the one already saved (or to the defaults) and returns the whole. `null` clears the saved
 * style. Anything that is not a setting, or is out of range, is a 400 that names it, so a client learns what to fix.
 */
export function mergeQRStyle(current: QRStyle | undefined, patch: unknown): QRStyle | null {
  if (patch === null) return null;
  if (!isRecord(patch)) throw new HttpError(400, 'style must be an object');
  for (const key of Object.keys(patch)) if (!SETTINGS.includes(key)) throw new HttpError(400, `Unknown style setting: ${key}`);

  const next: QRStyle = { ...(current ?? DEFAULT_STYLE) };
  if ('fgColor' in patch) next.fgColor = color(patch.fgColor, 'fgColor');
  if ('bgColor' in patch) next.bgColor = color(patch.bgColor, 'bgColor');
  if ('accentColor' in patch) next.accentColor = color(patch.accentColor, 'accentColor');
  if ('errorLevel' in patch) next.errorLevel = choice(patch.errorLevel, 'errorLevel', ERROR_LEVELS, 'errorLevel must be L, M, Q, or H', (v) => v.toUpperCase());
  if ('frame' in patch) next.frame = choice(patch.frame, 'frame', FRAMES, 'frame must be plain, soft, or ring');
  if ('moduleColorMode' in patch) {
    next.moduleColorMode = choice(patch.moduleColorMode, 'moduleColorMode', MODULE_COLOR_MODES, 'moduleColorMode must be uniform, finder_accent, or gradient');
  }
  if ('dotShape' in patch) next.dotShape = choice(patch.dotShape, 'dotShape', DOT_SHAPES, 'dotShape must be square, rounded, or circle');
  if ('summary' in patch) {
    const summary = stringValue(patch.summary, 'summary').trim();
    if (summary) next.summary = summary;
    else delete next.summary;
  }
  if (!next.accentColor) next.accentColor = next.fgColor;
  return next;
}
