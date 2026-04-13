/**
 * Unit tests for image proxy utility functions
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { proxifyImageUrl, validateImageUrl, preloadImage } from '../imageProxy';

describe('imageProxy', () => {
  describe('proxifyImageUrl', () => {
    test('returns empty string for empty input', () => {
      expect(proxifyImageUrl('')).toBe('');
    });

    test('returns data URL unchanged', () => {
      const dataUrl = 'data:image/png;base64,abc123';
      expect(proxifyImageUrl(dataUrl)).toBe(dataUrl);
    });

    test('returns weserv URL unchanged', () => {
      const weservUrl = 'https://images.weserv.nl/?url=https://example.com/image.png';
      expect(proxifyImageUrl(weservUrl)).toBe(weservUrl);
    });

    test('wraps external URL with weserv proxy', () => {
      const externalUrl = 'https://example.com/image.png';
      const result = proxifyImageUrl(externalUrl);
      expect(result).toBe('https://images.weserv.nl/?url=https%3A%2F%2Fexample.com%2Fimage.png');
    });

    test('properly encodes URLs with special characters', () => {
      const urlWithParams = 'https://example.com/image.png?size=large&format=jpg';
      const result = proxifyImageUrl(urlWithParams);
      expect(result).toContain('images.weserv.nl');
      expect(result).not.toBe(urlWithParams);
    });

    test('handles HTTP URLs', () => {
      const httpUrl = 'http://example.com/image.jpg';
      const result = proxifyImageUrl(httpUrl);
      expect(result).toBe('https://images.weserv.nl/?url=http%3A%2F%2Fexample.com%2Fimage.jpg');
    });
  });

  describe('validateImageUrl', () => {
    let originalImage: typeof global.Image;

    beforeEach(() => {
      originalImage = global.Image;
    });

    afterEach(() => {
      global.Image = originalImage;
      vi.restoreAllMocks();
    });

    test('returns false for empty URL', async () => {
      const result = await validateImageUrl('');
      expect(result).toBe(false);
    });

    test('returns true for valid image', async () => {
      global.Image = class MockImage {
        crossOrigin: string = '';
        src: string = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 1);
        }
      } as any;

      const result = await validateImageUrl('https://example.com/valid.png');
      expect(result).toBe(true);
    });

    test('returns false for invalid image', async () => {
      global.Image = class MockImage {
        crossOrigin: string = '';
        src: string = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 1);
        }
      } as any;

      const result = await validateImageUrl('https://example.com/invalid.png');
      expect(result).toBe(false);
    });

    test('sets crossOrigin to anonymous', async () => {
      const imgInstances: any[] = [];
      global.Image = class MockImage {
        crossOrigin: string = '';
        src: string = '';
        onload: (() => void) | null = null;
        constructor() {
          imgInstances.push(this);
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 1);
        }
      } as any;

      await validateImageUrl('https://example.com/test.png');
      expect(imgInstances[0]?.crossOrigin).toBe('anonymous');
    });

    test('uses proxified URL for validation', async () => {
      const imgInstances: any[] = [];
      global.Image = class MockImage {
        crossOrigin: string = '';
        src: string = '';
        onload: (() => void) | null = null;
        constructor() {
          imgInstances.push(this);
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 1);
        }
      } as any;

      await validateImageUrl('https://example.com/image.png');
      expect(imgInstances[0]?.src).toContain('images.weserv.nl');
    });
  });

  describe('preloadImage', () => {
    let originalImage: typeof global.Image;

    beforeEach(() => {
      originalImage = global.Image;
    });

    afterEach(() => {
      global.Image = originalImage;
    });

    test('returns empty string for empty URL', async () => {
      const result = await preloadImage('');
      expect(result).toBe('');
    });

    test('returns proxified URL for valid image', async () => {
      global.Image = class MockImage {
        crossOrigin: string = '';
        src: string = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 1);
        }
      } as any;

      const result = await preloadImage('https://example.com/valid.png');
      expect(result).toContain('images.weserv.nl');
    });

    test('throws error for invalid image', async () => {
      global.Image = class MockImage {
        crossOrigin: string = '';
        src: string = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror();
          }, 1);
        }
      } as any;

      await expect(preloadImage('https://example.com/invalid.png')).rejects.toThrow(
        'Failed to load image'
      );
    });
  });
});
