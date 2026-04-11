/**
 * A/B Test Service
 * Handles A/B test management, results, and conversion tracking via Supabase
 */
import { supabase } from '../config/supabase';

export interface ABTest {
  id: string;
  qr_id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface ABVariant {
  id: string;
  test_id: string;
  name: string;
  url: string;
  weight: number;
  scan_count: number;
  conversion_count: number;
}

export interface ABVariantWithRate extends ABVariant {
  conversion_rate: number;
  is_control: boolean;
}

export interface ABTestResults {
  test: ABTest;
  variants: ABVariantWithRate[];
  total_scans: number;
  total_conversions: number;
  winner?: ABVariantWithRate;
  confidence_level?: number;
}

export interface FetchABTestsResponse {
  success: boolean;
  tests?: ABTest[];
  error?: string;
}

export interface FetchABTestResultsResponse {
  success: boolean;
  results?: ABTestResults;
  error?: string;
}

export interface RecordConversionResponse {
  success: boolean;
  error?: string;
}

export interface StatisticalSignificanceResult {
  p_value: number;
  is_significant: boolean;
  confidence_level: number;
  relative_improvement: number;
}

/**
 * Fetches all A/B tests for a QR code
 */
export async function fetchABTests(qrId: string): Promise<FetchABTestsResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify QR code ownership
    const { data: qrData, error: qrError } = await supabase
      .from('qrcodes')
      .select('user_id')
      .eq('id', qrId)
      .single();

    if (qrError || !qrData) {
      return { success: false, error: 'QR code not found' };
    }

    if (qrData.user_id !== user.id) {
      return { success: false, error: 'Not authorized' };
    }

    const { data: tests, error } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('qr_id', qrId)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, tests: tests || [] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch A/B tests',
    };
  }
}

/**
 * Fetches detailed results for an A/B test including conversion rates
 */
export async function fetchABTestResults(testId: string): Promise<FetchABTestResultsResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get test with QR ownership check
    const { data: test, error: testError } = await supabase
      .from('ab_tests')
      .select('*, qrcodes!inner(user_id)')
      .eq('id', testId)
      .single();

    if (testError || !test) {
      return { success: false, error: 'Test not found' };
    }

    // Check ownership through the joined qrcodes data
    const qrData = Array.isArray(test.qrcodes) ? test.qrcodes[0] : test.qrcodes;
    if (qrData?.user_id !== user.id) {
      return { success: false, error: 'Not authorized' };
    }

    // Get variants
    const { data: variants, error: variantsError } = await supabase
      .from('ab_variants')
      .select('*')
      .eq('test_id', testId)
      .order('created_at', { ascending: true });

    if (variantsError) {
      return { success: false, error: variantsError.message };
    }

    // Calculate conversion rates and identify control (first variant)
    const variantsWithRates: ABVariantWithRate[] = (variants || []).map((variant, index) => ({
      ...variant,
      conversion_rate: variant.scan_count > 0 
        ? (variant.conversion_count / variant.scan_count) * 100 
        : 0,
      is_control: index === 0,
    }));

    const totalScans = variantsWithRates.reduce((sum, v) => sum + v.scan_count, 0);
    const totalConversions = variantsWithRates.reduce((sum, v) => sum + v.conversion_count, 0);

    // Determine winner based on statistical significance
    let winner: ABVariantWithRate | undefined;
    let confidenceLevel: number | undefined;

    if (variantsWithRates.length >= 2 && totalScans > 0) {
      const control = variantsWithRates[0];
      
      // Find best performing variant
      const bestVariant = variantsWithRates.reduce((best, current) => 
        current.conversion_rate > best.conversion_rate ? current : best
      );

      if (bestVariant.id !== control.id) {
        const significance = calculateStatisticalSignificance(
          control.scan_count,
          control.conversion_count,
          bestVariant.scan_count,
          bestVariant.conversion_count
        );

        if (significance.is_significant) {
          winner = bestVariant;
          confidenceLevel = significance.confidence_level;
        }
      }
    }

    const results: ABTestResults = {
      test: {
        id: test.id,
        qr_id: test.qr_id,
        name: test.name,
        status: test.status,
        created_at: test.created_at,
        updated_at: test.updated_at,
      },
      variants: variantsWithRates,
      total_scans: totalScans,
      total_conversions: totalConversions,
      winner,
      confidence_level: confidenceLevel,
    };

    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch A/B test results',
    };
  }
}

