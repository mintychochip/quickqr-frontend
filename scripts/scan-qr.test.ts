import { describe, expect, test } from 'bun:test';
import { dynamicQrValue } from '../src/lib/dynamicQr';
import { menuLocationFromScan } from '../src/lib/scanQr';

describe('menuLocationFromScan', () => {
  test('keeps the menu code from a localhost QR', () => {
    expect(menuLocationFromScan('http://127.0.0.1:5186/r/abc234')).toBe('/r/abc234');
  });

  test('keeps the menu code from a LAN QR', () => {
    expect(menuLocationFromScan('http://192.168.0.9:5186/r/abc234')).toBe('/r/abc234');
  });

  test('accepts a path-only payload', () => {
    expect(menuLocationFromScan('/r/cafe-menu')).toBe('/r/cafe-menu');
  });

  test('reads a compressed short link back to the code', () => {
    const qr = dynamicQrValue('http://127.0.0.1:5186', 'abc234');
    expect(qr.startsWith('HTTP://127.0.0.1:5186/')).toBe(true);
    expect(qr.includes('/R/')).toBe(false);
    expect(menuLocationFromScan(qr)).toBe('/r/abc234');
    expect(menuLocationFromScan('HTTP://127.0.0.1:5186/R/ABC234')).toBe('/r/abc234');
  });

  test('rejects payloads that are not a menu link', () => {
    expect(menuLocationFromScan('https://example.com/menu')).toBeNull();
    expect(menuLocationFromScan('WIFI:S:cafe;;')).toBeNull();
    expect(menuLocationFromScan('')).toBeNull();
  });
});
