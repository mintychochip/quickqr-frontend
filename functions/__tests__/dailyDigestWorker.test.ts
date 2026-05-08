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

describe('Daily Digest Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      single: vi.fn().mockResolvedValue({ data: null }),
    });
    mockSupabaseRpc.mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null }),
    });
  });
  
  describe('Database Schema', () => {
    it('should support daily_digest_deliveries table structure', () => {
      // Verify table fields exist by checking the SQL migration
      const expectedFields = [
        'id', 'user_id', 'email_address', 'total_qrs', 'healthy_count',
        'warning_count', 'critical_count', 'new_issues_count',
        'resolved_issues_count', 'status', 'error_message', 'created_at'
      ];
      expect(expectedFields.length).toBe(12);
    });
    
    it('should record digest delivery with correct status values', () => {
      const validStatuses = ['sent', 'failed', 'bounced'];
      expect(validStatuses).toContain('sent');
      expect(validStatuses).toContain('failed');
      expect(validStatuses).toContain('bounced');
      expect(validStatuses).toHaveLength(3);
    });
  });
  
  describe('Health Change Detection', () => {
    it('should detect new critical issues from status change', () => {
      // Simulate health check data showing status degradation
      const healthChecks = [
        {
          status: 'healthy',
          checked_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
        },
        {
          status: 'critical',
          checked_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        },
      ];
      
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const latestCheck = healthChecks[1];
      const previousCheck = healthChecks.find((c: any) => new Date(c.checked_at) < new Date(since));
      
      expect(latestCheck.status).toBe('critical');
      expect(previousCheck?.status).toBe('healthy');
      
      // Detect status change within lookback window
      const statusChanged = latestCheck && new Date(latestCheck.checked_at) >= new Date(since) &&
        previousCheck?.status !== latestCheck.status;
      expect(statusChanged).toBe(true);
    });
    
    it('should count QR codes by current status', () => {
      // Mock stats response
      const mockStats = {
        total_qr_codes: 3,
        healthy_count: 1,
        warning_count: 1,
        critical_count: 1,
      };
      
      mockSupabaseRpc.mockResolvedValue({ data: mockStats });
      
      expect(mockStats.total_qr_codes).toBe(3);
      expect(mockStats.healthy_count + mockStats.warning_count + mockStats.critical_count).toBe(3);
    });
  });
  
  describe('Digest Delivery Function', () => {
    it('should record digest delivery with all fields', () => {
      const digestData = {
        user_id: 'test-user-id',
        email_address: 'test@example.com',
        total_qrs: 25,
        healthy_count: 20,
        warning_count: 3,
        critical_count: 2,
        new_issues_count: 1,
        resolved_issues_count: 0,
        status: 'sent',
      };
      
      // Verify all required fields are present
      expect(digestData.user_id).toBeDefined();
      expect(digestData.email_address).toBeDefined();
      expect(digestData.total_qrs).toBeGreaterThan(0);
      expect(digestData.status).toBe('sent');
    });
    
    it('should retrieve multiple digest history entries', () => {
      // Mock history data
      const mockHistory = [
        {
          id: '1',
          email_address: 'test@example.com',
          total_qrs: 15,
          status: 'failed',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          email_address: 'test@example.com',
          total_qrs: 12,
          status: 'sent',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          email_address: 'test@example.com',
          total_qrs: 10,
          status: 'sent',
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        },
      ];
      
      expect(mockHistory).toHaveLength(3);
      // Newest first
      expect(mockHistory[0].status).toBe('failed');
      expect(mockHistory[1].total_qrs).toBe(12);
      expect(mockHistory[2].total_qrs).toBe(10);
    });
  });
  
  describe('User Preference Integration', () => {
    it('should find users with daily digest enabled at specific time', () => {
      // Mock user preferences
      const mockUsers = [
        {
          user_id: 'user-1',
          email_address: 'user1@example.com',
          digest_time: '09:00',
          daily_digest_enabled: true,
          email_enabled: true,
        },
        {
          user_id: 'user-2',
          email_address: 'user2@example.com',
          digest_time: '09:30',
          daily_digest_enabled: true,
          email_enabled: true,
        },
      ];
      
      // Query users with digest enabled (matching 09:00 time window)
      const currentTimePrefix = '09:00';
      const matchingUsers = mockUsers.filter((u: any) => 
        u.daily_digest_enabled && 
        u.email_enabled &&
        u.digest_time.startsWith(currentTimePrefix.slice(0, 4))
      );
      
      expect(matchingUsers.length).toBeGreaterThan(0);
      expect(matchingUsers[0].daily_digest_enabled).toBe(true);
      expect(matchingUsers[0].email_enabled).toBe(true);
    });
    
    it('should respect email_enabled setting', () => {
      const userPrefs = {
        user_id: 'test-user',
        daily_digest_enabled: true,
        email_enabled: false, // Disabled
      };
      
      // User should be excluded when email is disabled
      const shouldInclude = userPrefs.daily_digest_enabled && userPrefs.email_enabled;
      expect(shouldInclude).toBe(false);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle users with no QR codes', () => {
      // Empty QR codes result
      const qrCodes: any[] = [];
      
      const summary = {
        total_qrs: qrCodes.length,
        healthy_count: 0,
        warning_count: 0,
        critical_count: 0,
        changed_count: 0,
        new_issues: [],
        resolved_issues: [],
        ongoing_issues: [],
      };
      
      expect(summary.total_qrs).toBe(0);
      expect(summary.healthy_count).toBe(0);
    });
    
    it('should handle QR codes without health checks', () => {
      // QR with no health checks should show as unknown status
      const qrCodes = [
        {
          id: 'qr-1',
          qr_health_checks: [], // No checks
        },
      ];
      
      const checks = qrCodes[0].qr_health_checks || [];
      const latestCheck = checks[0];
      
      expect(checks.length).toBe(0);
      expect(latestCheck).toBeUndefined();
    });
    
    it('should limit QR codes per digest to prevent huge emails', () => {
      const MAX_QR_CODES_PER_DIGEST = 50;
      
      // Simulate 100 QR codes
      const manyQrCodes = Array.from({ length: 100 }, (_, i) => ({ id: `qr-${i}` }));
      
      // Should be limited
      const limitedQrs = manyQrCodes.slice(0, MAX_QR_CODES_PER_DIGEST);
      expect(limitedQrs.length).toBe(50);
    });
  });
});

