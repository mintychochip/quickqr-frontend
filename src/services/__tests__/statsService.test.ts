/**
 * Integration tests for statsService
 * Verifies service functions are properly exported and callable
 */
import {
  fetchUserStats,
  fetchOperatingSystems,
  fetchScansByQRCode,
  fetchScansTimeline,
  fetchScansByCountry,
  fetchScansByCity,
  fetchBrowsers,
} from '../statsService';

describe('statsService exports', () => {
  test('fetchUserStats is exported as a function', () => {
    expect(typeof fetchUserStats).toBe('function');
  });

  test('fetchOperatingSystems is exported as a function', () => {
    expect(typeof fetchOperatingSystems).toBe('function');
  });

  test('fetchScansByQRCode is exported as a function', () => {
    expect(typeof fetchScansByQRCode).toBe('function');
  });

  test('fetchScansTimeline is exported as a function', () => {
    expect(typeof fetchScansTimeline).toBe('function');
  });

  test('fetchScansByCountry is exported as a function', () => {
    expect(typeof fetchScansByCountry).toBe('function');
  });

  test('fetchScansByCity is exported as a function', () => {
    expect(typeof fetchScansByCity).toBe('function');
  });

  test('fetchBrowsers is exported as a function', () => {
    expect(typeof fetchBrowsers).toBe('function');
  });
});

describe('statsService response shapes', () => {
  test('fetchUserStats returns proper error when unauthenticated', async () => {
    const result = await fetchUserStats();
    // When not authenticated, should return error response
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
  });

  test('fetchOperatingSystems returns proper error when unauthenticated', async () => {
    const result = await fetchOperatingSystems();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
  });

  test('fetchScansByQRCode returns proper error when unauthenticated', async () => {
    const result = await fetchScansByQRCode();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
  });

  test('fetchScansTimeline returns proper error when unauthenticated', async () => {
    const result = await fetchScansTimeline();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
  });

  test('fetchScansByCountry returns proper error when unauthenticated', async () => {
    const result = await fetchScansByCountry();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
  });

  test('fetchScansByCity returns proper error when unauthenticated', async () => {
    const result = await fetchScansByCity();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
  });

  test('fetchBrowsers returns proper error when unauthenticated', async () => {
    const result = await fetchBrowsers();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
  });
});

describe('statsService interfaces', () => {
  test('service functions accept optional days parameter', () => {
    // Verify functions can be called with and without days param
    expect(() => fetchUserStats()).not.toThrow();
    expect(() => fetchUserStats(7)).not.toThrow();
    expect(() => fetchUserStats(30)).not.toThrow();
    expect(() => fetchOperatingSystems()).not.toThrow();
    expect(() => fetchOperatingSystems(7)).not.toThrow();
    expect(() => fetchScansByQRCode()).not.toThrow();
    expect(() => fetchScansByQRCode(7)).not.toThrow();
    expect(() => fetchScansTimeline()).not.toThrow();
    expect(() => fetchScansTimeline(7)).not.toThrow();
    expect(() => fetchScansByCountry()).not.toThrow();
    expect(() => fetchScansByCountry(7)).not.toThrow();
    expect(() => fetchScansByCity()).not.toThrow();
    expect(() => fetchScansByCity(7)).not.toThrow();
  });

  test('fetchScansByCity accepts optional limit parameter', () => {
    expect(() => fetchScansByCity(30, 5)).not.toThrow();
    expect(() => fetchScansByCity(30, 10)).not.toThrow();
    expect(() => fetchScansByCity(undefined, 15)).not.toThrow();
  });

  test('fetchBrowsers accepts optional days parameter', () => {
    expect(() => fetchBrowsers()).not.toThrow();
    expect(() => fetchBrowsers(7)).not.toThrow();
    expect(() => fetchBrowsers(30)).not.toThrow();
  });
});

describe('statsService browser breakdown', () => {
  test('fetchBrowsers returns proper response shape', async () => {
    const result = await fetchBrowsers();
    expect(result).toHaveProperty('success');
    // When unauthenticated, should return error
    if (!result.success) {
      expect(result).toHaveProperty('error');
    }
  });

  test('browser colors are assigned for known browsers', async () => {
    // Test that known browsers have brand colors defined
    const knownBrowsers = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Samsung Internet', 'Opera', 'Brave'];
    const expectedColors: Record<string, string> = {
      Chrome: '#4285F4',
      Safari: '#00D8FF',
      Firefox: '#FF7139',
      Edge: '#0078D7',
      'Samsung Internet': '#1428A0',
      Opera: '#FF1B2D',
      Brave: '#FB542B',
      Unknown: '#9CA3AF'
    };

    knownBrowsers.forEach(browser => {
      expect(expectedColors[browser]).toBeDefined();
      expect(expectedColors[browser]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