/**
 * Records a conversion for an A/B test variant
 */
export async function recordConversion(variantId: string): Promise<RecordConversionResponse> {
  try {
    // Increment conversion count
    const { error } = await supabase
      .from('ab_variants')
      .update({ 
        conversion_count: supabase.rpc('increment', { amount: 1 }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', variantId);

    if (error) {
      // Fallback: try direct increment
      const { data: variant, error: fetchError } = await supabase
        .from('ab_variants')
        .select('conversion_count')
        .eq('id', variantId)
        .single();

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      const { error: updateError } = await supabase
        .from('ab_variants')
        .update({ 
          conversion_count: (variant?.conversion_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', variantId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record conversion',
    };
  }
}

/**
 * Calculates statistical significance between control and variant using chi-square test
 */
export function calculateStatisticalSignificance(
  controlScans: number,
  controlConversions: number,
  variantScans: number,
  variantConversions: number
): StatisticalSignificanceResult {
  // Calculate rates
  const controlRate = controlScans > 0 ? controlConversions / controlScans : 0;
  const variantRate = variantScans > 0 ? variantConversions / variantScans : 0;
  
  // Chi-square test
  const controlNonConversions = controlScans - controlConversions;
  const variantNonConversions = variantScans - variantConversions;

  const totalScans = controlScans + variantScans;
  const totalConversions = controlConversions + variantConversions;
  const totalNonConversions = controlNonConversions + variantNonConversions;

  if (totalScans === 0 || totalConversions === 0 || totalNonConversions === 0) {
    return {
      p_value: 1,
      is_significant: false,
      confidence_level: 0,
      relative_improvement: 0,
    };
  }

  // Expected values
  const expectedControlConversions = (controlScans * totalConversions) / totalScans;
  const expectedControlNonConversions = (controlScans * totalNonConversions) / totalScans;
  const expectedVariantConversions = (variantScans * totalConversions) / totalScans;
  const expectedVariantNonConversions = (variantScans * totalNonConversions) / totalScans;

  // Chi-square statistic
  let chiSquare = 0;
  
  const addToChiSquare = (observed: number, expected: number) => {
    if (expected > 0) {
      chiSquare += Math.pow(observed - expected, 2) / expected;
    }
  };

  addToChiSquare(controlConversions, expectedControlConversions);
  addToChiSquare(controlNonConversions, expectedControlNonConversions);
  addToChiSquare(variantConversions, expectedVariantConversions);
  addToChiSquare(variantNonConversions, expectedVariantNonConversions);

  // Approximate p-value for chi-square with 1 degree of freedom
  // Using approximation: p ≈ exp(-chiSquare/2) for chi-square > 1
  const pValue = chiSquare > 1 
    ? Math.exp(-chiSquare / 2) 
    : 1 - Math.sqrt(chiSquare / Math.PI); // Rough approximation for small values

  // Clamp p-value to [0, 1]
  const clampedPValue = Math.max(0, Math.min(1, pValue));

  // Determine significance and confidence level
  const isSignificant = clampedPValue < 0.05;
  
  let confidenceLevel = 0;
  if (clampedPValue < 0.01) confidenceLevel = 99;
  else if (clampedPValue < 0.05) confidenceLevel = 95;
  else if (clampedPValue < 0.1) confidenceLevel = 90;
  else confidenceLevel = Math.round((1 - clampedPValue) * 100);

  // Calculate relative improvement using the rates already computed
  const relativeImprovement = controlRate > 0 
    ? ((variantRate - controlRate) / controlRate) * 100 
    : 0;

  return {
    p_value: clampedPValue,
    is_significant: isSignificant,
    confidence_level: confidenceLevel,
    relative_improvement: relativeImprovement,
  };
}
