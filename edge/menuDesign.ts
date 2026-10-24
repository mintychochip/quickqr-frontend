import { StoreError } from './store/errors';

export const MENU_FONTS = ['serif', 'sans', 'mono'] as const;
export type MenuFont = (typeof MENU_FONTS)[number];

export interface MenuDesign {
  logoUrl: string;
  background: string;
  ink: string;
  accent: string;
  font: MenuFont;
}

export const DEFAULT_MENU_DESIGN: MenuDesign = {
  logoUrl: '',
  background: '#f3f3f5',
  ink: '#111113',
  accent: '#d7ff3c',
  font: 'sans',
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function color(value: unknown): string {
  const out = typeof value === 'string' ? value.trim() : '';
  if (!HEX.test(out)) throw new StoreError('invalid_menu');
  return out;
}

function logo(value: unknown): string {
  const out = typeof value === 'string' ? value.trim() : '';
  if (!out) return '';
  if (out.length > 500) throw new StoreError('invalid_menu');
  let parsed: URL;
  try {
    parsed = new URL(out);
  } catch {
    throw new StoreError('invalid_menu');
  }
  if (parsed.protocol !== 'https:' || !parsed.host || parsed.username || parsed.password) {
    throw new StoreError('invalid_menu');
  }
  return out;
}

export function normalizeMenuDesign(input: unknown): MenuDesign {
  if (input === undefined || input === null) return { ...DEFAULT_MENU_DESIGN };
  if (typeof input !== 'object' || Array.isArray(input)) throw new StoreError('invalid_menu');
  const record = input as Record<string, unknown>;
  const font = typeof record.font === 'string' ? record.font.trim() : DEFAULT_MENU_DESIGN.font;
  if (!MENU_FONTS.includes(font as MenuFont)) throw new StoreError('invalid_menu');
  return {
    logoUrl: logo(record.logoUrl),
    background: color(record.background ?? DEFAULT_MENU_DESIGN.background),
    ink: color(record.ink ?? DEFAULT_MENU_DESIGN.ink),
    accent: color(record.accent ?? DEFAULT_MENU_DESIGN.accent),
    font: font as MenuFont,
  };
}
