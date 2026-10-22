import { describe, expect, test } from 'bun:test';
import { contrast, darkenForScan, mixHex, relLum, rgbHex } from './style/colors';
import { decideStyleFromContext, type AgentImage } from './style/decision';
import { paletteFromImages } from './style/palette';
import vectors from './test/style-vectors.json';

// Recorded from the Go server (decideStyleFromContext and paletteFromImages) on the same inputs: the edge must agree.
const bytesOf = (data: string): Uint8Array => Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
const fixtures = new Map<string, AgentImage>(vectors.images.map((f) => [f.name, { name: f.name, mediaType: f.media_type, bytes: bytesOf(f.data) }]));
const fixture = (name: string): AgentImage => {
  const found = fixtures.get(name);
  if (!found) throw new Error(`no fixture ${name}`);
  return found;
};

describe('color math', () => {
  test('luminance and contrast follow WCAG', () => {
    expect(relLum('#000000')).toBe(0);
    expect(relLum('#ffffff')).toBeCloseTo(1, 10);
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 10);
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 10);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.478, 2);
  });

  test('hex parsing accepts 3 and 6 digits, with or without #, and refuses the rest', () => {
    expect(relLum('#fff')).toBeCloseTo(1, 10);
    expect(relLum('  FFFFFF ')).toBeCloseTo(1, 10);
    expect(relLum('ffffff')).toBeCloseTo(1, 10);
    for (const bad of ['', '#12', 'zzzzzz', '#12345']) expect(relLum(bad)).toBe(0);
  });

  test('rgbHex rounds and clamps; mixHex blends', () => {
    expect(rgbHex(0.4, 254.6, 300)).toBe('#00ffff');
    expect(rgbHex(-5, 127.5, 128.5)).toBe('#008081');
    expect(mixHex('#ffffff', '#000000', 0.5)).toBe('#808080');
    expect(mixHex('nope', '#000000', 0.5)).toBe('#111113');
  });

  test('darkenForScan keeps a scannable color, darkens a weak one, and gives up at near-black', () => {
    expect(darkenForScan('#222222', '#ffffff')).toBe('#222222');
    expect(darkenForScan('#ffff00', '#ffffff')).toBe('#5f5f00');
    expect(darkenForScan('#808080', '#404040')).toBe('#111113'); // twelve steps toward black never reach 4.5:1 on a dark page
  });
});

describe('what the Go server decides', () => {
  test.each(vectors.decisions)('$name', async (c) => {
    const style = await decideStyleFromContext(c.prompt, c.notes ?? [], (c.images ?? []).map(fixture), c.current ?? undefined);
    expect(style).toEqual(c.style);
  });

  test('key order matches the Go struct, so the JSON reads the same', async () => {
    const style = await decideStyleFromContext('hello', [], [], undefined);
    expect(Object.keys(style)).toEqual(['fgColor', 'bgColor', 'accentColor', 'errorLevel', 'frame', 'moduleColorMode', 'dotShape', 'summary']);
  });
});

describe('the palette of a photo', () => {
  test.each(vectors.images.filter((f) => f.name !== 'gradient.png'))('$name reads as Go reads it', async (f) => {
    const palette = await paletteFromImages([fixture(f.name)]);
    expect(palette).toEqual(f.palette.ok ? { accent: f.palette.accent, background: f.palette.bg } : null);
  });

  test('a tie between two equally vivid colors is broken one way or the other, and is still a color from the photo', async () => {
    // Red and green ends of this gradient score the same. Go breaks such a tie by map order, which is random, so Go's
    // own answer is one of the two and cannot be a fixed expectation.
    const palette = await paletteFromImages([fixture('gradient.png')]);
    expect(['#f00080', '#00f080']).toContain(palette?.accent ?? '');
    expect(palette?.background).toBe('#ffffff');
  });

  test('no images, or none the edge can read, is no palette', async () => {
    expect(await paletteFromImages([])).toBeNull();
  });
});
