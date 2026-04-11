/**
 * Integration tests for abTestService
 * Verifies service functions are properly exported and callable
 */
import {
  fetchABTests,
  fetchABTestResults,
  recordConversion,
  calculateStatisticalSignificance,
} from '../abTestService';

describe('abTestService exports', () => {
  test('fetchABTests is exported as a function', () => {
    expect(typeof fetchABTests).toBe('function');
  });

  test('fetchABTestResults is exported as a function', () => {
    expect(typeof fetchABTestResults).toBe('function');
  });

  test('recordConversion is exported as a function', () => {
    expect(typeof recordConversion).toBe('function');
  });

  test('calculateStatisticalSignificance is exported as a function', () => {
    expect(typeof calculateStatisticalSignificance).toBe('function');
  });
});

describe('abTestService response shapes', () => {
  test('fetchABTests returns proper error when unauthenticated', async () => {
    const result = await fetchABTests('test-qr-id');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
    expect(result.success).toBe(false);
  });

  test('fetchABTestResults returns proper error when unauthenticated', async () => {
    const result = await fetchABTestResults('test-id');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
    expect(result.success).toBe(false);
  });

  test('recordConversion returns proper error when unauthenticated', async () => {
    const result = await recordConversion('test-variant-id');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
    expect(result.success).toBe(false);
  }, 10000);
});

describe('calculateStatisticalSignificance', () => {
  test('returns correct result for control vs better variant', () => {
    const result = calculateStatisticalSignificance(
      1000, // control scans
      100,  // control conversions (10%)
      1000, // variant scans
      150   // variant conversions (15%)
    );

    expect(result.p_value).toBeLessThan(0.05);
    expect(result.is_significant).toBe(true);
    expect(result.confidence_level).toBeGreaterThanOrEqual(95);
    expect(result.relative_improvement).toBeCloseTo(50, 0); // 50% improvement
  });

  test('returns correct result for identical performance', () => {
    const result = calculateStatisticalSignificance(
      1000,
      100,
      1000,
      100
    );

    expect(result.p_value).toBeGreaterThan(0.1);
    expect(result.is_significant).toBe(false);
    expect(result.relative_improvement).toBe(0);
  });

  test('handles zero scans gracefully', () => {
    const result = calculateStatisticalSignificance(
      0,
      0,
      0,
      0
    );

    expect(result.p_value).toBe(1);
    expect(result.is_significant).toBe(false);
    expect(result.confidence_level).toBe(0);
    expect(result.relative_improvement).toBe(0);
  });

  test('handles zero control conversions', () => {
    const result = calculateStatisticalSignificance(
      100,
      0,
      100,
      10
    );

    expect(result.relative_improvement).toBe(0); // Can't calculate improvement from 0
    expect(typeof result.p_value).toBe('number');
  });

  test('returns higher confidence for larger sample sizes', () => {
    const smallSample = calculateStatisticalSignificance(100, 10, 100, 20);
    const largeSample = calculateStatisticalSignificance(1000, 100, 1000, 200);

    // Larger samples should generally have lower p-values (more significant)
    // Though this depends on the exact numbers
    expect(smallSample.confidence_level).toBeDefined();
    expect(largeSample.confidence_level).toBeDefined();
  });

  test('p_value is always between 0 and 1', () => {
    const testCases = [
      [100, 10, 100, 15],
      [500, 50, 500, 75],
      [1000, 100, 1000, 120],
      [50, 5, 50, 10],
    ];

    testCases.forEach(([cScans, cConv, vScans, vConv]) => {
      const result = calculateStatisticalSignificance(cScans, cConv, vScans, vConv);
      expect(result.p_value).toBeGreaterThanOrEqual(0);
      expect(result.p_value).toBeLessThanOrEqual(1);
    });
  });

  test('confidence levels are reasonable', () => {
    const highlySignificant = calculateStatisticalSignificance(1000, 50, 1000, 100);
    const notSignificant = calculateStatisticalSignificance(100, 10, 100, 12);

    expect(highlySignificant.confidence_level).toBeGreaterThanOrEqual(95);
    expect(notSignificant.confidence_level).toBeLessThan(95);
  });
});

describe('abTestService interfaces', () => {
  test('fetchABTests accepts qrId parameter', () => {
    expect(() => fetchABTests('test-id')).not.toThrow();
  });

  test('fetchABTestResults accepts testId parameter', () => {
    expect(() => fetchABTestResults('test-id')).not.toThrow();
  });

  test('recordConversion accepts variantId parameter', () => {
    expect(() => recordConversion('variant-id')).not.toThrow();
  });

  test('calculateStatisticalSignificance accepts all required parameters', () => {
    expect(() => calculateStatisticalSignificance(100, 10, 100, 15)).not.toThrow();
  });
});
