import {
  effectiveErrorLevelForLogo,
  LOGO_SCALE_DEFAULT,
  type QrLogoMode,
} from './qrSymbolSchema';

export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H';
export type QrFrameStyle = 'plain' | 'soft' | 'ring';
/** How module (dot) colors are painted — requires custom matrix renderer, not stock qrcode two-color API. */
export type QrModuleColorMode = 'uniform' | 'finder_accent' | 'gradient';
export type QrDotShape = 'square' | 'rounded' | 'circle';

export type { QrLogoMode };

export interface QrStyleResult {
  fgColor: string;
  bgColor: string;
  /** Second module color (finder corners or gradient end). Defaults to fgColor. */
  accentColor?: string;
  errorLevel: QrErrorLevel;
  frame: QrFrameStyle;
  margin?: number;
  moduleColorMode?: QrModuleColorMode;
  dotShape?: QrDotShape;
  /** Center logo overlays data modules (requires H recovery). */
  logoMode?: QrLogoMode;
  /** Data URL when logoMode is custom (file upload). */
  logoDataUrl?: string | null;
  /** Logo width as fraction of symbol data area. */
  logoScale?: number;
  summary: string;
}

export function withQrStyleDefaults(partial: QrStyleResult): Required<
  Pick<
    QrStyleResult,
    'accentColor' | 'margin' | 'moduleColorMode' | 'dotShape' | 'logoMode' | 'logoScale'
  >
> &
  QrStyleResult {
  const logoMode = partial.logoMode ?? 'none';
  const errorLevel = effectiveErrorLevelForLogo(partial.errorLevel ?? 'M', logoMode);
  return {
    ...partial,
    accentColor: partial.accentColor ?? partial.fgColor,
    margin: partial.margin ?? 2,
    moduleColorMode: partial.moduleColorMode ?? 'uniform',
    dotShape: partial.dotShape ?? 'square',
    logoMode,
    logoDataUrl: partial.logoDataUrl ?? null,
    logoScale: partial.logoScale ?? LOGO_SCALE_DEFAULT,
    errorLevel,
  };
}

/** Stable id shared with backend Jev `style_template` choices where applicable. */
export type QrStylePresetId =
  | 'print_safe'
  | 'quickqr_brand'
  | 'dark_elegant'
  | 'pastel_menu'
  | 'outdoor'
  | 'navy_on_cream'
  | 'black_on_white'
  | 'teal_on_mint'
  | 'indigo_on_lavender'
  | 'emerald_on_ivory'
  | 'slate_on_sand'
  | 'rose_on_blush';

export type QrStylePresetDef = {
  id: QrStylePresetId;
  label: string;
  /** Natural-language chip / example prompt */
  promptExample: string;
  match: RegExp;
  style: QrStyleResult;
};

