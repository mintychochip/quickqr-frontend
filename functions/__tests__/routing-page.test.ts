import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the API module
vi.mock('../api/v1/qr-routing/[[route]]', async () => {
  const actual = await import('../api/v1/qr-routing/[[route]]');
  return {
    ...actual,
    GET: actual.GET,
    POST: actual.POST,
    PUT: actual.PUT,
    DELETE: actual.DELETE
  };
});

describe('Routing Page Integration', () => {
  const mockQrId = '550e8400-e29b-41d4-a716-446655440000';
  const mockUser = { id: 'user-123', email: 'test@example.com' };
  
  describe('API endpoints', () => {
    it('should list rules for a QR code', async () => {
      const { GET } = await import('../api/v1/qr-routing/[[route]]');
      
      const mockLocals = {
        supabase: {
          from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'rule-1',
                        qr_id: mockQrId,
                        name: 'US Users',
                        rule_type: 'geo',
                        config: { countries: ['US'] },
                        destination_url: 'https://example.com/us',
                        priority: 10,
                        enabled: true,
                        match_behavior: 'redirect',
                        track_as_conversion: false,
                        conversion_value: null
                      }
                    ],
                    error: null
                  })
                }),
                single: vi.fn().mockResolvedValue({
                  data: { default_url: 'https://example.com/default' },
                  error: null
                })
              })
            })
          }),
          rpc: vi.fn().mockResolvedValue({ data: [], error: null })
        }
      };
      
      const response = await GET({
        request: new Request(`http://localhost/api/v1/qr-routing/${mockQrId}/rules`),
        params: { route: [mockQrId, 'rules'] },
        locals: mockLocals
      } as any);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.rules).toHaveLength(1);
      expect(body.rules[0].name).toBe('US Users');
    });
    
    it('should create a new routing rule', async () => {
      const { POST } = await import('../api/v1/qr-routing/[[route]]');
      
      const newRule = {
        name: 'Mobile Users',
        rule_type: 'device',
        config: { device_types: ['mobile'] },
        destination_url: 'https://example.com/mobile',
        priority: 5,
        enabled: true,
        match_behavior: 'redirect',
        track_as_conversion: true,
        conversion_value: 10.50
      };
      
      const mockLocals = {
        supabase: {
          auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
          },
          from: vi.fn().mockReturnValue({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'rule-2', qr_id: mockQrId, ...newRule },
                  error: null
                })
              })
            })
          })
        }
      };
      
      const response = await POST({
        request: new Request(`http://localhost/api/v1/qr-routing/${mockQrId}/rules`, {
          method: 'POST',
          body: JSON.stringify(newRule)
        }),
        params: { route: [mockQrId, 'rules'] },
        locals: mockLocals
      } as any);
      
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.name).toBe('Mobile Users');
      expect(body.rule_type).toBe('device');
    });
    
    it('should update an existing rule', async () => {
      const { PUT } = await import('../api/v1/qr-routing/[[route]]');
      
      const ruleId = 'rule-1';
      const updates = {
        name: 'Updated US Users',
        enabled: false
      };
      
      const mockLocals = {
        supabase: {
          from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: ruleId,
                      qr_id: mockQrId,
                      name: 'Updated US Users',
                      rule_type: 'geo',
                      enabled: false
                    },
                    error: null
                  })
                })
              })
            })
          })
        }
      };
      
      const response = await PUT({
        request: new Request(`http://localhost/api/v1/qr-routing/${mockQrId}/rules/${ruleId}`, {
          method: 'PUT',
          body: JSON.stringify(updates)
        }),
        params: { route: [mockQrId, 'rules', ruleId] },
        locals: mockLocals
      } as any);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.name).toBe('Updated US Users');
      expect(body.enabled).toBe(false);
    });
    
    it('should delete a rule', async () => {
      const { DELETE } = await import('../api/v1/qr-routing/[[route]]');
      
      const ruleId = 'rule-1';
      
      const mockLocals = {
        supabase: {
          from: vi.fn().mockReturnValue({
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          })
        }
      };
      
      const response = await DELETE({
        request: new Request(`http://localhost/api/v1/qr-routing/${mockQrId}/rules/${ruleId}`),
        params: { route: [mockQrId, 'rules', ruleId] },
        locals: mockLocals
      } as any);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
    
    it('should test routing with simulation', async () => {
      const { POST } = await import('../api/v1/qr-routing/[[route]]');
      
      const mockFrom = vi.fn();
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'rule-1',
                      qr_id: mockQrId,
                      name: 'US Mobile',
                      rule_type: 'geo',
                      config: { countries: ['US'] },
                      destination_url: 'https://example.com/us',
                      priority: 10,
                      enabled: true,
                      match_behavior: 'redirect'
                    }
                  ],
                  error: null
                })
              })
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { destination_url: 'https://example.com/default' },
                error: null
              })
            })
          })
        });
      
      const mockLocals = {
        supabase: {
          from: mockFrom
        }
      };
      
      const response = await POST({
        request: new Request(`http://localhost/api/v1/qr-routing/${mockQrId}/test`, {
          method: 'POST',
          body: JSON.stringify({
            simulate_context: {
              country: 'US',
              region: 'California',
              city: 'Los Angeles',
              user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
              timestamp: new Date().toISOString(),
              scan_count: 5
            }
          })
        }),
        params: { route: [mockQrId, 'test'] },
        locals: mockLocals
      } as any);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.destination_url).toBe('https://example.com/us');
      expect(body.matched_rule).not.toBeNull();
      expect(body.matched_rule.name).toBe('US Mobile');
      expect(body.evaluation_time_ms).toBeDefined();
    });
    
    it('should reorder rules', async () => {
      const { POST } = await import('../api/v1/qr-routing/[[route]]');
      
      const ruleIds = ['rule-3', 'rule-1', 'rule-2'];
      
      const mockLocals = {
        supabase: {
          from: vi.fn().mockReturnValue({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null })
              })
            })
          })
        }
      };
      
      const response = await POST({
        request: new Request(`http://localhost/api/v1/qr-routing/${mockQrId}/reorder`, {
          method: 'POST',
          body: JSON.stringify({ rule_ids: ruleIds })
        }),
        params: { route: [mockQrId, 'reorder'] },
        locals: mockLocals
      } as any);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
    
    it('should update default routing config', async () => {
      const { PUT } = await import('../api/v1/qr-routing/[[route]]');
      
      const mockLocals = {
        supabase: {
          auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
          },
          from: vi.fn().mockReturnValue({
            upsert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    qr_id: mockQrId,
                    default_url: 'https://example.com/fallback',
                    fallback_behavior: 'redirect'
                  },
                  error: null
                })
              })
            })
          })
        }
      };
      
      const response = await PUT({
        request: new Request(`http://localhost/api/v1/qr-routing/${mockQrId}/defaults`, {
          method: 'PUT',
          body: JSON.stringify({
            default_url: 'https://example.com/fallback',
            fallback_behavior: 'redirect'
          })
        }),
        params: { route: [mockQrId, 'defaults'] },
        locals: mockLocals
      } as any);
      
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.default_url).toBe('https://example.com/fallback');
    });
  });
  
  describe('Rule type configurations', () => {
    it('should handle time-based rules', async () => {
      const { ruleEvaluators } = await import('../api/v1/qr-routing/[[route]]');
      
      const context = {
        timestamp: new Date('2024-01-15T14:30:00Z'),
        country: null,
        region: null,
        city: null,
        timezone: 'UTC',
        userAgent: null,
        device: { os: null, browser: null, type: 'unknown' },
        scanCount: 0,
        ip: null
      };
      
      const config = {
        start_time: '09:00',
        end_time: '17:00',
        days_of_week: [1, 2, 3, 4, 5]
      };
      
      const result = ruleEvaluators.time(config, context);
      expect(result.matched).toBe(true);
    });
    
    it('should handle geo rules with exclude mode', async () => {
      const { ruleEvaluators } = await import('../api/v1/qr-routing/[[route]]');
      
      const context = {
        timestamp: new Date(),
        country: 'FR',
        region: null,
        city: null,
        timezone: null,
        userAgent: null,
        device: { os: null, browser: null, type: 'unknown' },
        scanCount: 0,
        ip: null
      };
      
      const config = {
        countries: ['US', 'CA'],
        exclude_mode: true
      };
      
      const result = ruleEvaluators.geo(config, context);
      expect(result.matched).toBe(true);
    });
    
    it('should handle UTM injection rules', async () => {
      const { applyUTMParams } = await import('../api/v1/qr-routing/[[route]]');
      
      const url = 'https://example.com/page';
      const config = {
        utm_source: 'qr_code',
        utm_medium: 'dynamic_route',
        utm_campaign: 'summer_sale',
        preserve_existing: true
      };
      
      const result = applyUTMParams(url, config);
      expect(result).toContain('utm_source=qr_code');
      expect(result).toContain('utm_medium=dynamic_route');
      expect(result).toContain('utm_campaign=summer_sale');
    });
  });
});