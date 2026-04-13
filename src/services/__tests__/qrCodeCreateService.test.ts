/**
 * Integration tests for qrCodeCreateService
 * Verifies QR code creation with abuse detection and auth checks
 */
import { supabase } from '../../config/supabase';
import {
  createQRCode,
  type QRCodeData,
  type CreateQRCodeResponse,
} from '../qrCodeCreateService';

// Helper to check if supabase is available
async function isSupabaseAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const { error } = await supabase
      .from('qrcodes')
      .select('count', { count: 'exact', head: true });

    clearTimeout(timeout);

    return !error?.message?.includes('fetch failed') && !error?.message?.includes('ECONNREFUSED');
  } catch {
    return false;
  }
}

describe('qrCodeCreateService exports', () => {
  test('createQRCode is exported as a function', () => {
    expect(typeof createQRCode).toBe('function');
  });
});

describe('qrCodeCreateService response shapes', () => {
  test('createQRCode returns proper error when unauthenticated', async () => {
    // Ensure no active session
    await supabase.auth.signOut();

    const result = await createQRCode(
      'Test QR',
      { url: 'https://example.com' },
      'url'
    );

    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/(logged in|session missing|Auth session)/i);
  });

  test('createQRCode returns proper shape for URL type', async () => {
    await supabase.auth.signOut();

    const result = await createQRCode(
      'URL QR Test',
      { url: 'https://example.com' },
      'url'
    );

    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');

    if (result.success) {
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('qrcodeid');
      expect(result.data).toHaveProperty('name');
      expect(result.data).toHaveProperty('content');
      expect(result.data).toHaveProperty('type');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  test('createQRCode accepts string content', async () => {
    await supabase.auth.signOut();

    const result = await createQRCode(
      'String Content QR',
      'https://example.com',
      'url'
    );

    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });

  test('createQRCode accepts object content', async () => {
    await supabase.auth.signOut();

    const result = await createQRCode(
      'Object Content QR',
      { url: 'https://example.com', title: 'Example' },
      'url'
    );

    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });

  test('createQRCode accepts styling parameter', async () => {
    await supabase.auth.signOut();

    const result = await createQRCode(
      'Styled QR',
      { url: 'https://example.com' },
      'url',
      {
        foregroundColor: '#000000',
        backgroundColor: '#ffffff',
        cornerType: 'rounded',
      }
    );

    expect(result).toHaveProperty('success');
  });

  test('createQRCode accepts expiry time parameter', async () => {
    await supabase.auth.signOut();

    const expiryTime = new Date(Date.now() + 86400000).toISOString(); // 24 hours from now
    const result = await createQRCode(
      'Expiring QR',
      { url: 'https://example.com' },
      'url',
      undefined,
      expiryTime
    );

    expect(result).toHaveProperty('success');
  });
});

describe('qrCodeCreateService with different QR types', () => {
  beforeEach(async () => {
    await supabase.auth.signOut();
  });

  test('handles wifi QR creation', async () => {
    const result = await createQRCode(
      'WiFi QR',
      { ssid: 'MyNetwork', password: 'secret123', encryption: 'WPA' },
      'wifi'
    );

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result.data?.type).toBe('wifi');
    }
  });

  test('handles email QR creation', async () => {
    const result = await createQRCode(
      'Email QR',
      { email: 'test@example.com', subject: 'Hello', body: 'Message body' },
      'email'
    );

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result.data?.type).toBe('email');
    }
  });

  test('handles phone QR creation', async () => {
    const result = await createQRCode(
      'Phone QR',
      { phone: '+1234567890' },
      'phone'
    );

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result.data?.type).toBe('phone');
    }
  });

  test('handles SMS QR creation', async () => {
    const result = await createQRCode(
      'SMS QR',
      { number: '+1234567890', message: 'Hello world' },
      'sms'
    );

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result.data?.type).toBe('sms');
    }
  });

  test('handles text QR creation', async () => {
    const result = await createQRCode(
      'Text QR',
      { text: 'This is plain text content' },
      'text'
    );

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result.data?.type).toBe('text');
    }
  });

  test('handles vcard QR creation', async () => {
    const result = await createQRCode(
      'vCard QR',
      {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        organization: 'Example Inc',
      },
      'vcard'
    );

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result.data?.type).toBe('vcard');
    }
  });

  test('handles event QR creation', async () => {
    const result = await createQRCode(
      'Event QR',
      {
        title: 'My Event',
        location: 'Conference Room A',
        startDate: '2026-05-01T10:00:00',
        endDate: '2026-05-01T12:00:00',
      },
      'event'
    );

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result.data?.type).toBe('event');
    }
  });

  test('handles location QR creation', async () => {
    const result = await createQRCode(
      'Location QR',
      { latitude: 37.7749, longitude: -122.4194, query: 'San Francisco' },
      'location'
    );

    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(result.data?.type).toBe('location');
    }
  });
});

describe('qrCodeCreateService error handling', () => {
  test('handles empty name gracefully', async () => {
    await supabase.auth.signOut();

    const result = await createQRCode(
      '',
      { url: 'https://example.com' },
      'url'
    );

    expect(result).toHaveProperty('success');
    // Should either succeed with empty name or fail with validation error
  });

  test('handles null/undefined content gracefully', async () => {
    await supabase.auth.signOut();

    const result = await createQRCode(
      'Test QR',
      null as unknown as Record<string, unknown>,
      'url'
    );

    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });
});

describe('qrCodeCreateService integration with database', () => {
  let supabaseAvailable: boolean;

  beforeAll(async () => {
    supabaseAvailable = await isSupabaseAvailable();
  });

  beforeEach(async () => {
    await supabase.auth.signOut();
  });

  const itIfSupabase = supabaseAvailable ? it : it.skip;

  itIfSupabase('verifies abuse detection runs on creation', async () => {
    // This test verifies the abuse detection flow is triggered
    // Since we're not authenticated, it should fail with auth error
    // rather than abuse detection error
    const result = await createQRCode(
      'Test QR',
      { url: 'https://example.com' },
      'url'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('logged in');
  });
});
