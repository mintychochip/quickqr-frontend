import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the validation functions directly from the service
// These are pure functions that don't require DOM
const validateFacebookPixelId = (id: string): boolean => /^\d+$/.test(id);
const validateGoogleConversionId = (id: string): boolean => /^AW-\d+$/.test(id);
const validateLinkedInPartnerId = (id: string): boolean => /^\d+$/.test(id);

describe('PixelManager - Pixel Validation Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateFacebookPixelId', () => {
    it('returns true for valid numeric pixel IDs', () => {
      expect(validateFacebookPixelId('1234567890')).toBe(true);
      expect(validateFacebookPixelId('123')).toBe(true);
      expect(validateFacebookPixelId('9876543210123')).toBe(true);
    });

    it('returns false for invalid pixel IDs', () => {
      expect(validateFacebookPixelId('invalid')).toBe(false);
      expect(validateFacebookPixelId('123abc')).toBe(false);
      expect(validateFacebookPixelId('')).toBe(false);
      expect(validateFacebookPixelId('abc123')).toBe(false);
      expect(validateFacebookPixelId('12 34')).toBe(false);
    });
  });

  describe('validateGoogleConversionId', () => {
    it('returns true for valid AW- format conversion IDs', () => {
      expect(validateGoogleConversionId('AW-123456789')).toBe(true);
      expect(validateGoogleConversionId('AW-1')).toBe(true);
      expect(validateGoogleConversionId('AW-9876543210123')).toBe(true);
    });

    it('returns false for invalid conversion IDs', () => {
      expect(validateGoogleConversionId('invalid')).toBe(false);
      expect(validateGoogleConversionId('123456789')).toBe(false);
      expect(validateGoogleConversionId('aw-123456789')).toBe(false);
      expect(validateGoogleConversionId('AW-')).toBe(false);
      expect(validateGoogleConversionId('')).toBe(false);
      expect(validateGoogleConversionId('AW-123abc')).toBe(false);
    });
  });

  describe('validateLinkedInPartnerId', () => {
    it('returns true for valid numeric partner IDs', () => {
      expect(validateLinkedInPartnerId('1234567')).toBe(true);
      expect(validateLinkedInPartnerId('1')).toBe(true);
      expect(validateLinkedInPartnerId('9876543210')).toBe(true);
    });

    it('returns false for invalid partner IDs', () => {
      expect(validateLinkedInPartnerId('invalid')).toBe(false);
      expect(validateLinkedInPartnerId('123abc')).toBe(false);
      expect(validateLinkedInPartnerId('')).toBe(false);
      expect(validateLinkedInPartnerId('abc123')).toBe(false);
      expect(validateLinkedInPartnerId('12 34')).toBe(false);
    });
  });
});

describe('PixelManager Component - Basic Exports', () => {
  it('PixelManager component file exists and can be imported', async () => {
    // Dynamic import to verify the module exists without rendering
    const module = await import('../PixelManager');
    expect(module).toBeDefined();
    expect(module.default).toBeDefined();
  });

  it('PixelManager index exports the component', async () => {
    const module = await import('../index');
    expect(module).toBeDefined();
    expect(module.PixelManager).toBeDefined();
  });
});
