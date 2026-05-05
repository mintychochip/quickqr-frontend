/**
 * Health Service Integration Tests
 * Tests the health monitoring service functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchQRHealthStatus,
  triggerHealthCheck,
  fetchUserHealthDashboard,
  fetchHealthHistory,
  updateHealthConfig,
} from '../healthService';
import { supabase } from '../../config/supabase';

// Mock Supabase
vi.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('healthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe('fetchQRHealthStatus', () => {
    it('should fetch health status successfully', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            qr_code_id: 'qr-123',
            destination_url: 'https://example.com',
            current_status: {
              status: 'healthy',
              checked_at: '2026-05-05T16:00:00Z',
              response_time_ms: 2300,
              http_status: 200,
            },
            history: [],
            config: { enabled: true, check_frequency: 'daily', alert_threshold: 'critical' }
          }
        })
      } as Response);

      const result = await fetchQRHealthStatus('qr-123');

      expect(result.success).toBe(true);
      expect(result.data?.current_status?.status).toBe('healthy');
      expect(result.data?.destination_url).toBe('https://example.com');
    });

    it('should return error when not authenticated', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: null }
      });

      const result = await fetchQRHealthStatus('qr-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('should return error on 404 response', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'QR code not found' })
      } as Response);

      const result = await fetchQRHealthStatus('non-existent-qr');

      expect(result.success).toBe(false);
      expect(result.error).toBe('QR code not found');
    });

    it('should return error on 403 response', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Access denied' })
      } as Response);

      const result = await fetchQRHealthStatus('qr-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });

    it('should handle network errors', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchQRHealthStatus('qr-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should include authorization header', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} })
      } as Response);

      await fetchQRHealthStatus('qr-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/qr/health-check/qr-123'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('triggerHealthCheck', () => {
    it('should trigger health check successfully', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            health_check: {
              id: 'check-123',
              qr_code_id: 'qr-123',
              status: 'healthy',
              checked_at: '2026-05-05T16:00:00Z',
              response_time_ms: 2300,
            },
            result: {
              status: 'healthy',
              response_time_ms: 2300,
              http_status: 200,
            }
          }
        })
      } as Response);

      const result = await triggerHealthCheck('qr-123');

      expect(result.success).toBe(true);
      expect(result.data?.health_check.status).toBe('healthy');
    });

    it('should use POST method', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} })
      } as Response);

      await triggerHealthCheck('qr-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/qr/health-check/qr-123'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  describe('fetchUserHealthDashboard', () => {
    it('should fetch dashboard data successfully', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            totalQRs: 10,
            healthyCount: 8,
            warningCount: 1,
            criticalCount: 1,
            unknownCount: 0,
            overallHealthPercentage: 80,
            recentAlerts: []
          }
        })
      } as Response);

      const result = await fetchUserHealthDashboard();

      expect(result.success).toBe(true);
      expect(result.data?.totalQRs).toBe(10);
      expect(result.data?.overallHealthPercentage).toBe(80);
    });

    it('should return error on 401 response', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' })
      } as Response);

      const result = await fetchUserHealthDashboard();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('fetchHealthHistory', () => {
    it('should fetch history with default 30 days', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            qr_code_id: 'qr-123',
            days: 30,
            data: [
              { date: '2026-05-01', status: 'healthy', responseTimeMs: 2300, uptimePercentage: 100, checksCount: 24, errorsCount: 0 }
            ],
            summary: { overallUptimePercentage: 99.9, averageResponseTimeMs: 1500, totalChecks: 720 }
          }
        })
      } as Response);

      const result = await fetchHealthHistory('qr-123');

      expect(result.success).toBe(true);
      expect(result.data?.days).toBe(30);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('days=30'),
        expect.any(Object)
      );
    });

    it('should fetch history with custom days parameter', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            qr_code_id: 'qr-123',
            days: 60,
            data: [],
            summary: { overallUptimePercentage: 99.9, averageResponseTimeMs: 1500, totalChecks: 600 }
          }
        })
      } as Response);

      await fetchHealthHistory('qr-123', 60);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('days=60'),
        expect.any(Object)
      );
    });
  });

  describe('updateHealthConfig', () => {
    it('should update config successfully', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            qr_code_id: 'qr-123',
            enabled: true,
            check_frequency: 'hourly',
            alert_threshold: 'warning',
          }
        })
      } as Response);

      const result = await updateHealthConfig('qr-123', {
        enabled: true,
        check_frequency: 'hourly',
        alert_threshold: 'warning'
      });

      expect(result.success).toBe(true);
      expect(result.data?.check_frequency).toBe('hourly');
    });

    it('should use PUT method with correct body', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'test-token' } }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: {} })
      } as Response);

      const configUpdate = { enabled: false };
      await updateHealthConfig('qr-123', configUpdate);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/qr/health-config/qr-123'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(configUpdate)
        })
      );
    });
  });

  describe('type safety', () => {
    it('should have correct HealthStatus type structure', () => {
      const status: import('../healthService').HealthStatus = {
        status: 'healthy',
        checked_at: '2026-05-05T16:00:00Z',
        response_time_ms: 2300,
        http_status: 200,
      };

      expect(status.status).toBe('healthy');
      expect(typeof status.response_time_ms).toBe('number');
    });

    it('should have correct HealthConfig type structure', () => {
      const config: import('../healthService').HealthConfig = {
        enabled: true,
        check_frequency: 'daily',
        alert_threshold: 'critical',
      };

      expect(config.enabled).toBe(true);
      expect(config.check_frequency).toBe('daily');
    });
  });
});
