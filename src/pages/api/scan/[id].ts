import type { APIContext } from 'astro';

export const prerender = false;

interface RoutingRule {
  id: string;
  priority: number;
  enabled: boolean;
  rule_type: 'time' | 'geo' | 'device' | 'scan_count' | 'utm_inject';
  config: Record<string, unknown>;
  destination_url: string;
  match_behavior: 'redirect' | 'block' | 'allow';
}

interface ScanContext {
  timestamp: Date;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  userAgent: string | null;
  device: {
    os: string | null;
    browser: string | null;
    type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  };
  scanCount: number;
  ip: string | null;
}

type RuleEvaluator = (config: Record<string, unknown>, context: ScanContext) => boolean;

// Device detection from user agent
function detectDevice(userAgent: string | null): ScanContext['device'] {
  if (!userAgent) {
    return { os: null, browser: null, type: 'unknown' };
  }
  
  const ua = userAgent.toLowerCase();
  
  let os: string | null = null;
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    os = 'iOS';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac')) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  }
  
  let browser: string | null = null;
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('edg')) {
    browser = 'Edge';
  }
  
  let type: ScanContext['device']['type'] = 'desktop';
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
    type = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    type = 'tablet';
  }
  
  return { os, browser, type };
}

// Rule evaluators optimized for edge execution
const ruleEvaluators: Record<string, RuleEvaluator> = {
  time: (config, context) => {
    const now = context.timestamp;
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    const currentDay = now.getUTCDay();
    
    const startTime = config.start_time as string | undefined;
    const endTime = config.end_time as string | undefined;
    const daysOfWeek = config.days_of_week as number[] | undefined;
    const startDate = config.start_date as string | undefined;
    const endDate = config.end_date as string | undefined;
    
    const inTimeWindow = (!startTime || currentTime >= startTime) && (!endTime || currentTime <= endTime);
    const onAllowedDay = !daysOfWeek || daysOfWeek.includes(currentDay);
    const inDateRange = (!startDate || now >= new Date(startDate)) && (!endDate || now <= new Date(endDate));
    
    return inTimeWindow && onAllowedDay && inDateRange;
  },
  
  geo: (config, context) => {
    const countries = config.countries as string[] | undefined;
    const regions = config.regions as string[] | undefined;
    const cities = config.cities as string[] | undefined;
    const excludeMode = config.exclude_mode as boolean ?? false;
    
    const countryMatch = !countries || countries.includes(context.country || '');
    const regionMatch = !regions || regions.includes(context.region || '');
    const cityMatch = !cities || cities.includes(context.city || '');
    
    const locationMatch = countryMatch && regionMatch && cityMatch;
    return excludeMode ? !locationMatch : locationMatch;
  },
  
  device: (config, context) => {
    const os = config.os as string[] | undefined;
    const browsers = config.browsers as string[] | undefined;
    const deviceTypes = config.device_types as string[] | undefined;
    const excludeMode = config.exclude_mode as boolean ?? false;
    
    const device = context.device;
    const osMatch = !os || os.includes(device.os || '');
    const browserMatch = !browsers || browsers.includes(device.browser || '');
    const typeMatch = !deviceTypes || deviceTypes.includes(device.type);
    
    const deviceMatch = osMatch && browserMatch && typeMatch;
    return excludeMode ? !deviceMatch : deviceMatch;
  },
  
  scan_count: (config, context) => {
    const threshold = config.threshold as number;
    const operator = config.operator as 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
    const scanCount = context.scanCount;
    
    switch (operator) {
      case 'lt': return scanCount < threshold;
      case 'lte': return scanCount <= threshold;
      case 'gt': return scanCount > threshold;
      case 'gte': return scanCount >= threshold;
      case 'eq': return scanCount === threshold;
      default: return false;
    }
  },
  
  utm_inject: () => true
};

