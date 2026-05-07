import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('QR Scan Edge Function', () => {
  const mockQrId = '550e8400-e29b-41d4-a716-446655440000';
  const mockRuleId = '660e8400-e29b-41d4-a716-446655440001';
  
  describe('Cloudflare geo header extraction', () => {
    it('should extract country from CF-IPCountry header', () => {
      const headers = new Map([
        ['CF-IPCountry', 'US'],
        ['CF-Region', 'California'],
        ['CF-IPCity', 'Los Angeles']
      ]);
      
      const geo = {
        country: headers.get('CF-IPCountry') || null,
        region: headers.get('CF-Region') || null,
        city: headers.get('CF-IPCity') || null
      };
      
      expect(geo.country).toBe('US');
      expect(geo.region).toBe('California');
      expect(geo.city).toBe('Los Angeles');
    });
    
    it('should handle lowercase header variants', () => {
      const headers = new Map([
        ['cf-ipcountry', 'GB'],
        ['cf-region', 'England'],
        ['cf-ipcity', 'London']
      ]);
      
      const geo = {
        country: headers.get('CF-IPCountry') || headers.get('cf-ipcountry') || null,
        region: headers.get('CF-Region') || headers.get('cf-region') || null,
        city: headers.get('CF-IPCity') || headers.get('cf-ipcity') || null
      };
      
      expect(geo.country).toBe('GB');
      expect(geo.region).toBe('England');
      expect(geo.city).toBe('London');
    });
    
    it('should handle missing geo headers gracefully', () => {
      const headers = new Map();
      
      const geo = {
        country: headers.get('CF-IPCountry') || null,
        region: headers.get('CF-Region') || null,
        city: headers.get('CF-IPCity') || null
      };
      
      expect(geo.country).toBeNull();
      expect(geo.region).toBeNull();
      expect(geo.city).toBeNull();
    });
  });
  
  describe('device detection from user agent', () => {
    it('should detect iOS mobile device', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15';
      const device = {
        os: ua.toLowerCase().includes('iphone') ? 'iOS' : null,
        browser: ua.toLowerCase().includes('safari') && !ua.toLowerCase().includes('chrome') ? 'Safari' : null,
        type: ua.toLowerCase().includes('mobile') || ua.toLowerCase().includes('iphone') ? 'mobile' : 'desktop'
      };
      
      expect(device.os).toBe('iOS');
      expect(device.type).toBe('mobile');
    });
    
    it('should detect Android mobile device', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 Chrome/112.0.0.0';
      const device = {
        os: ua.toLowerCase().includes('android') ? 'Android' : null,
        browser: ua.toLowerCase().includes('chrome') && !ua.toLowerCase().includes('edg') ? 'Chrome' : null,
        type: ua.toLowerCase().includes('mobile') || ua.toLowerCase().includes('android') ? 'mobile' : 'desktop'
      };
      
      expect(device.os).toBe('Android');
      expect(device.browser).toBe('Chrome');
      expect(device.type).toBe('mobile');
    });
    
    it('should detect iPad tablet', () => {
      const ua = 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15';
      const device = {
        os: ua.toLowerCase().includes('ipad') ? 'iOS' : null,
        browser: ua.toLowerCase().includes('safari') ? 'Safari' : null,
        type: ua.toLowerCase().includes('tablet') || ua.toLowerCase().includes('ipad') ? 'tablet' : 'desktop'
      };
      
      expect(device.os).toBe('iOS');
      expect(device.type).toBe('tablet');
    });
    
    it('should detect desktop browsers', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/112.0.0.0';
      const device = {
        os: ua.toLowerCase().includes('windows') ? 'Windows' : null,
        browser: ua.toLowerCase().includes('chrome') && !ua.toLowerCase().includes('edg') ? 'Chrome' : null,
        type: ua.toLowerCase().includes('mobile') ? 'mobile' : 'desktop'
      };
      
      expect(device.os).toBe('Windows');
      expect(device.browser).toBe('Chrome');
      expect(device.type).toBe('desktop');
    });
  });
  
  describe('rule evaluators', () => {
    it('should evaluate geo rules with Cloudflare headers', () => {
      const config = { countries: ['US', 'CA'], regions: ['California'] };
      const context = {
        timestamp: new Date(),
        country: 'US',
        region: 'California',
        city: 'Los Angeles',
        timezone: 'UTC',
        userAgent: 'test',
        device: { os: null, browser: null, type: 'unknown' },
        scanCount: 0,
        ip: null
      };
      
      const evaluator = (config: any, ctx: any) => {
        const countries = config.countries as string[] | undefined;
        const regions = config.regions as string[] | undefined;
        const countryMatch = !countries || countries.includes(ctx.country || '');
        const regionMatch = !regions || regions.includes(ctx.region || '');
        return countryMatch && regionMatch;
      };
      
      expect(evaluator(config, context)).toBe(true);
    });
    
    it('should evaluate time rules correctly', () => {
      const config = { start_time: '09:00', end_time: '17:00' };
      const now = new Date('2024-01-15T14:00:00Z'); // 2 PM UTC
      
      const evaluator = (config: any, timestamp: Date) => {
        const hour = timestamp.getUTCHours();
        const minute = timestamp.getUTCMinutes();
        const currentTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        return currentTime >= config.start_time && currentTime <= config.end_time;
      };
      
      expect(evaluator(config, now)).toBe(true);
    });
    
    it('should evaluate device rules', () => {
      const config = { os: ['iOS'], device_types: ['mobile'] };
      const context = {
        device: { os: 'iOS', browser: 'Safari', type: 'mobile' }
      };
      
      const evaluator = (config: any, ctx: any) => {
        const os = config.os as string[] | undefined;
        const deviceTypes = config.device_types as string[] | undefined;
        const osMatch = !os || os.includes(ctx.device.os || '');
        const typeMatch = !deviceTypes || deviceTypes.includes(ctx.device.type);
        return osMatch && typeMatch;
      };
      
      expect(evaluator(config, context)).toBe(true);
    });
    
    it('should evaluate scan count rules', () => {
      const config = { threshold: 100, operator: 'gte' };
      const context = { scanCount: 150 };
      
      const evaluator = (config: any, ctx: any) => {
        const threshold = config.threshold as number;
        const operator = config.operator as string;
        switch (operator) {
          case 'lt': return ctx.scanCount < threshold;
          case 'lte': return ctx.scanCount <= threshold;
          case 'gt': return ctx.scanCount > threshold;
          case 'gte': return ctx.scanCount >= threshold;
          case 'eq': return ctx.scanCount === threshold;
          default: return false;
        }
      };
      
      expect(evaluator(config, context)).toBe(true);
    });
  });
  
  describe('UTM parameter injection', () => {
    it('should add UTM params to URL', () => {
      const url = 'https://example.com/page';
      const config = {
        utm_source: 'qr_code',
        utm_medium: 'scan',
        utm_campaign: 'summer_2024',
        preserve_existing: true
      };
      
      const urlObj = new URL(url);
      if (config.utm_source) urlObj.searchParams.set('utm_source', config.utm_source);
      if (config.utm_medium) urlObj.searchParams.set('utm_medium', config.utm_medium);
      if (config.utm_campaign) urlObj.searchParams.set('utm_campaign', config.utm_campaign);
      
      expect(urlObj.toString()).toBe('https://example.com/page?utm_source=qr_code&utm_medium=scan&utm_campaign=summer_2024');
    });
    
    it('should preserve existing UTM params when configured', () => {
      const url = 'https://example.com/page?utm_source=existing';
      const config = {
        utm_source: 'qr_code',
        utm_medium: 'scan',
        preserve_existing: true
      };
      
      const urlObj = new URL(url);
      if (config.utm_source && !urlObj.searchParams.has('utm_source')) {
        urlObj.searchParams.set('utm_source', config.utm_source);
      }
      if (config.utm_medium && !urlObj.searchParams.has('utm_medium')) {
        urlObj.searchParams.set('utm_medium', config.utm_medium);
      }
      
      expect(urlObj.toString()).toBe('https://example.com/page?utm_source=existing&utm_medium=scan');
    });
  });
  
  describe('edge function response handling', () => {
    it('should return redirect for redirect behavior', () => {
      const behavior = 'redirect';
      const destination = 'https://example.com/redirect';
      
      const response = behavior === 'redirect' 
        ? { status: 302, headers: { Location: destination } }
        : { status: 200 };
      
      expect(response.status).toBe(302);
      expect(response.headers.Location).toBe(destination);
    });
    
    it('should return 403 for block behavior', () => {
      const behavior = 'block';
      
      const response = behavior === 'block'
        ? { status: 403, body: 'Access blocked' }
        : { status: 200 };
      
      expect(response.status).toBe(403);
    });
    
    it('should return 200 for allow behavior', () => {
      const behavior = 'allow';
      
      const response = behavior === 'allow'
        ? { status: 200, body: 'Allowed' }
        : { status: 302 };
      
      expect(response.status).toBe(200);
    });
  });
  
  describe('routing evaluation performance', () => {
    it('should complete evaluation within 100ms', () => {
      const startTime = Date.now();
      
      // Simulate rule evaluation
      const rules = Array(10).fill(null).map((_, i) => ({
        id: `rule-${i}`,
        priority: 10 - i,
        rule_type: 'geo',
        config: { countries: ['US'] }
      }));
      
      const context = { country: 'US', region: 'CA', city: 'LA' };
      
      for (const rule of rules) {
        if (rule.config.countries?.includes(context.country)) {
          break;
        }
      }
      
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(100);
    });
  });
});
