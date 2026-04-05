/**
 * Basic tests for abuseDetectionService
 * Note: These tests require the Supabase RPC to be created (Task 9)
 */
import {
  checkQrContent,
  detectScanBot,
  detectQrFlooding,
  getUserAbuseStatus,
  incrementAbuseScore,
  logAbuseIncident,
  blockUser,
  runAbuseDetection,
} from '../abuseDetectionService';

describe('abuseDetectionService', () => {
  test('checkQrContent is exported', () => {
    expect(typeof checkQrContent).toBe('function');
  });

  test('detectScanBot is exported', () => {
    expect(typeof detectScanBot).toBe('function');
  });

  test('detectQrFlooding is exported', () => {
    expect(typeof detectQrFlooding).toBe('function');
  });

  test('getUserAbuseStatus is exported', () => {
    expect(typeof getUserAbuseStatus).toBe('function');
  });

  test('incrementAbuseScore is exported', () => {
    expect(typeof incrementAbuseScore).toBe('function');
  });

  test('logAbuseIncident is exported', () => {
    expect(typeof logAbuseIncident).toBe('function');
  });

  test('blockUser is exported', () => {
    expect(typeof blockUser).toBe('function');
  });

  test('runAbuseDetection is exported', () => {
    expect(typeof runAbuseDetection).toBe('function');
  });
});
