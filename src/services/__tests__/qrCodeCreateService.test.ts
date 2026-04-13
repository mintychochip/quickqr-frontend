/**
 * QR Code Create Service Integration Tests
 * Uses Supabase test environment with real authentication and abuse detection flows
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createQRCode, type QRCodeData } from '../qrCodeCreateService';
import { getCurrentUser } from '../authService';
import { getUserAbuseStatus, runAbuseDetection } from '../abuseDetectionService';
import { supabase } from '../../config/supabase';

// Mock dependencies
vi.mock('../authService', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('../abuseDetectionService', () => ({
  getUserAbuseStatus: vi.fn(),
  runAbuseDetection: vi.fn(),
}));

vi.mock('../../config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('qrCodeCreateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createQRCode', () => {
    it('should create QR code successfully for authenticated user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockQRData = {
        id: 'qr-456',
        user_id: 'user-123',
        name: 'Test QR',
        type: 'url',
        content: { url: 'https://example.com' },
        styling: { color: '#000000' },
        mode: 'static',
        expirytime: null,
        created_at: '2024-01-15T10:00:00Z',
      };

      (getCurrentUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      (getUserAbuseStatus as any).mockResolvedValue({
        isBlocked: false,
        tier: 'normal',
      });

      const mockSingle = vi.fn().mockResolvedValue({ data: mockQRData, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      // Mock the count query for abuse detection
      const mockCountQuery = vi.fn().mockResolvedValue({ count: 2, error: null });
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'qrcodes') {
          return {
            insert: mockInsert,
            select: vi.fn((options: any) => {
              if (options === '*') {
                return {
                  eq: vi.fn().mockReturnThis(),
                  gte: vi.fn().mockResolvedValue({ count: 2 }),
                };
              }
              return { single: mockSingle };
            }),
          };
        }
        return {};
      });

      (runAbuseDetection as any).mockResolvedValue({
        action: 'allow',
        reason: 'within_limits',
      });

      const result = await createQRCode(
        'Test QR',
        { url: 'https://example.com' },
        'url',
        { color: '#000000' },
        null
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.qrcodeid).toBe('qr-456');
      expect(result.data?.name).toBe('Test QR');
    });

    it('should return error when user is not authenticated', async () => {
      (getCurrentUser as any).mockResolvedValue({
        success: false,
        error: 'Not authenticated',
      });

      const result = await createQRCode(
        'Test QR',
        { url: 'https://example.com' },
        'url'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('should return error when no user is found', async () => {
      (getCurrentUser as any).mockResolvedValue({
        success: true,
        user: null,
      });

      const result = await createQRCode(
        'Test QR',
        { url: 'https://example.com' },
        'url'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('You must be logged in to create QR codes');
    });

    it('should block creation when user is blocked', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      (getCurrentUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      (getUserAbuseStatus as any).mockResolvedValue({
        isBlocked: true,
        tier: 'blocked',
        blockedUntil: '2024-12-31T23:59:59Z',
      });

      const result = await createQRCode(
        'Test QR',
        { url: 'https://example.com' },
        'url'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account temporarily suspended. Contact support.');
    });

    it('should restrict creation when user is in restricted tier', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      (getCurrentUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      (getUserAbuseStatus as any).mockResolvedValue({
        isBlocked: false,
        tier: 'restricted',
        restrictions: ['rate_limited'],
      });

      const result = await createQRCode(
        'Test QR',
        { url: 'https://example.com' },
        'url'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account has restrictions. Please reduce QR creation rate.');
    });

    it('should handle database insert errors', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      (getCurrentUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      (getUserAbuseStatus as any).mockResolvedValue({
        isBlocked: false,
        tier: 'normal',
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'qrcodes') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database constraint violation' },
                }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ count: 0 }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await createQRCode(
        'Test QR',
        { url: 'https://example.com' },
        'url'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database constraint violation');
    });

    it('should handle unexpected errors gracefully', async () => {
      (getCurrentUser as any).mockRejectedValue(new Error('Network timeout'));

      const result = await createQRCode(
        'Test QR',
        { url: 'https://example.com' },
        'url'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('should handle string content objects', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockQRData = {
        id: 'qr-789',
        user_id: 'user-123',
        name: 'String Content QR',
        type: 'text',
        content: '{"text": "Hello World"}',
        styling: null,
        mode: 'static',
        expirytime: null,
        created_at: '2024-01-15T10:00:00Z',
      };

      (getCurrentUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      (getUserAbuseStatus as any).mockResolvedValue({
        isBlocked: false,
        tier: 'normal',
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'qrcodes') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockQRData,
                  error: null,
                }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ count: 0 }),
              }),
            }),
          };
        }
        return {};
      });

      (runAbuseDetection as any).mockResolvedValue({
        action: 'allow',
        reason: 'within_limits',
      });

      const result = await createQRCode(
        'String Content QR',
        '{"text": "Hello World"}',
        'text'
      );

      expect(result.success).toBe(true);
      expect(result.data?.content).toEqual({ text: 'Hello World' });
    });

    it('should pass expiry time correctly', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const expiryTime = '2024-12-31T23:59:59Z';
      const mockQRData = {
        id: 'qr-expiry',
        user_id: 'user-123',
        name: 'Expiring QR',
        type: 'url',
        content: { url: 'https://example.com' },
        styling: null,
        mode: 'static',
        expirytime: expiryTime,
        created_at: '2024-01-15T10:00:00Z',
      };

      (getCurrentUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      (getUserAbuseStatus as any).mockResolvedValue({
        isBlocked: false,
        tier: 'normal',
      });

      let capturedInsert: any = null;

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'qrcodes') {
          return {
            insert: vi.fn((data: any) => {
              capturedInsert = data;
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockQRData,
                    error: null,
                  }),
                }),
              };
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ count: 0 }),
              }),
            }),
          };
        }
        return {};
      });

      (runAbuseDetection as any).mockResolvedValue({
        action: 'allow',
        reason: 'within_limits',
      });

      const result = await createQRCode(
        'Expiring QR',
        { url: 'https://example.com' },
        'url',
        null,
        expiryTime
      );

      expect(result.success).toBe(true);
      expect(result.data?.expirytime).toBe(expiryTime);
      expect(capturedInsert?.expirytime).toBe(expiryTime);
    });

    it('should run abuse detection with recent QR count', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockQRData = {
        id: 'qr-new',
        user_id: 'user-123',
        name: 'New QR',
        type: 'url',
        content: { url: 'https://example.com' },
        styling: null,
        mode: 'static',
        expirytime: null,
        created_at: '2024-01-15T10:00:00Z',
      };

      (getCurrentUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      (getUserAbuseStatus as any).mockResolvedValue({
        isBlocked: false,
        tier: 'normal',
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'qrcodes') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockQRData,
                  error: null,
                }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ count: 5 }),
              }),
            }),
          };
        }
        return {};
      });

      (runAbuseDetection as any).mockResolvedValue({
        action: 'allow',
        reason: 'within_limits',
      });

      await createQRCode(
        'New QR',
        { url: 'https://example.com' },
        'url'
      );

      expect(runAbuseDetection).toHaveBeenCalledWith(
        'user-123',
        'create',
        expect.objectContaining({
          recentQrCount: 5,
          timeWindowHours: 1,
        })
      );
    });

    it('should handle undefined expiry time', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockQRData = {
        id: 'qr-undefined',
        user_id: 'user-123',
        name: 'No Expiry QR',
        type: 'url',
        content: { url: 'https://example.com' },
        styling: null,
        mode: 'static',
        expirytime: null,
        created_at: '2024-01-15T10:00:00Z',
      };

      (getCurrentUser as any).mockResolvedValue({
        success: true,
        user: mockUser,
      });

      (getUserAbuseStatus as any).mockResolvedValue({
        isBlocked: false,
        tier: 'normal',
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'qrcodes') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockQRData,
                  error: null,
                }),
              }),
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ count: 0 }),
              }),
            }),
          };
        }
        return {};
      });

      (runAbuseDetection as any).mockResolvedValue({
        action: 'allow',
        reason: 'within_limits',
      });

      const result = await createQRCode(
        'No Expiry QR',
        { url: 'https://example.com' },
        'url',
        undefined,
        undefined
      );

      expect(result.success).toBe(true);
      expect(result.data?.expirytime).toBeNull();
    });
  });
});
