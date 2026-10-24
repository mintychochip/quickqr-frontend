import type { MenuDesign, MenuFont } from '../types';

export const DEFAULT_MENU_DESIGN: MenuDesign = {
  logoUrl: '',
  background: '#f3f3f5',
  ink: '#111113',
  accent: '#d7ff3c',
  font: 'sans',
};

export const MENU_PRESETS: { id: string; name: string; design: MenuDesign }[] = [
  { id: 'bistro', name: 'Bistro', design: { logoUrl: '', background: '#f2ede4', ink: '#17130f', accent: '#b4532e', font: 'serif' } },
  { id: 'reading', name: 'Reading Room', design: { logoUrl: '', background: '#0e1a14', ink: '#eee7d7', accent: '#c8a56b', font: 'serif' } },
  { id: 'gallery', name: 'Gallery', design: { logoUrl: '', background: '#f5f3ee', ink: '#121212', accent: '#6f6a62', font: 'sans' } },
];

const HEX = /^#[0-9a-fA-F]{6}$/;
const FONTS: MenuFont[] = ['serif', 'sans', 'mono'];

export function contrastRatio(a: string, b: string): number {
  if (!HEX.test(a) || !HEX.test(b)) return 0;
  const luminance = (hex: string) => {
    const value = parseInt(hex.slice(1), 16);
    const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function validateMenuLogo(value: string): string {
  if (!value) return '';
  if (value.length > 500) return 'The logo URL is too long.';
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return 'Use a full https:// URL.';
  }
  if (parsed.protocol !== 'https:' || !parsed.host || parsed.username || parsed.password) {
    return 'Use a full https:// URL without a username or password.';
  }
  return '';
}

/** Validates a present design; an empty string means it can be saved. */
export function validateMenuDesign(design: MenuDesign): string {
  for (const colour of [design.background, design.ink, design.accent]) {
    if (!HEX.test(colour)) return 'Use six-digit hex colours, for example #0e1a14.';
  }
  if (!FONTS.includes(design.font)) return 'Choose one of the listed type styles.';
  return validateMenuLogo(design.logoUrl);
}
