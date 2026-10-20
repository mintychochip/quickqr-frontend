import {
  matchStylePreset,
  STYLE_PROMPT_CHIPS,
  withQrStyleDefaults,
  type QrErrorLevel,
  type QrFrameStyle,
  type QrStylePreset,
  type QrStyleResult,
} from './qrStylePresets';

export type { QrErrorLevel, QrFrameStyle, QrStyleResult };
export type { QrDotShape, QrModuleColorMode } from './qrStylePresets';
export { STYLE_PROMPT_CHIPS, withQrStyleDefaults };

const NAMED_COLORS: Record<string, string> = {
  black: '#0a0a0a',
  white: '#ffffff',
  navy: '#1e3a5f',
  blue: '#2563eb',
  royal: '#1d4ed8',
  sky: '#0ea5e9',
  teal: '#0d9488',
  green: '#15803d',
  emerald: '#059669',
  lime: '#65a30d',
  yellow: '#ca8a04',
  gold: '#b45309',
  orange: '#ea580c',
  red: '#dc2626',
  rose: '#e11d48',
  pink: '#db2777',
  purple: '#7c3aed',
  violet: '#6d28d9',
  indigo: '#4f46e5',
  slate: '#334155',
  gray: '#525252',
  grey: '#525252',
  charcoal: '#27272a',
  cream: '#faf7f0',
  ivory: '#fffff0',
  beige: '#f5f0e6',
  sand: '#f4ede4',
  mint: '#ecfdf5',
  lavender: '#f5f3ff',
  blush: '#fff1f2',
  coral: '#fff7ed',
};

const MIN_SCAN_CONTRAST = 4.5;

