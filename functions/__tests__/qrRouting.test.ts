import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ruleEvaluators, detectDevice, applyUTMParams } from '../api/v1/qr-routing/[[route]]';

describe('QR Routing Rule Evaluators', () => {
  describe('time-based rules', () => {
    it('matches when within time window', () => {
      const context = {
        timestamp: new Date('2024-01-15T14:30:00Z'), // 2:30 PM UTC
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
        days_of_week: [1, 2, 3, 4, 5] // Mon-Fri
      };
      
      const result = ruleEvaluators.time(config, context);
      expect(result.matched).toBe(true);
    });
    
    it('does not match outside time window', () => {
      const context = {
        timestamp: new Date('2024-01-15T20:00:00Z'), // 8:00 PM UTC
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
        end_time: '17:00'
      };
      
      const result = ruleEvaluators.time(config, context);
      expect(result.matched).toBe(false);
    });
    
    it('does not match on excluded day', () => {
      const context = {
        timestamp: new Date('2024-01-14T12:00:00Z'), // Sunday
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
        days_of_week: [1, 2, 3, 4, 5] // Mon-Fri only
      };
      
      const result = ruleEvaluators.time(config, context);
      expect(result.matched).toBe(false);
    });
    
    it('matches within date range', () => {
      const context = {
        timestamp: new Date('2024-06-15T12:00:00Z'),
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
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      };
      
      const result = ruleEvaluators.time(config, context);
      expect(result.matched).toBe(true);
    });
  });
  
  describe('geo-based rules', () => {
    it('matches when country is in list', () => {
      const context = {
        timestamp: new Date(),
        country: 'US',
        region: null,
        city: null,
        timezone: null,
        userAgent: null,
        device: { os: null, browser: null, type: 'unknown' },
        scanCount: 0,
        ip: null
      };
      
      const config = {
        countries: ['US', 'CA', 'MX']
      };
      
      const result = ruleEvaluators.geo(config, context);
      expect(result.matched).toBe(true);
    });
    
    it('does not match when country is not in list', () => {
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
        countries: ['US', 'CA', 'MX']
      };
      
      const result = ruleEvaluators.geo(config, context);
      expect(result.matched).toBe(false);
    });
    
    it('matches with exclude mode when country not in list', () => {
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
        countries: ['US', 'CA', 'MX'],
        exclude_mode: true
      };
      
      const result = ruleEvaluators.geo(config, context);
      expect(result.matched).toBe(true);
    });
    
    it('matches when city matches', () => {
      const context = {
        timestamp: new Date(),
        country: 'US',
        region: 'California',
        city: 'Los Angeles',
        timezone: null,
        userAgent: null,
        device: { os: null, browser: null, type: 'unknown' },
        scanCount: 0,
        ip: null
      };
      
      const config = {
        cities: ['Los Angeles', 'San Francisco', 'San Diego']
      };
      
      const result = ruleEvaluators.geo(config, context);
      expect(result.matched).toBe(true);
    });
  });
  
  describe('device-based rules', () => {
    it('matches when OS is in list', () => {
      const context = {
        timestamp: new Date(),
        country: null,
        region: null,
        city: null,
        timezone: null,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        device: detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'),
        scanCount: 0,
        ip: null
      };
      
      const config = {
        os: ['iOS', 'Android']
      };
      
      const result = ruleEvaluators.device(config, context);
      expect(result.matched).toBe(true);
    });
    
    it('matches when device type is in list', () => {
      const context = {
        timestamp: new Date(),
        country: null,
        region: null,
        city: null,
        timezone: null,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        device: detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'),
        scanCount: 0,
        ip: null
      };
      
      const config = {
        device_types: ['mobile']
      };
      
      const result = ruleEvaluators.device(config, context);
      expect(result.matched).toBe(true);
    });
    
    it('does not match when device type is excluded', () => {
      const context = {
        timestamp: new Date(),
        country: null,
        region: null,
        city: null,
        timezone: null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        device: detectDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'),
        scanCount: 0,
        ip: null
      };
      
      const config = {
        device_types: ['mobile', 'tablet']
      };
      
      const result = ruleEvaluators.device(config, context);
      expect(result.matched).toBe(false);
    });
    
    it('matches with exclude mode when device not in list', () => {
      const context = {
        timestamp: new Date(),
        country: null,
        region: null,
        city: null,
        timezone: null,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        device: detectDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'),
        scanCount: 0,
        ip: null
      };
      
      const config = {
        os: ['iOS', 'Android'],
        exclude_mode: true
      };
      
      const result = ruleEvaluators.device(config, context);
      expect(result.matched).toBe(true);
    });
  });
  
  describe('scan count rules', () => {
    it('matches when count is less than threshold', () => {
      const context = {
        timestamp: new Date(),
        country: null,
        region: null,
        city: null,
        timezone: null,
        userAgent: null,
        device: { os: null, browser: null, type: 'unknown' },
        scanCount: 50,
        ip: null
      };
      
      const config = {
        threshold: 100,
        operator: 'lt'
      };
      
      const result = ruleEvaluators.scan_count(config, context);
      expect(result.matched).toBe(true);
    });
    
    it('does not match when count exceeds threshold with lt operator', () => {
      const context = {
        timestamp: new Date(),
        country: null,
        region: null,
        city: null,
        timezone: null,
        userAgent: null,
        device: { os: null, browser: null, type: 'unknown' },
        scanCount: 150,
        ip: null
      };
      
      const config = {
        threshold: 100,
        operator: 'lt'
      };
      
      const result = ruleEvaluators.scan_count(config, context);
      expect(result.matched).toBe(false);
    });
    
    it('matches with greater than operator', () => {
      const context = {
        timestamp: new Date(),
        country: null,
        region: null,
        city: null,
        timezone: null,
        userAgent: null,
        device: { os: null, browser: null, type: 'unknown' },
        scanCount: 150,
        ip: null
      };
      
      const config = {
        threshold: 100,
        operator: 'gt'
      };
      
      const result = ruleEvaluators.scan_count(config, context);
      expect(result.matched).toBe(true);
    });
    
    it('matches with equals operator', () => {
      const context = {
        timestamp: new Date(),
        country: null,
        region: null,
        city: null,
        timezone: null,
        userAgent: null,
        device: { os: null, browser: null, type: 'unknown' },
        scanCount: 100,
        ip: null
      };
      
      const config = {
        threshold: 100,
        operator: 'eq'
      };
      
      const result = ruleEvaluators.scan_count(config, context);
      expect(result.matched).toBe(true);
    });
  });
  
  describe('UTM injection rules', () => {
    it('always matches (modifies URL instead of routing)', () => {
      const context = {
        timestamp: new Date(),
        country: null,
        region: null,
        city: null,
        timezone: null,
        userAgent: null,
        device: { os: null, browser: null, type: 'unknown' },
        scanCount: 0,
        ip: null
      };
      
      const config = {
        utm_source: 'qr_code',
        utm_medium: 'scan'
      };
      
      const result = ruleEvaluators.utm_inject(config, context);
      expect(result.matched).toBe(true);
    });
  });
});

