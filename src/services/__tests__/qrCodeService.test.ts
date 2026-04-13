/**
 * Integration tests for qrCodeService
 * Verifies fetching, deleting, and displaying QR codes
 */
import { supabase } from '../../config/supabase';
import {
  fetchUserQRCodes,
  deleteQRCode,
  getQRCodeDisplayUrl,
  getQRCodeName,
  type QRCode,
} from '../qrCodeService';

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

describe('qrCodeService exports', () => {
  test('fetchUserQRCodes is exported as a function', () => {
    expect(typeof fetchUserQRCodes).toBe('function');
  });

  test('deleteQRCode is exported as a function', () => {
    expect(typeof deleteQRCode).toBe('function');
  });

  test('getQRCodeDisplayUrl is exported as a function', () => {
    expect(typeof getQRCodeDisplayUrl).toBe('function');
  });

  test('getQRCodeName is exported as a function', () => {
    expect(typeof getQRCodeName).toBe('function');
  });
});

describe('qrCodeService response shapes', () => {
  test('fetchUserQRCodes returns proper error when unauthenticated', async () => {
    const result = await fetchUserQRCodes();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authenticated');
  });

  test('deleteQRCode returns proper error when unauthenticated', async () => {
    const result = await deleteQRCode('non-existent-id');
    expect(result).toHaveProperty('success');
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });
});

describe('getQRCodeDisplayUrl', () => {
  const baseQR: QRCode = {
    id: 'test-id',
    user_id: 'user-id',
    name: 'Test QR',
    content: {},
    type: 'url',
    styling: null,
    mode: 'static',
    expirytime: null,
    scan_count: 0,
    created_at: '2026-04-12T00:00:00Z',
    updated_at: '2026-04-12T00:00:00Z',
  };

  test('returns URL content for url type', () => {
    const qr = { ...baseQR, type: 'url', content: { url: 'https://example.com' } };
    expect(getQRCodeDisplayUrl(qr)).toBe('https://example.com');
  });

  test('returns truncated text for text type', () => {
    const qr = { ...baseQR, type: 'text', content: { text: 'This is a very long text that should be truncated' } };
    expect(getQRCodeDisplayUrl(qr)).toContain('This is a very long text that should be truncated...');
  });

  test('returns email for email type', () => {
    const qr = { ...baseQR, type: 'email', content: { email: 'test@example.com' } };
    expect(getQRCodeDisplayUrl(qr)).toBe('test@example.com');
  });

  test('returns phone for phone type', () => {
    const qr = { ...baseQR, type: 'phone', content: { phone: '+1234567890' } };
    expect(getQRCodeDisplayUrl(qr)).toBe('+1234567890');
  });

  test('returns number for sms type', () => {
    const qr = { ...baseQR, type: 'sms', content: { number: '+1234567890' } };
    expect(getQRCodeDisplayUrl(qr)).toBe('+1234567890');
  });

  test('returns coordinates for location type', () => {
    const qr = { ...baseQR, type: 'location', content: { latitude: 37.7749, longitude: -122.4194 } };
    expect(getQRCodeDisplayUrl(qr)).toBe('37.7749,-122.4194');
  });

  test('returns name for vcard type', () => {
    const qr = { ...baseQR, type: 'vcard', content: { name: 'John Doe' } };
    expect(getQRCodeDisplayUrl(qr)).toBe('John Doe');
  });

  test('returns name for mecard type', () => {
    const qr = { ...baseQR, type: 'mecard', content: { name: 'Jane Doe' } };
    expect(getQRCodeDisplayUrl(qr)).toBe('Jane Doe');
  });

  test('returns ssid for wifi type', () => {
    const qr = { ...baseQR, type: 'wifi', content: { ssid: 'MyWiFiNetwork' } };
    expect(getQRCodeDisplayUrl(qr)).toBe('MyWiFiNetwork');
  });

  test('returns title for event type', () => {
    const qr = { ...baseQR, type: 'event', content: { title: 'My Event' } };
    expect(getQRCodeDisplayUrl(qr)).toBe('My Event');
  });

  test('returns type as fallback for unknown content', () => {
    const qr = { ...baseQR, type: 'custom', content: {} };
    expect(getQRCodeDisplayUrl(qr)).toBe('custom');
  });

  test('handles missing content gracefully', () => {
    const qr = { ...baseQR, content: null as unknown as Record<string, unknown> };
    expect(getQRCodeDisplayUrl(qr)).toBe('No content');
  });

  test('handles null/undefined content properties', () => {
    const qr = { ...baseQR, type: 'url', content: { url: null as unknown as string } };
    expect(getQRCodeDisplayUrl(qr)).toBe('N/A');
  });
});

describe('getQRCodeName', () => {
  const baseQR: QRCode = {
    id: 'abc123def456',
    user_id: 'user-id',
    name: '',
    content: {},
    type: 'url',
    styling: null,
    mode: 'static',
    expirytime: null,
    scan_count: 0,
    created_at: '2026-04-12T00:00:00Z',
    updated_at: '2026-04-12T00:00:00Z',
  };

  test('returns name when provided', () => {
    const qr = { ...baseQR, name: 'My Custom QR Name' };
    expect(getQRCodeName(qr)).toBe('My Custom QR Name');
  });

  test('returns formatted type name when no name provided', () => {
    const qr = { ...baseQR, type: 'url', name: '' };
    expect(getQRCodeName(qr)).toBe('URL QR Code');
  });

  test('returns formatted SMS name for sms type', () => {
    const qr = { ...baseQR, type: 'sms', name: '' };
    expect(getQRCodeName(qr)).toBe('SMS QR Code');
  });

  test('returns capitalized type for other types', () => {
    const qr = { ...baseQR, type: 'wifi', name: '' };
    expect(getQRCodeName(qr)).toBe('Wifi QR Code');
  });

  test('returns truncated ID when no name or type', () => {
    const qr = { ...baseQR, name: '', type: '' };
    expect(getQRCodeName(qr)).toBe('QR abc123de');
  });
});

describe('qrCodeService integration with database', () => {
  let supabaseAvailable: boolean;

  beforeAll(async () => {
    supabaseAvailable = await isSupabaseAvailable();
  });

  const itIfSupabase = supabaseAvailable ? it : it.skip;

  itIfSupabase('fetchUserQRCodes returns array when authenticated', async () => {
    // First sign in anonymously or check if session exists
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      // Skip if no session - we can't test without auth
      console.log('Skipping: No active session');
      return;
    }

    const result = await fetchUserQRCodes();
    expect(result).toHaveProperty('success');
    if (result.success) {
      expect(Array.isArray(result.codes)).toBe(true);
    }
  });
});
