import { darkenForScan } from './colors';
import { paletteFromImages } from './palette';
import type { Raster } from './images/raster';

/** A photo the agent was given. `raster` is its pixels when the edge can afford to read them, null when it cannot. */
export interface AgentImage {
  name: string;
  mediaType: string;
  bytes: Uint8Array;
  raster?: Raster | null;
}

/** The style the agent decides on. Field order is the Go struct's, so the JSON reads the same. */
export interface StyleAgentStyle {
  fgColor: string;
  bgColor: string;
  accentColor?: string;
  errorLevel: string;
  frame: string;
  moduleColorMode?: string;
  dotShape?: string;
  summary: string;
}

const NAMED_COLORS: Record<string, string> = {
  black: '#0a0a0a', white: '#ffffff', navy: '#1e3a5f', blue: '#2563eb',
  teal: '#0d9488', green: '#15803d', emerald: '#059669', lime: '#65a30d',
  yellow: '#ca8a04', gold: '#b45309', orange: '#ea580c', red: '#dc2626',
  rose: '#e11d48', pink: '#db2777', purple: '#7c3aed', indigo: '#4f46e5',
  slate: '#334155', gray: '#525252', grey: '#525252', cream: '#faf7f0',
  ivory: '#fffff0', sand: '#f4ede4', mint: '#ecfdf5', lavender: '#f5f3ff',
  blush: '#fff1f2',
};

const COLOR_ON_COLOR = /\b([a-z]+)\s+on\s+([a-z]+)\b/i;
const THEME_COLOR = /theme-color:\s*(#[0-9a-f]{6})\b/i;
const BACKGROUND = /background:\s*(#[0-9a-f]{6})\b/i;
const SITE_HOST = /\bSite\s+([a-z0-9.-]+\.[a-z]{2,})/i;

/** A string field of the current style, or the fallback when it is missing, blank, or not a string. */
function currentField(current: Record<string, unknown> | undefined, key: string, fallback: string): string {
  const value = current?.[key];
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

/** Colors a site's own notes name (its theme color and background). Used only when nothing stronger decided the look. */
function applySiteColorCues(text: string, style: StyleAgentStyle): void {
  const theme = THEME_COLOR.exec(text);
  if (theme?.[1]) {
    style.fgColor = theme[1].toLowerCase();
    style.accentColor = style.fgColor;
  }
  const background = BACKGROUND.exec(text);
  if (background?.[1]) style.bgColor = background[1].toLowerCase();
}

function siteHostFromContext(text: string): string {
  return SITE_HOST.exec(text)?.[1] ?? '';
}

/**
 * Words in the brief that set the look. Returns true when they fixed the colors, so a photo or a site cannot change
 * them: print wording locks a black-on-white high-correction code, and "navy on cream" style pairs lock their colors.
 */
function applyStyleTextCues(text: string, style: StyleAgentStyle): boolean {
  const lower = text.toLowerCase();
  if (['print safe', 'print-safe', 'flyer', 'poster', 'sticker'].some((word) => lower.includes(word))) {
    style.fgColor = '#000000';
    style.bgColor = '#ffffff';
    style.accentColor = '#000000';
    style.errorLevel = 'H';
    style.frame = 'plain';
    style.moduleColorMode = 'uniform';
    return true;
  }

  let locked = false;
  const pair = COLOR_ON_COLOR.exec(lower);
  const fg = pair?.[1] ? NAMED_COLORS[pair[1]] : undefined;
  const bg = pair?.[2] ? NAMED_COLORS[pair[2]] : undefined;
  if (fg && bg) {
    style.fgColor = fg;
    style.bgColor = bg;
    style.accentColor = fg;
    locked = true;
  }

  if (lower.includes('minimal') || lower.includes('plain')) style.frame = 'plain';
  else if (lower.includes('ring')) style.frame = 'ring';
  else if (lower.includes('soft')) style.frame = 'soft';
  if (lower.includes('high contrast') || lower.includes('logo')) style.errorLevel = 'H';
  return locked;
}

/**
 * The decision model: a style from the words, notes, and photos, with no network. The saved or on-screen style is the
 * starting point; cues in the text come first; then a photo's palette (unless a cue locked the colors); and last the
 * module color is darkened until it is scannable.
 */
export async function decideStyleFromContext(
  prompt: string,
  notes: string[],
  images: AgentImage[],
  current: Record<string, unknown> | undefined,
): Promise<StyleAgentStyle> {
  const style: StyleAgentStyle = {
    fgColor: currentField(current, 'fgColor', '#1e3a8a'),
    bgColor: currentField(current, 'bgColor', '#f9f9f8'),
    accentColor: currentField(current, 'accentColor', '#2563eb'),
    errorLevel: 'M',
    frame: currentField(current, 'frame', 'ring'),
    moduleColorMode: 'uniform',
    dotShape: 'square',
    summary: '',
  };
  const text = `${prompt}\n${notes.join('\n')}`.trim();
  const locked = applyStyleTextCues(text, style);
  if (!locked && images.length === 0) applySiteColorCues(text, style);

  if (!locked && images.length > 0) {
    const palette = await paletteFromImages(images);
    if (palette) {
      style.fgColor = palette.accent;
      style.bgColor = palette.background;
      style.accentColor = palette.accent;
    }
  }
  style.fgColor = darkenForScan(style.fgColor, style.bgColor);
  if (!style.accentColor) style.accentColor = style.fgColor;

  const lower = text.toLowerCase();
  const names = images.map((image) => image.name);
  if (lower.includes('print safe') || lower.includes('print-safe')) style.summary = 'Print safe';
  else if (names.length > 0) style.summary = `From ${names.join(', ')}`;
  else if (notes.length > 0) style.summary = 'From notes';
  else style.summary = 'From your prompt';
  if (names.length === 0) {
    const host = siteHostFromContext(text);
    if (host) style.summary = `From ${host}`;
  }
  return style;
}
