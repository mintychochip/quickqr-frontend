/**
 * Integration tests for statsService
 * Verifies service functions are properly exported and callable
 */
import {
  fetchUserStats,
  fetchOperatingSystems,
  fetchScansByQRCode,
  fetchScansTimeline,
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
  });
});
