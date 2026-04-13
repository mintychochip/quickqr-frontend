/**
 * QR Code Service Integration Tests
 * Uses Supabase test environment with real authentication flows
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchUserQRCodes,
  deleteQRCode,
  getQRCodeDisplayUrl,
  getQRCodeName,
  type QRCode,
} from '../qrCodeService';
import { supabase } from '../../config/supabase';

// Mock Supabase
vi.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('qrCodeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchUserQRCodes', () => {
    it('should fetch QR codes successfully for authenticated user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockQRCodes = [
        {
          id: 'qr-1',
          user_id: 'user-123',
          name: 'Test QR 1',
          content: { url: 'https://example.com' },
          type: 'url',
          styling: null,
          mode: 'static',
          expirytime: null,
          scan_count: 5,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'qr-2',
          user_id: 'user-123',
          name: 'Test QR 2',
          content: { text: 'Hello World' },
          type: 'text',
          styling: { color: '#000000' },
          mode: 'dynamic',
          expirytime: '2024-12-31T23:59:59Z',
          scan_count: 0,
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-16T10:00:00Z',
        },
      ];

      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });
      
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockResolvedValue({ data: mockQRCodes, error: null });
      
      (supabase.from as any).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            order: mockOrder.mockReturnValue({
              limit: mockLimit,
            }),
          }),
        }),
      });

      const result = await fetchUserQRCodes();

      expect(result.success).toBe(true);
      expect(result.codes).toHaveLength(2);
      expect(result.codes?.[0].qrcodeid).toBe('qr-1');
      expect(result.codes?.[0].createdat).toBe('2024-01-15T10:00:00Z');
      expect(supabase.from).toHaveBeenCalledWith('qrcodes');
    });

    it('should return error when user is not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: null } });

      const result = await fetchUserQRCodes();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('should handle database errors gracefully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      (supabase.auth.getUser as any).mockResolvedValue({ data: { user: mockUser } });
      
      const mockLimit = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      });
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: mockLimit,
            }),
          }),
        }),
      });

      const result = await fetchUserQRCodes();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should handle unexpected errors', async () => {
      (supabase.auth.getUser as any).mockRejectedValue(new Error('Network error'));

      const result = await fetchUserQRCodes();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('deleteQRCode', () => {
    it('should delete QR code successfully', async () => {
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      });

      const result = await deleteQRCode('qr-123');

      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('qrcodes');
    });

    it('should handle deletion errors', async () => {
      const mockDelete = vi.fn().mockResolvedValue({ 
        error: { message: 'QR code not found' } 
      });
      
      (supabase.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      });

      const result = await deleteQRCode('non-existent-qr');

      expect(result.success).toBe(false);
      expect(result.error).toBe('QR code not found');
    });

    it('should handle unexpected deletion errors', async () => {
      (supabase.from as any).mockImplementation(() => {
        throw new Error('Database unavailable');
      });

      const result = await deleteQRCode('qr-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database unavailable');
    });
  });

  describe('getQRCodeDisplayUrl', () => {
    it('should return URL for URL type QR code', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'Website QR',
        content: { url: 'https://example.com/page' },
        type: 'url',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('https://example.com/page');
    });

    it('should return truncated text for text type QR code', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'Text QR',
        content: { text: 'This is a very long text that should be truncated' },
        type: 'text',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('This is a very long text that should be truncated...');
    });

    it('should handle empty text content', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'Empty Text QR',
        content: { text: '' },
        type: 'text',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('Text content...');
    });

    it('should return email for email type QR code', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'Email QR',
        content: { email: 'test@example.com', subject: 'Hello', body: 'Message' },
        type: 'email',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('test@example.com');
    });

    it('should return phone for phone type QR code', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'Phone QR',
        content: { phone: '+1234567890' },
        type: 'phone',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('+1234567890');
    });

    it('should return number for SMS type QR code', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'SMS QR',
        content: { number: '+1234567890', message: 'Hello' },
        type: 'sms',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('+1234567890');
    });

    it('should return coordinates for location type QR code', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'Location QR',
        content: { latitude: 40.7128, longitude: -74.0060 },
        type: 'location',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('40.7128,-74.006');
    });

    it('should return name for vcard type QR code', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'VCard QR',
        content: { name: 'John Doe', phone: '+1234567890', email: 'john@example.com' },
        type: 'vcard',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('John Doe');
    });

    it('should return name for mecard type QR code', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'MeCard QR',
        content: { name: 'Jane Smith', tel: '+0987654321' },
        type: 'mecard',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('Jane Smith');
    });

    it('should return SSID for WiFi type QR code', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'WiFi QR',
        content: { ssid: 'MyNetwork', password: 'secret123', encryption: 'WPA' },
        type: 'wifi',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('MyNetwork');
    });

    it('should return title for event type QR code', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'Event QR',
        content: { title: 'Team Meeting', start: '2024-01-20T10:00:00Z', end: '2024-01-20T11:00:00Z' },
        type: 'event',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('Team Meeting');
    });

    it('should return type for unknown QR types', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'Unknown QR',
        content: { data: 'some data' },
        type: 'custom',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('custom');
    });

    it('should return N/A when content is null', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'Empty QR',
        content: null as any,
        type: 'url',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeDisplayUrl(qrCode)).toBe('No content');
    });

    it('should handle exceptions gracefully', () => {
      const qrCode = {
        id: 'qr-1',
        content: { get url() { throw new Error('Access denied'); } },
        type: 'url',
      } as QRCode;

      expect(getQRCodeDisplayUrl(qrCode)).toBe('N/A');
    });
  });

  describe('getQRCodeName', () => {
    it('should return name when provided', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: 'My Special QR Code',
        content: { url: 'https://example.com' },
        type: 'url',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeName(qrCode)).toBe('My Special QR Code');
    });

    it('should format URL type name', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: '',
        content: { url: 'https://example.com' },
        type: 'url',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeName(qrCode)).toBe('URL QR Code');
    });

    it('should format SMS type name', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: '',
        content: { number: '+1234567890' },
        type: 'sms',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeName(qrCode)).toBe('SMS QR Code');
    });

    it('should capitalize other type names', () => {
      const qrCode: QRCode = {
        id: 'qr-1',
        user_id: 'user-123',
        name: '',
        content: { text: 'Hello' },
        type: 'text',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeName(qrCode)).toBe('Text QR Code');
    });

    it('should return truncated ID when name and type are missing', () => {
      const qrCode: QRCode = {
        id: 'abc123def456',
        user_id: 'user-123',
        name: '',
        content: {},
        type: '',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeName(qrCode)).toBe('QR abc123de');
    });

    it('should handle undefined ID', () => {
      const qrCode: QRCode = {
        id: undefined as any,
        user_id: 'user-123',
        name: '',
        content: {},
        type: '',
        styling: null,
        mode: 'static',
        expirytime: null,
        scan_count: 0,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      expect(getQRCodeName(qrCode)).toBe('QR Unknown');
    });
  });
});