describe('Device Detection', () => {
  it('detects iOS from iPhone user agent', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15';
    const device = detectDevice(ua);
    expect(device.os).toBe('iOS');
    expect(device.type).toBe('mobile');
  });
  
  it('detects iOS from iPad user agent', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15';
    const device = detectDevice(ua);
    expect(device.os).toBe('iOS');
    expect(device.type).toBe('tablet');
  });
  
  it('detects Android from user agent', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36';
    const device = detectDevice(ua);
    expect(device.os).toBe('Android');
    expect(device.type).toBe('mobile');
  });
  
  it('detects Windows from user agent', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const device = detectDevice(ua);
    expect(device.os).toBe('Windows');
    expect(device.type).toBe('desktop');
  });
  
  it('detects macOS from user agent', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
    const device = detectDevice(ua);
    expect(device.os).toBe('macOS');
    expect(device.type).toBe('desktop');
  });
  
  it('detects Chrome browser', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const device = detectDevice(ua);
    expect(device.browser).toBe('Chrome');
  });
  
  it('detects Safari browser', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
    const device = detectDevice(ua);
    expect(device.browser).toBe('Safari');
  });
  
  it('detects Firefox browser', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0';
    const device = detectDevice(ua);
    expect(device.browser).toBe('Firefox');
  });
  
  it('returns unknown for empty user agent', () => {
    const device = detectDevice('');
    expect(device.os).toBeNull();
    expect(device.browser).toBeNull();
    expect(device.type).toBe('unknown');
  });
  
  it('returns unknown for null user agent', () => {
    const device = detectDevice(null);
    expect(device.os).toBeNull();
    expect(device.browser).toBeNull();
    expect(device.type).toBe('unknown');
  });
});

describe('UTM Parameter Application', () => {
  it('adds UTM parameters to URL', () => {
    const url = 'https://example.com/page';
    const config = {
      utm_source: 'qr_code',
      utm_medium: 'dynamic_route',
      utm_campaign: 'summer_sale'
    };
    
    const result = applyUTMParams(url, config);
    expect(result).toBe('https://example.com/page?utm_source=qr_code&utm_medium=dynamic_route&utm_campaign=summer_sale');
  });
  
  it('preserves existing query parameters', () => {
    const url = 'https://example.com/page?existing=param';
    const config = {
      utm_source: 'qr_code'
    };
    
    const result = applyUTMParams(url, config);
    expect(result).toContain('existing=param');
    expect(result).toContain('utm_source=qr_code');
  });
  
  it('does not overwrite existing UTM when preserve_existing is true', () => {
    const url = 'https://example.com/page?utm_source=existing';
    const config = {
      utm_source: 'qr_code',
      preserve_existing: true
    };
    
    const result = applyUTMParams(url, config);
    expect(result).toContain('utm_source=existing');
    expect(result).not.toContain('utm_source=qr_code');
  });
  
  it('overwrites existing UTM when preserve_existing is false', () => {
    const url = 'https://example.com/page?utm_source=existing';
    const config = {
      utm_source: 'qr_code',
      preserve_existing: false
    };
    
    const result = applyUTMParams(url, config);
    expect(result).toContain('utm_source=qr_code');
    expect(result).not.toContain('utm_source=existing');
  });
  
  it('handles URLs without query string', () => {
    const url = 'https://example.com';
    const config = {
      utm_source: 'qr_code'
    };
    
    const result = applyUTMParams(url, config);
    // URL constructor normalizes URLs without path to include trailing slash
    expect(result).toBe('https://example.com/?utm_source=qr_code');
  });
  
  it('returns original URL on invalid URL', () => {
    const url = 'not-a-valid-url';
    const config = {
      utm_source: 'qr_code'
    };
    
    const result = applyUTMParams(url, config);
    expect(result).toBe('not-a-valid-url');
  });
  
  it('handles all UTM parameters', () => {
    const url = 'https://example.com';
    const config = {
      utm_source: 'qr_code',
      utm_medium: 'scan',
      utm_campaign: 'campaign',
      utm_content: 'variant_a'
    };
    
    const result = applyUTMParams(url, config);
    expect(result).toContain('utm_source=qr_code');
    expect(result).toContain('utm_medium=scan');
    expect(result).toContain('utm_campaign=campaign');
    expect(result).toContain('utm_content=variant_a');
  });
});
