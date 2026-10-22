import { describe, expect, test } from 'bun:test';
import { detectBrowser, detectDevice } from './useragent';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const WINDOWS_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const LINUX_FIREFOX = 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0';

describe('what a scan came from', () => {
  test.each([
    [IPHONE, 'iOS', 'Safari'],
    [IPAD, 'iOS', 'Safari'],
    [ANDROID_CHROME, 'Android', 'Chrome'],
    [WINDOWS_CHROME, 'Desktop', 'Chrome'],
    [MAC_SAFARI, 'Desktop', 'Safari'],
    [LINUX_FIREFOX, 'Desktop', 'Firefox'],
    ['curl/8.4.0', 'Other', 'Mobile Browser'],
    ['', 'Other', 'Mobile Browser'],
  ])('%s', (ua, device, browser) => {
    expect([detectDevice(ua), detectBrowser(ua)]).toEqual([device, browser]);
  });

  test('an Android phone is not a desktop, although its user agent says Linux', () => {
    expect(ANDROID_CHROME.toLowerCase()).toContain('linux');
    expect(detectDevice(ANDROID_CHROME)).toBe('Android');
  });

  test('matching ignores case', () => {
    expect(detectDevice('IPHONE')).toBe('iOS');
    expect(detectDevice('WINDOWS')).toBe('Desktop');
    expect(detectBrowser('FIREFOX/1')).toBe('Firefox');
  });
});
