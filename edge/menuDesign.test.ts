import { describe, expect, it } from 'bun:test';
import { StoreError } from './store/errors';
import { DEFAULT_MENU_DESIGN, normalizeMenuDesign } from './menuDesign';

describe('normalizeMenuDesign', () => {
  it('accepts the default and preset-shaped values', () => {
    expect(normalizeMenuDesign(undefined)).toEqual(DEFAULT_MENU_DESIGN);
    expect(
      normalizeMenuDesign({
        background: '#f2ede4',
        ink: '#17130f',
        accent: '#b4532e',
        font: 'serif',
        logoUrl: '',
      }),
    ).toEqual({
      logoUrl: '',
      background: '#f2ede4',
      ink: '#17130f',
      accent: '#b4532e',
      font: 'serif',
    });
  });

  it('rejects malformed values with the mapped invalid-menu error', () => {
    const invalid = (input: unknown) => {
      try {
        normalizeMenuDesign(input);
      } catch (err) {
        expect(err).toBeInstanceOf(StoreError);
        expect((err as StoreError).code).toBe('invalid_menu');
        return;
      }
      throw new Error('expected normalizeMenuDesign to throw');
    };

    for (const bad of ['red', '#fff', '#12345g', 'rgb(1,1,1)', '#fff;}</style>']) {
      invalid({ ...DEFAULT_MENU_DESIGN, background: bad });
    }
    invalid({ ...DEFAULT_MENU_DESIGN, font: 'comic' });
    for (const bad of [
      'javascript:alert(1)',
      'http://example.com/x.png',
      '//example.com/x.png',
      'data:image/png;base64,AA',
      'https://user:pass@example.com/x.png',
    ]) {
      invalid({ ...DEFAULT_MENU_DESIGN, logoUrl: bad });
    }
  });

  it('accepts an https logo with a host', () => {
    expect(
      normalizeMenuDesign({
        ...DEFAULT_MENU_DESIGN,
        logoUrl: 'https://sites.quickqr.app/abc/logo.png',
      }).logoUrl,
    ).toBe('https://sites.quickqr.app/abc/logo.png');
  });
});
