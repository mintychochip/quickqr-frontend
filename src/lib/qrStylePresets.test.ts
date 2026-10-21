import { DEFAULT_QR_PRESET_ID, matchStylePreset } from './qrStylePresets';

describe('the look a code starts with', () => {
  test('a style prompt that says "default" asks for it', () => {
    for (const prompt of ['default', 'back to the default look', 'Make it default please']) {
      expect(matchStylePreset(prompt)?.id).toBe(DEFAULT_QR_PRESET_ID);
    }
  });

  test('the Brand look is still asked for by name', () => {
    for (const prompt of ['brand', 'the quickqr look', 'Brand blue on cream']) {
      expect(matchStylePreset(prompt)?.id).toBe('quickqr_brand');
    }
  });
});
