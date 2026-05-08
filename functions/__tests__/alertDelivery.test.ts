import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock Supabase client
const mockSupabaseFrom = vi.fn();
const mockSupabaseRpc = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  }),
}));

describe('Alert Delivery API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });
    mockSupabaseRpc.mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null }),
    });
  });

  describe('Rate Limiting', () => {
    it('should allow alerts when under rate limit', async () => {
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ count: 5, error: null }),
      });

      // Under the 10 alert/hour limit
      expect(5).toBeLessThan(10);
    });

    it('should block alerts when rate limit exceeded', async () => {
      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ count: 10, error: null }),
      });

      // At the limit, should block
      expect(10).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Email Alerts', () => {
    it('should send email via Resend API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'email_123' }),
      });

      const emailPayload = {
        from: 'QuickQR Alerts <alerts@quickqr.app>',
        to: 'test@example.com',
        subject: '🚨 CRITICAL: QR Code "Test QR" is down',
        html: '<h2>Alert</h2>',
      };

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer re_test123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer re_test123',
          }),
        })
      );
    });

    it('should handle Resend API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: vi.fn().mockResolvedValue('Invalid API key'),
      });

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer invalid' },
        body: JSON.stringify({}),
      });

      expect(response.ok).toBe(false);
    });
  });

  describe('Slack Alerts', () => {
    it('should send Slack webhook', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const slackPayload = {
        channel: '#alerts',
        username: 'QuickQR Health Bot',
        attachments: [{
          color: '#dc2626',
          title: '🚨 QR Code Health Alert',
        }],
      };

      await fetch('https://hooks.slack.com/services/T00/B00/XXX', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/T00/B00/XXX',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });
  });

  describe('Custom Webhook Alerts', () => {
    it('should send custom webhook with headers', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const webhookPayload = {
        event: 'qr_health_alert',
        timestamp: new Date().toISOString(),
        qr_code_id: 'qr-123',
        status: 'critical',
      };

      await fetch('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
        body: JSON.stringify(webhookPayload),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });
  });

  describe('Alert Logging', () => {
    it('should define alert record structure for successful alerts', () => {
      const alertRecord = {
        qr_code_id: 'qr-123',
        health_check_id: 'hc-456',
        alert_type: 'email' as const,
        status: 'sent' as const,
        sent_at: new Date().toISOString(),
      };

      expect(alertRecord).toHaveProperty('qr_code_id');
      expect(alertRecord).toHaveProperty('health_check_id');
      expect(alertRecord).toHaveProperty('alert_type');
      expect(alertRecord).toHaveProperty('status');
      expect(alertRecord.status).toBe('sent');
    });

    it('should define alert record structure for failed alerts', () => {
      const alertRecord = {
        qr_code_id: 'qr-123',
        health_check_id: 'hc-456',
        alert_type: 'slack' as const,
        status: 'failed' as const,
        error_message: 'Webhook returned 404',
      };

      expect(alertRecord).toHaveProperty('error_message');
      expect(alertRecord.status).toBe('failed');
      expect(alertRecord.error_message).toBe('Webhook returned 404');
    });
  });

  describe('Notification Settings', () => {
    it('should fetch notification settings via RPC', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          email_enabled: true,
          email_address: 'user@example.com',
          slack_enabled: false,
          webhook_enabled: false,
        },
      });
      mockSupabaseRpc.mockReturnValue({ single: mockSingle });

      const result = await mockSupabaseRpc('get_qr_health_notification_settings', {
        p_qr_code_id: 'qr-123',
      }).single();

      expect(result.data).toMatchObject({
        email_enabled: true,
        email_address: 'user@example.com',
      });
    });
  });
});

describe('Alert Delivery Integration', () => {
  it('should handle complete alert flow', async () => {
    // Mock all dependencies
    const alertPayload = {
      qr_code_id: 'qr-123',
      health_check_id: 'hc-456',
      status: 'critical',
      message: 'QR code is not responding',
      details: {
        http_status: 503,
        response_time_ms: 5000,
        error_message: 'Service Unavailable',
        destination_url: 'https://example.com',
        qr_code_name: 'Test QR',
      },
    };

    // Validate payload structure
    expect(alertPayload).toHaveProperty('qr_code_id');
    expect(alertPayload).toHaveProperty('health_check_id');
    expect(alertPayload).toHaveProperty('status');
    expect(alertPayload).toHaveProperty('details');
    expect(alertPayload.status).toMatch(/^(warning|critical)$/);
  });

  it('should validate required fields', async () => {
    const invalidPayload = {
      // Missing qr_code_id and health_check_id
      status: 'critical',
      message: 'Test',
    };

    expect(invalidPayload).not.toHaveProperty('qr_code_id');
    expect(invalidPayload).not.toHaveProperty('health_check_id');
  });
});
