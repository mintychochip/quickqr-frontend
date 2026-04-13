/**
 * Integration tests for adminService
 * Verifies service functions are properly exported and callable
 */
import {
  fetchAllQRCodes,
  updateQRCode,
  deleteQRCode,
  fetchAbuseIncidents,
  resolveAbuseIncident,
} from '../adminService';

describe('adminService exports', () => {
  test('fetchAllQRCodes is exported as a function', () => {
    expect(typeof fetchAllQRCodes).toBe('function');
  });

  test('updateQRCode is exported as a function', () => {
    expect(typeof updateQRCode).toBe('function');
  });

  test('deleteQRCode is exported as a function', () => {
    expect(typeof deleteQRCode).toBe('function');
  });

  test('fetchAbuseIncidents is exported as a function', () => {
    expect(typeof fetchAbuseIncidents).toBe('function');
  });

  test('resolveAbuseIncident is exported as a function', () => {
    expect(typeof resolveAbuseIncident).toBe('function');
  });
});

describe('adminService response shapes', () => {
  test('fetchAllQRCodes returns proper response shape when unauthenticated', async () => {
    const result = await fetchAllQRCodes();
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    } else {
      expect(result).toHaveProperty('codes');
      expect(Array.isArray(result.codes)).toBe(true);
    }
  }, 10000);

  test('updateQRCode returns proper response shape when unauthenticated', async () => {
    const result = await updateQRCode('test-qr-id', '{"url": "https://example.com"}');
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    } else {
      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    }
  }, 10000);

  test('deleteQRCode returns proper response shape when unauthenticated', async () => {
    const result = await deleteQRCode('test-qr-id');
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    } else {
      expect(result).toHaveProperty('message');
      expect(typeof result.message).toBe('string');
    }
  }, 10000);

  test('fetchAbuseIncidents returns proper response shape', async () => {
    const result = await fetchAbuseIncidents();
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    if (!result.success) {
      expect(result).toHaveProperty('error');
      expect(typeof result.error).toBe('string');
    } else {
      expect(result).toHaveProperty('incidents');
      expect(Array.isArray(result.incidents)).toBe(true);
    }
  }, 10000);

  test('resolveAbuseIncident returns proper response shape', async () => {
    const result = await resolveAbuseIncident('test-incident-id');
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  }, 10000);
});

describe('adminService error handling', () => {
  test('handles invalid QR code ID gracefully in update', async () => {
    const result = await updateQRCode('', '{"url": "https://example.com"}');
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  }, 10000);

  test('handles invalid QR code ID gracefully in delete', async () => {
    const result = await deleteQRCode('');
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  }, 10000);

  test('handles invalid incident ID gracefully in resolve', async () => {
    const result = await resolveAbuseIncident('');
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  }, 10000);

  test('handles malformed content in update gracefully', async () => {
    const result = await updateQRCode('test-id', 'not-valid-json');
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  }, 10000);
});
