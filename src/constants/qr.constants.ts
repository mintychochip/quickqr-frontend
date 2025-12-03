// QR Code size constants (in pixels)
export const QR_SIZES = {
  LARGE: 240,
  MEDIUM: 180,
  SMALL: 120
} as const;

// Timing constants (in milliseconds)
export const TIMING = {
  TOGGLE_DEBOUNCE: 300,
  EXPANSION_DELAY: 1000,
  REGENERATION_DELAY: 100
} as const;

// Default QR code configuration
export const QR_DEFAULTS = {
  ERROR_CORRECTION: 'H' as const,
  LOGO_SIZE: 0.4,
  LOGO_MARGIN: 0,
  MARGIN: 0
} as const;
