/** #rgb or #rrggbb, with or without the #, as three channels from 0 to 255. Null when it is neither. */
export function parseHex(hex: string): [number, number, number] | null {
  let digits = hex.trim().replace(/^#/, '');
  if (digits.length === 3) digits = [...digits].map((d) => d + d).join('');
  if (digits.length < 6) return null;
  const six = digits.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(six)) return null;
  return [parseInt(six.slice(0, 2), 16), parseInt(six.slice(2, 4), 16), parseInt(six.slice(4, 6), 16)];
}

export function relLumRGB(r: number, g: number, b: number): number {
  const channel = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function relLum(hex: string): number {
  const rgb = parseHex(hex);
  return rgb ? relLumRGB(...rgb) : 0;
}

/** The WCAG contrast ratio between two colors, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [light, dark] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

export function rgbHex(r: number, g: number, b: number): string {
  const channel = (v: number): string => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** A blend of two colors: `t` of the way from `a` to `b`. A color it cannot read gives the default near-black. */
export function mixHex(a: string, b: string, t: number): string {
  const from = parseHex(a);
  const to = parseHex(b);
  if (!from || !to) return '#111113';
  return rgbHex(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, from[2] + (to[2] - from[2]) * t);
}

export function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
}

const MIN_SCAN_CONTRAST = 4.5;

/** The module color, darkened until a phone can tell it from the background. A color that is already dark enough is kept as written. */
export function darkenForScan(fg: string, bg: string): string {
  if (contrast(fg, bg) >= MIN_SCAN_CONTRAST && relLum(fg) < relLum(bg)) return fg;
  let next = fg;
  for (let i = 0; i < 12; i++) {
    next = mixHex(next, '#000000', 0.28);
    if (contrast(next, bg) >= MIN_SCAN_CONTRAST) return next;
  }
  return '#111113';
}