function applyUTMParams(url: string, config: Record<string, unknown>): string {
  try {
    const urlObj = new URL(url);
    const preserveExisting = config.preserve_existing as boolean ?? true;
    
    const params = [
      ['utm_source', config.utm_source],
      ['utm_medium', config.utm_medium],
      ['utm_campaign', config.utm_campaign],
      ['utm_content', config.utm_content]
    ];
    
    for (const [key, value] of params) {
      if (value && (!preserveExisting || !urlObj.searchParams.has(key))) {
        urlObj.searchParams.set(key, value as string);
      }
    }
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

// Extract geo data from Cloudflare headers
function extractGeoFromHeaders(request: Request): { country: string | null; region: string | null; city: string | null } {
  const headers = request.headers;
  
  return {
    country: headers.get('CF-IPCountry') || headers.get('cf-ipcountry') || null,
    region: headers.get('CF-Region') || headers.get('cf-region') || null,
    city: headers.get('CF-IPCity') || headers.get('cf-ipcity') || null
  };
}

export async function GET({ params, request, locals }: APIContext) {
  const { id } = params;
  const startTime = Date.now();
  
  if (!id) {
    return new Response('QR code ID required', { status: 400 });
  }
  
  const supabase = locals.supabase;
  
  try {
    // Get QR code details
    const { data: qrCode, error: qrError } = await supabase
      .from('qrcodes')
      .select('id, destination_url, user_id, type')
      .eq('id', id)
      .single();
    
    if (qrError || !qrCode) {
      return new Response('QR code not found', { status: 404 });
    }
    
    // Get active routing rules
    const { data: rules } = await supabase
      .from('qr_routing_rules')
      .select('*')
      .eq('qr_id', id)
      .eq('enabled', true)
      .order('priority', { ascending: false });
    
    // Get default config
    const { data: defaultConfig } = await supabase
      .from('qr_routing_defaults')
      .select('*')
      .eq('qr_id', id)
      .single();
    
    // Get scan count for this QR
    const { data: scanCountData } = await supabase
      .from('qr_scans')
      .select('id', { count: 'exact', head: true })
      .eq('qr_code_id', id);
    
    const scanCount = scanCountData?.length ?? 0;
    
    // Build scan context with Cloudflare headers
    const geo = extractGeoFromHeaders(request);
    const userAgent = request.headers.get('user-agent');
    
    const scanContext: ScanContext = {
      timestamp: new Date(),
      country: geo.country,
      region: geo.region,
      city: geo.city,
      timezone: request.headers.get('CF-Timezone') || 'UTC',
      userAgent,
      device: detectDevice(userAgent),
      scanCount,
      ip: request.headers.get('CF-Connecting-IP') || null
    };
    
    let destination = defaultConfig?.default_url || qrCode.destination_url;
    let matchedRule: RoutingRule | null = null;
    let matchBehavior = defaultConfig?.fallback_behavior || 'redirect';
    
    // Evaluate rules
    for (const rule of (rules || []) as RoutingRule[]) {
      const evaluator = ruleEvaluators[rule.rule_type];
      if (!evaluator) continue;
      
      if (evaluator(rule.config, scanContext)) {
        matchedRule = rule;
        matchBehavior = rule.match_behavior;
        
        if (rule.rule_type === 'utm_inject') {
          destination = applyUTMParams(destination, rule.config);
        } else {
          destination = rule.destination_url;
        }
        break;
      }
    }
    
    // Log the routing decision (async, don't block)
    const evaluationTime = Date.now() - startTime;
    
    supabase.from('qr_routing_logs').insert({
      qr_id: id,
      rule_id: matchedRule?.id || null,
      matched: !!matchedRule,
      source_url: qrCode.destination_url,
      destination_url: destination,
      rule_type: matchedRule?.rule_type || null,
      match_reason: matchedRule ? { type: matchedRule.rule_type } : null,
      country_code: geo.country,
      region: geo.region,
      city: geo.city,
      user_agent: userAgent,
      device_type: scanContext.device.type,
      scan_count: scanCount,
      evaluation_time_ms: evaluationTime
    }).then(() => {}, () => {}); // Fire and forget
    
    // Handle match behavior
    switch (matchBehavior) {
      case 'block':
        return new Response('Access blocked by routing rule', { 
          status: 403,
          headers: { 'Content-Type': 'text/plain' }
        });
        
      case 'allow':
        return new Response('Request allowed - no redirect', { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
        
      case 'redirect':
      default:
        // Track as conversion if configured
        if (matchedRule?.track_as_conversion) {
          supabase.from('qr_conversions').insert({
            qr_id: id,
            rule_id: matchedRule.id,
            conversion_value: matchedRule.conversion_value || 0,
            country_code: geo.country,
            device_type: scanContext.device.type
          }).then(() => {}, () => {});
        }
        
        return Response.redirect(destination, 302);
    }
    
  } catch (error) {
    console.error('Routing error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