export const QR_STYLE_PRESETS: QrStylePresetDef[] = [
  {
    id: 'print_safe',
    label: 'Print safe',
    promptExample: 'Print safe black on white',
    match: /\b(print|flyer|poster|sticker|print safe)\b/i,
    style: {
      fgColor: '#000000',
      bgColor: '#ffffff',
      errorLevel: 'H',
      frame: 'plain',
      summary: 'High-contrast print preset',
    },
  },
  {
    id: 'black_on_white',
    label: 'Black on white',
    promptExample: 'Black on white maximum contrast',
    match: /\bblack\s+on\s+white\b/i,
    style: {
      fgColor: '#0a0a0a',
      bgColor: '#ffffff',
      errorLevel: 'H',
      frame: 'plain',
      summary: 'Black on white',
    },
  },
  {
    id: 'quickqr_brand',
    label: 'Brand',
    promptExample: 'Brand blue on cream',
    match: /\b(brand|quickqr|default)\b/i,
    style: {
      fgColor: '#1e3a8a',
      bgColor: '#f9f9f8',
      accentColor: '#2563eb',
      errorLevel: 'M',
      frame: 'ring',
      moduleColorMode: 'finder_accent',
      logoMode: 'brand',
      summary: 'quickqr brand look',
    },
  },
  {
    id: 'navy_on_cream',
    label: 'Navy on cream',
    promptExample: 'Navy on cream',
    match: /\bnavy\s+on\s+cream\b/i,
    style: {
      fgColor: '#1e3a5f',
      bgColor: '#faf7f0',
      errorLevel: 'M',
      frame: 'soft',
      summary: 'Navy on cream',
    },
  },
  {
    id: 'dark_elegant',
    label: 'Dark elegant',
    promptExample: 'Dark elegant',
    match: /\b(dark|night|elegant|luxury)\b/i,
    style: {
      fgColor: '#f8fafc',
      bgColor: '#0f172a',
      errorLevel: 'Q',
      frame: 'soft',
      summary: 'Dark elegant theme',
    },
  },
  {
    id: 'pastel_menu',
    label: 'Pastel menu',
    promptExample: 'Pastel menu',
    match: /\b(pastel|menu|cafe|bakery)\b/i,
    style: {
      fgColor: '#9d174d',
      bgColor: '#fff1f2',
      errorLevel: 'M',
      frame: 'soft',
      summary: 'Soft pastel menu style',
    },
  },
  {
    id: 'rose_on_blush',
    label: 'Rose on blush',
    promptExample: 'Rose QR on blush background',
    match: /\brose\s+on\s+blush\b/i,
    style: {
      fgColor: '#e11d48',
      bgColor: '#fff1f2',
      errorLevel: 'M',
      frame: 'soft',
      summary: 'Rose on blush',
    },
  },
  {
    id: 'outdoor',
    label: 'Outdoor',
    promptExample: 'Outdoor high recovery',
    match: /\b(outdoor|sun|fade|weather|high recovery)\b/i,
    style: {
      fgColor: '#0f172a',
      bgColor: '#ffffff',
      errorLevel: 'H',
      frame: 'plain',
      summary: 'Outdoor / sun-fade resistant',
    },
  },
  {
    id: 'teal_on_mint',
    label: 'Teal on mint',
    promptExample: 'Teal on mint',
    match: /\bteal\s+on\s+mint\b/i,
    style: {
      fgColor: '#0d9488',
      bgColor: '#ecfdf5',
      errorLevel: 'M',
      frame: 'soft',
      summary: 'Teal on mint',
    },
  },
  {
    id: 'indigo_on_lavender',
    label: 'Indigo on lavender',
    promptExample: 'Indigo on lavender',
    match: /\bindigo\s+on\s+lavender\b/i,
    style: {
      fgColor: '#4f46e5',
      bgColor: '#f5f3ff',
      errorLevel: 'M',
      frame: 'ring',
      summary: 'Indigo on lavender',
    },
  },
  {
    id: 'emerald_on_ivory',
    label: 'Emerald on ivory',
    promptExample: 'Emerald on ivory',
    match: /\bemerald\s+on\s+ivory\b/i,
    style: {
      fgColor: '#059669',
      bgColor: '#fffff0',
      errorLevel: 'M',
      frame: 'plain',
      summary: 'Emerald on ivory',
    },
  },
  {
    id: 'slate_on_sand',
    label: 'Slate on sand',
    promptExample: 'Slate on sand',
    match: /\bslate\s+on\s+sand\b/i,
    style: {
      fgColor: '#334155',
      bgColor: '#f4ede4',
      errorLevel: 'M',
      frame: 'soft',
      summary: 'Slate on sand',
    },
  },
];

export const QR_STYLE_PRESET_BY_ID: Record<QrStylePresetId, QrStylePresetDef> = Object.fromEntries(
  QR_STYLE_PRESETS.map((p) => [p.id, p]),
) as Record<QrStylePresetId, QrStylePresetDef>;

export type QrStylePreset = { id: QrStylePresetId; summary: string; style: QrStyleResult };

export function matchStylePreset(text: string): (QrStylePreset & { def: QrStylePresetDef }) | null {
  for (const def of QR_STYLE_PRESETS) {
    if (def.match.test(text)) {
      return {
        id: def.id,
        summary: def.style.summary,
        style: { ...def.style },
        def,
      };
    }
  }
  return null;
}

export function presetStyleById(id: QrStylePresetId): QrStyleResult {
  return { ...QR_STYLE_PRESET_BY_ID[id].style };
}

/** Three starter prompts under the style field. The full preset list stays available above. */
export const STYLE_PROMPT_CHIPS = [
  'Print safe black on white',
  'Brand blue on cream',
  'Navy on cream',
] as const;