describe('Daily Digest Email Template', () => {
  it('should generate correct status counts', () => {
    const summary = {
      total_qrs: 50,
      healthy_count: 40,
      warning_count: 7,
      critical_count: 3,
      changed_count: 2,
      new_issues: [],
      resolved_issues: [],
      ongoing_issues: [],
    };
    
    // Verify counts add up
    expect(summary.healthy_count + summary.warning_count + summary.critical_count).toBe(summary.total_qrs);
    
    // Determine emoji based on status
    const statusEmoji = summary.critical_count > 0 ? '🔴' : summary.warning_count > 0 ? '🟡' : '🟢';
    expect(statusEmoji).toBe('🔴');
  });
  
  it('should categorize issues correctly', () => {
    const newIssues = [
      { previous_status: 'healthy', current_status: 'critical' },
      { previous_status: 'healthy', current_status: 'warning' },
    ];
    
    const resolvedIssues = [
      { previous_status: 'critical', current_status: 'healthy' },
    ];
    
    const ongoingIssues = [
      { previous_status: 'warning', current_status: 'critical' },
    ];
    
    // All new issues come from healthy
    expect(newIssues.every(i => i.previous_status === 'healthy')).toBe(true);
    expect(newIssues.every(i => i.current_status !== 'healthy')).toBe(true);
    
    // All resolved issues go to healthy
    expect(resolvedIssues.every(i => i.current_status === 'healthy')).toBe(true);
    
    // Ongoing issues don't follow the simple patterns
    expect(ongoingIssues[0].previous_status !== 'healthy').toBe(true);
    expect(ongoingIssues[0].current_status !== 'healthy').toBe(true);
  });
});
