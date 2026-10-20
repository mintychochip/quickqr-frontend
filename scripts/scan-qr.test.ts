import { describe, expect, test } from 'bun:test';
import { outputAlphabetQR } from '../src/lib/alphabets';
import { compress } from '../src/lib/compress';
import { dynamicQrValue, dynamicShortLink } from '../src/lib/dynamicQr';
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

  test('prefers the direct short link for a short code', () => {
    const qr = dynamicQrValue('https://quickqr.app', 'abc234');
    expect(qr).toBe('HTTPS://QUICKQR.APP/R/ABC234');
    expect(menuLocationFromScan(qr)).toBe('/r/abc234');
  });

  test('reads a compressed short link back to the code', () => {
    const short = dynamicShortLink('http://127.0.0.1:5186', 'abc234');
    const compressed = `HTTP://127.0.0.1:5186/${compress(short, outputAlphabetQR)}`;
    expect(menuLocationFromScan(compressed)).toBe('/r/abc234');
  });

  test('uses compression for codes outside the QR alphanumeric set', () => {
    const qr = dynamicQrValue('https://quickqr.app', 'wifi_guest');
    expect(qr).not.toContain('/R/');
    expect(menuLocationFromScan(qr)).toBe('/r/wifi_guest');
  });

  test('uses the compressed payload when it beats the direct short link', () => {
    const code = 'a'.repeat(80);
    const direct = `HTTPS://QUICKQR.APP/R/${code.toUpperCase()}`;
    const qr = dynamicQrValue('https://quickqr.app', code);
    expect(qr.length).toBeLessThan(direct.length);
    expect(qr).not.toContain('/R/');
    expect(menuLocationFromScan(qr)).toBe(`/r/${code}`);
  });

  test('rejects payloads that are not a menu link', () => {
    expect(menuLocationFromScan('https://example.com/menu')).toBeNull();
    expect(menuLocationFromScan('WIFI:S:cafe;;')).toBeNull();
    expect(menuLocationFromScan('')).toBeNull();
  });
});