export function lookupNamedColor(name: string): string | null {
  return NAMED_COLORS[name.trim().toLowerCase()] ?? null;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = Number.parseInt(h.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')}`;
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(fgHex: string, bgHex: string): number {
  const L1 = relativeLuminance(fgHex);
  const L2 = relativeLuminance(bgHex);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function mixTowardBlack(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  const f = 1 - amount;
  return rgbToHex(r * f, g * f, b * f);
}

function mixTowardWhite(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function ensureScannableContrast(
  fgColor: string,
  bgColor: string,
): { fgColor: string; bgColor: string; adjusted: boolean } {
  if (contrastRatio(fgColor, bgColor) >= MIN_SCAN_CONTRAST) {
    return { fgColor, bgColor, adjusted: false };
  }

  for (let step = 1; step <= 24; step++) {
    const tryFg = mixTowardBlack(fgColor, step * 0.04);
    if (contrastRatio(tryFg, bgColor) >= MIN_SCAN_CONTRAST) {
      return { fgColor: tryFg, bgColor, adjusted: true };
    }
  }

  for (let step = 1; step <= 24; step++) {
    const tryBg = mixTowardWhite(bgColor, step * 0.04);
    if (contrastRatio(fgColor, tryBg) >= MIN_SCAN_CONTRAST) {
      return { fgColor, bgColor: tryBg, adjusted: true };
    }
  }

  return { fgColor: '#000000', bgColor: '#ffffff', adjusted: true };
}

export function finalizeQrStyle(result: QrStyleResult): QrStyleResult {
  const { fgColor, bgColor, adjusted } = ensureScannableContrast(result.fgColor, result.bgColor);
  if (!adjusted) {
    return result;
  }
  return {
    ...result,
    fgColor,
    bgColor,
    summary: `${result.summary} · boosted contrast for scanning`,
  };
}

/** Strip phrases where a color word is explicitly a background, not module color. */
function textForForegroundColorSearch(text: string): string {
  return text
    .replace(/\b[a-z]+\s+(?:background|backdrop)\b/gi, ' ')
    .replace(/\b(?:background|backdrop|bg)\s+[a-z]+\b/gi, ' ')
    .replace(/\bon\s+[a-z]+\b/gi, ' ');
}

export function findNamedColorInText(text: string, role: 'fg' | 'bg'): string | null {
  if (role === 'bg') {
    const bgPatterns = [
      /\b(?:background|backdrop|bg)\s+(?:is\s+)?([a-z]+)\b/i,
      /\b([a-z]+)\s+(?:background|backdrop)\b/i,
    ];
    for (const pattern of bgPatterns) {
      const m = text.match(pattern);
      const name = m?.[1]?.toLowerCase();
      if (name && NAMED_COLORS[name]) {
        return NAMED_COLORS[name];
      }
    }
    return null;
  }

  const fgPatterns = [
    /\b(?:modules?|foreground|code)\s+(?:is\s+)?([a-z]+)\b/i,
    /\b(?:make\s+it|use|paint)\s+([a-z]+)\b/i,
    /^([a-z]+)\s+on\s+[a-z]+\b/i,
  ];
  for (const pattern of fgPatterns) {
    const m = text.match(pattern);
    const name = m?.[1]?.toLowerCase();
    if (name && NAMED_COLORS[name]) {
      return NAMED_COLORS[name];
    }
  }

  const fgSearch = textForForegroundColorSearch(text);
  for (const [name, hex] of Object.entries(NAMED_COLORS)) {
    if (new RegExp(`\\b${name}\\b`, 'i').test(fgSearch)) {
      return hex;
    }
  }
  return null;
}

export function hexFromRgbPhrase(text: string): string | null {
  const m = text.match(/#([0-9a-f]{3,8})\b/i);
  return m ? `#${m[1]}` : null;
}

export type StyleDecisionTrace = {
  engine: 'decision';
  preset: string | null;
  decisions: string[];
};

type StyleSignals = {
  preset: QrStylePreset | null;
  hex: string | null;
  hexIsBackground: boolean;
  fgOnBg: { fg: string; bg: string; label: string } | null;
  fgNamed: string | null;
  bgNamed: string | null;
  highContrast: boolean;
  logoOverlay: boolean;
  minimal: boolean;
  framed: boolean;
  softFrame: boolean;
};

function extractStyleSignals(prompt: string, text: string): StyleSignals {
  const preset = matchStylePreset(text);
  const hex = hexFromRgbPhrase(text);
  const hexIsBackground = hex !== null && /\b(bg|background|back)\b/i.test(prompt);

  const onMatch = text.match(/\b([a-z]+)\s+on\s+([a-z]+)\b/);
  let fgOnBg: StyleSignals['fgOnBg'] = null;
  if (onMatch) {
    fgOnBg = {
      fg: onMatch[1],
      bg: onMatch[2],
      label: `${onMatch[1]} on ${onMatch[2]}`,
    };
  }

  return {
    preset,
    hex,
    hexIsBackground,
    fgOnBg,
    fgNamed: findNamedColorInText(text, 'fg'),
    bgNamed: findNamedColorInText(text, 'bg'),
    highContrast: /\b(high contrast|bold|strong|print safe)\b/i.test(text),
    logoOverlay: /\b(logo|center image|watermark)\b/i.test(text),
    minimal: /\b(subtle|minimal|clean)\b/i.test(text),
    framed: /\b(frame|border|card|polished)\b/i.test(text),
    softFrame: /\b(soft|rounded|friendly)\b/i.test(text),
  };
}

function baseStyleFromCurrent(current?: Partial<QrStyleResult>): QrStyleResult {
  return {
    fgColor: current?.fgColor ?? '#0f172a',
    bgColor: current?.bgColor ?? '#ffffff',
    errorLevel: current?.errorLevel ?? 'M',
    frame: current?.frame ?? 'plain',
    summary: 'Updated style',
  };
}

/** On-device decision model: signals → ordered rules → contrast guard. */
export function decideQrStyle(
  prompt: string,
  current?: Partial<QrStyleResult>,
): { result: QrStyleResult; trace: StyleDecisionTrace } {
  const text = prompt.trim().toLowerCase();
  const trace: StyleDecisionTrace = { engine: 'decision', preset: null, decisions: [] };

  if (!text) {
    return {
      result: finalizeQrStyle({ ...baseStyleFromCurrent(current), summary: 'No changes' }),
      trace,
    };
  }

  const signals = extractStyleSignals(prompt, text);

  if (signals.preset) {
    trace.preset = signals.preset.summary;
    trace.decisions.push(`preset:${signals.preset.summary}`);
    return { result: finalizeQrStyle({ ...signals.preset.style }), trace };
  }

  let next = baseStyleFromCurrent(current);

  if (signals.hex) {
    if (signals.hexIsBackground) {
      next.bgColor = signals.hex;
      trace.decisions.push(`hex:bg:${signals.hex}`);
    } else {
      next.fgColor = signals.hex;
      trace.decisions.push(`hex:fg:${signals.hex}`);
    }
  }

  if (signals.fgOnBg) {
    next.fgColor = lookupNamedColor(signals.fgOnBg.fg) ?? next.fgColor;
    next.bgColor = lookupNamedColor(signals.fgOnBg.bg) ?? next.bgColor;
    next.summary = signals.fgOnBg.label;
    trace.decisions.push(`pair:${signals.fgOnBg.label}`);
  } else {
    if (signals.fgNamed) {
      next.fgColor = signals.fgNamed;
      trace.decisions.push('color:fg');
    }
    if (signals.bgNamed) {
      next.bgColor = signals.bgNamed;
      trace.decisions.push('color:bg');
    }
  }

  if (signals.highContrast) {
    next.fgColor = '#000000';
    next.bgColor = '#ffffff';
    next.errorLevel = 'H';
    trace.decisions.push('recovery:high-contrast');
  }
  if (signals.logoOverlay) {
    next.errorLevel = 'H';
    trace.decisions.push('recovery:logo-overlay');
  }

  if (signals.minimal) {
    next.frame = 'plain';
    next.errorLevel = next.errorLevel === 'H' ? 'H' : 'M';
    trace.decisions.push('frame:minimal');
  }
  if (signals.framed) {
    next.frame = 'ring';
    trace.decisions.push('frame:ring');
  }
  if (signals.softFrame && next.frame === 'plain') {
    next.frame = 'soft';
    trace.decisions.push('frame:soft');
  }

  if (!signals.fgOnBg && trace.decisions.length > 0) {
    const parts: string[] = [];
    if (signals.fgNamed || signals.bgNamed || signals.hex) parts.push('Custom colors');
    if (signals.highContrast || signals.logoOverlay) parts.push(`${next.errorLevel} recovery`);
    if (signals.framed || signals.softFrame || signals.minimal) parts.push(`${next.frame} frame`);
    next.summary = parts.length ? parts.join(' · ') : 'Tweaked style';
  }

  trace.decisions.push('contrast:guard');
  return { result: finalizeQrStyle(next), trace };
}

export type StyleParseMeta = {
  engine: 'decision' | 'jev' | 'llm' | 'agent';
  trace?: StyleDecisionTrace;
  confidence?: number;
};

export type StyleContextImage = {
  name: string;
  mediaType: string;
  dataBase64: string;
};

export type StyleContextNote = {
  name: string;
  text: string;
};

export function parseQrStylePrompt(prompt: string, current?: Partial<QrStyleResult>): QrStyleResult {
  return decideQrStyle(prompt, current).result;
}

export async function resolveQrStylePrompt(
  prompt: string,
  current?: Partial<QrStyleResult>,
): Promise<{ result: QrStyleResult; meta: StyleParseMeta }> {
  try {
    const configRes = await fetch('/api/qr/style-parser');
    if (configRes.ok) {
      const config = (await configRes.json()) as {
        jev_available?: boolean;
        llm_available?: boolean;
      };
      if (config.jev_available || config.llm_available) {
        const res = await fetch('/api/qr/style-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, current }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            result: QrStyleResult;
            engine?: 'jev' | 'llm';
            confidence?: number;
          };
          const engine = data.engine === 'jev' ? 'jev' : 'llm';
          return {
            result: finalizeQrStyle(data.result),
            meta: { engine, confidence: data.confidence },
          };
        }
      }
    }
  } catch {
    // Offline or API down: decision model always works locally.
  }

  const { result, trace } = decideQrStyle(prompt, current);
  return { result, meta: { engine: 'decision', trace } };
}

/** Ask the style agent to read a prompt plus attached photos and notes. */
export async function resolveQrStyleContext(
  prompt: string,
  images: StyleContextImage[],
  notes: StyleContextNote[],
  current?: Partial<QrStyleResult>,
): Promise<{ result: QrStyleResult; meta: StyleParseMeta }> {
  const res = await fetch('/api/qr/style-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      notes: notes.map((note) => `file:${note.name}\n${note.text}`),
      images: images.map((image) => ({
        name: image.name,
        media_type: image.mediaType,
        data: image.dataBase64,
      })),
      current,
      decision_only: true,
    }),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || 'Could not read that context');
  }
  const data = (await res.json()) as {
    result?: QrStyleResult;
    style?: QrStyleResult;
    engine?: string;
  };
  const result = data.style ?? data.result;
  if (!result) throw new Error('Style agent returned no style');
  return {
    result: finalizeQrStyle(result),
    meta: { engine: data.engine === 'xai' ? 'agent' : 'decision' },
  };
}

