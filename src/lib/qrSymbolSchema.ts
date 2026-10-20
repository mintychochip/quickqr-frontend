/**
 * ISO/IEC 18004 symbol layers — what quickqr paints vs what must stay scannable.
 *
 * We encode payload + EC level with `qrcode`, then treat the bit matrix as a canvas:
 * colors, dot shapes, finder tint, gradients, and center logo are **presentation**.
 */

export type QrSymbolLayer =
  | 'payload' // immutable without re-encoding
  | 'error_correction' // L/M/Q/H — set at encode time; logo needs H
  | 'version_mask' // chosen by encoder
  | 'functional_patterns' // finders, timing, alignment — bits fixed; **colors** can tint
  | 'data_modules' // fully stylable if contrast holds
  | 'quiet_zone' // margin — stylable (bg color)
  | 'center_logo' // overlays data modules; uses EC redundancy, not part of spec payload
  | 'frame'; // UI chrome outside symbol

/** Human-readable guide for product / docs. */
export const QR_MUTABLE_GUIDE = {
  safeToStyle: [
    'Data module color, shape (square / rounded / dots)',
    'Finder & timing colors (keep contrast vs background)',
    'Background & quiet zone',
    'Center logo with white plate (≤ ~22% of symbol, error level H)',
    'Export frame (plain / soft / ring)',
  ],
  encodeTimeOnly: [
    'URL / payload text',
    'Error correction level (auto-raised to H when logo is on)',
    'QR version & mask pattern (library picks)',
  ],
  riskyOrAvoid: [
    'Hiding or reshaping finder “eyes” (breaks many camera apps)',
    'Low contrast module/background pairs',
    'Large logos or logo without H recovery',
    'Circle dots without testing on real phones',
  ],
} as const;

export type QrLogoMode = 'none' | 'brand' | 'custom';

/** Center logo occupies a square fraction of the **data area** (not including quiet zone). */
export const LOGO_SCALE_MIN = 0.12;
export const LOGO_SCALE_MAX = 0.26;
export const LOGO_SCALE_DEFAULT = 0.2;

/** SVG data URL — quickqr monogram for demos (no external asset). */
export const QUICKQR_BRAND_LOGO_DATA_URL =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1e3a8a"/><text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-size="26" font-weight="700" fill="#f9f9f8">qr</text></svg>`,
  );

export function effectiveErrorLevelForLogo(
  level: 'L' | 'M' | 'Q' | 'H',
  logoMode: QrLogoMode,
): 'L' | 'M' | 'Q' | 'H' {
  if (logoMode === 'none') return level;
  if (level === 'H') return 'H';
  return 'H';
}

export function logoImageSource(logoMode: QrLogoMode, customDataUrl?: string | null): string | null {
  if (logoMode === 'none') return null;
  if (logoMode === 'brand') return QUICKQR_BRAND_LOGO_DATA_URL;
  return customDataUrl?.trim() || null;
}
