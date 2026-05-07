import type { APIContext } from 'astro';

interface RoutingRule {
  id: string;
  qr_id: string;
  name: string;
  description: string | null;
  priority: number;
  enabled: boolean;
  rule_type: 'time' | 'geo' | 'device' | 'scan_count' | 'ab_test' | 'utm_inject' | 'custom';
  config: Record<string, unknown>;
  destination_url: string;
  match_behavior: 'redirect' | 'block' | 'allow';
  track_as_conversion: boolean;
  conversion_value: number | null;
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

interface MatchResult {
  matched: boolean;
  reason?: Record<string, unknown>;
}

type RuleEvaluator = (config: Record<string, unknown>, context: ScanContext) => MatchResult;

// Device detection from user agent
function detectDevice(userAgent: string | null): ScanContext['device'] {
  if (!userAgent) {
    return { os: null, browser: null, type: 'unknown' };
  }
  
  const ua = userAgent.toLowerCase();
  
  // Detect OS
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
  
  // Detect browser
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
  
  // Detect device type
  let type: ScanContext['device']['type'] = 'desktop';
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
    type = 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    type = 'tablet';
  }
  
  return { os, browser, type };
}

// Rule evaluators
const ruleEvaluators: Record<string, RuleEvaluator> = {
  time: (config, context) => {
    const now = context.timestamp;
    const userTz = context.timezone || 'UTC';
    
    // Parse times
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
    
    return {
      matched: inTimeWindow && onAllowedDay && inDateRange,
      reason: { currentTime, currentDay, inTimeWindow, onAllowedDay, inDateRange }
    };
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
    const matched = excludeMode ? !locationMatch : locationMatch;
    
    return {
      matched,
      reason: { country: context.country, region: context.region, city: context.city, excludeMode }
    };
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
    const matched = excludeMode ? !deviceMatch : deviceMatch;
    
    return {
      matched,
      reason: { os: device.os, browser: device.browser, type: device.type, excludeMode }
    };
  },
  
  scan_count: (config, context) => {
    const threshold = config.threshold as number;
    const operator = config.operator as 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
    const scanCount = context.scanCount;
    
    const operators: Record<string, boolean> = {
      lt: scanCount < threshold,
      lte: scanCount <= threshold,
      gt: scanCount > threshold,
      gte: scanCount >= threshold,
      eq: scanCount === threshold,
    };
    
    return {
      matched: operators[operator] ?? false,
      reason: { scanCount, threshold, operator }
    };
  },
  
  utm_inject: () => {
    // UTM rules always match (they modify URL rather than route)
    return { matched: true };
  }
};

// Apply UTM parameters to URL
function applyUTMParams(url: string, config: Record<string, unknown>): string {
  try {
    const urlObj = new URL(url);
    
    const utmSource = config.utm_source as string | undefined;
    const utmMedium = config.utm_medium as string | undefined;
    const utmCampaign = config.utm_campaign as string | undefined;
    const utmContent = config.utm_content as string | undefined;
    const preserveExisting = config.preserve_existing as boolean ?? true;
    
    if (utmSource && (!preserveExisting || !urlObj.searchParams.has('utm_source'))) {
      urlObj.searchParams.set('utm_source', utmSource);
    }
    if (utmMedium && (!preserveExisting || !urlObj.searchParams.has('utm_medium'))) {
      urlObj.searchParams.set('utm_medium', utmMedium);
    }
    if (utmCampaign && (!preserveExisting || !urlObj.searchParams.has('utm_campaign'))) {
      urlObj.searchParams.set('utm_campaign', utmCampaign);
    }
    if (utmContent && (!preserveExisting || !urlObj.searchParams.has('utm_content'))) {
      urlObj.searchParams.set('utm_content', utmContent);
    }
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

export async function GET({ request, params, locals }: APIContext) {
  const route = params.route as string[] | undefined;
  
  // Handle /api/v1/qr-routing/:qrId/rules - List rules
  if (route?.[1] === 'rules' && route[0]) {
    return getRoutingRules(route[0], locals);
  }
  
  // Handle /api/v1/qr-routing/:qrId/test - Test routing
  if (route?.[1] === 'test' && route[0]) {
    return testRouting(route[0], request, locals);
  }
  
  // Handle /api/v1/qr-routing/:qrId/stats - Get routing stats
  if (route?.[1] === 'stats' && route[0]) {
    return getRoutingStats(route[0], locals);
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST({ request, params, locals }: APIContext) {
  const route = params.route as string[] | undefined;
  
  // Handle /api/v1/qr-routing/:qrId/rules - Create rule
  if (route?.[1] === 'rules' && route[0]) {
    return createRoutingRule(route[0], request, locals);
  }
  
  // Handle /api/v1/qr-routing/:qrId/reorder - Reorder rules
  if (route?.[1] === 'reorder' && route[0]) {
    return reorderRules(route[0], request, locals);
  }
  
  // Handle /api/v1/qr-routing/:qrId/test - Test routing (POST with simulation)
  if (route?.[1] === 'test' && route[0]) {
    return testRouting(route[0], request, locals);
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function PUT({ request, params, locals }: APIContext) {
  const route = params.route as string[] | undefined;
  
  // Handle /api/v1/qr-routing/:qrId/rules/:ruleId - Update rule
  if (route?.[1] === 'rules' && route[2] && route[0]) {
    return updateRoutingRule(route[2], request, locals);
  }
  
  // Handle /api/v1/qr-routing/:qrId/defaults - Update defaults
  if (route?.[1] === 'defaults' && route[0]) {
    return updateRoutingDefaults(route[0], request, locals);
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function DELETE({ params, locals }: APIContext) {
  const route = params.route as string[] | undefined;
  
  // Handle /api/v1/qr-routing/:qrId/rules/:ruleId - Delete rule
  if (route?.[1] === 'rules' && route[2] && route[0]) {
    return deleteRoutingRule(route[2], locals);
  }
  
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Helper functions
async function getRoutingRules(qrId: string, locals: APIContext['locals']) {
  const supabase = locals.supabase;
  
  const { data: rules, error } = await supabase
    .from('qr_routing_rules')
    .select('*')
    .eq('qr_id', qrId)
    .eq('enabled', true)
    .order('priority', { ascending: false });
    
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const { data: defaults } = await supabase
    .from('qr_routing_defaults')
    .select('*')
    .eq('qr_id', qrId)
    .single();
    
  return new Response(JSON.stringify({ rules: rules || [], default_config: defaults }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function createRoutingRule(qrId: string, request: Request, locals: APIContext['locals']) {
  const supabase = locals.supabase;
  const body = await request.json();
  
  const { data, error } = await supabase
    .from('qr_routing_rules')
    .insert({
      qr_id: qrId,
      name: body.name,
      description: body.description,
      rule_type: body.rule_type,
      config: body.config,
      destination_url: body.destination_url,
      priority: body.priority ?? 0,
      enabled: body.enabled ?? true,
      match_behavior: body.match_behavior ?? 'redirect',
      track_as_conversion: body.track_as_conversion ?? false,
      conversion_value: body.conversion_value,
      created_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single();
    
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function updateRoutingRule(ruleId: string, request: Request, locals: APIContext['locals']) {
  const supabase = locals.supabase;
  const body = await request.json();
  
  const { data, error } = await supabase
    .from('qr_routing_rules')
    .update({
      name: body.name,
      description: body.description,
      config: body.config,
      destination_url: body.destination_url,
      priority: body.priority,
      enabled: body.enabled,
      match_behavior: body.match_behavior,
      track_as_conversion: body.track_as_conversion,
      conversion_value: body.conversion_value,
      updated_at: new Date().toISOString()
    })
    .eq('id', ruleId)
    .select()
    .single();
    
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function deleteRoutingRule(ruleId: string, locals: APIContext['locals']) {
  const supabase = locals.supabase;
  
  const { error } = await supabase
    .from('qr_routing_rules')
    .delete()
    .eq('id', ruleId);
    
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function reorderRules(qrId: string, request: Request, locals: APIContext['locals']) {
  const supabase = locals.supabase;
  const body = await request.json();
  const ruleIds = body.rule_ids as string[];
  
  // Update priorities based on order
  const updates = ruleIds.map((id, index) =>
    supabase
      .from('qr_routing_rules')
      .update({ priority: ruleIds.length - index })
      .eq('id', id)
      .eq('qr_id', qrId)
  );
  
  await Promise.all(updates);
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function updateRoutingDefaults(qrId: string, request: Request, locals: APIContext['locals']) {
  const supabase = locals.supabase;
  const body = await request.json();
  
  const { data, error } = await supabase
    .from('qr_routing_defaults')
    .upsert({
      qr_id: qrId,
      default_url: body.default_url,
      fallback_behavior: body.fallback_behavior ?? 'redirect',
      fallback_message: body.fallback_message,
      updated_by: (await supabase.auth.getUser()).data.user?.id
    })
    .select()
    .single();
    
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function testRouting(qrId: string, request: Request, locals: APIContext['locals']) {
  const supabase = locals.supabase;
  const body = await request.json();
  const simulateContext = body.simulate_context || {};
  
  const startTime = Date.now();
  
  // Get rules
  const { data: rules } = await supabase
    .from('qr_routing_rules')
    .select('*')
    .eq('qr_id', qrId)
    .eq('enabled', true)
    .order('priority', { ascending: false });
    
  // Get QR destination
  const { data: qrData } = await supabase
    .from('qrcodes')
    .select('destination_url')
    .eq('id', qrId)
    .single();
    
  const defaultDestination = qrData?.destination_url || '';
  
  // Build scan context from simulation or request
  const scanContext: ScanContext = {
    timestamp: simulateContext.timestamp ? new Date(simulateContext.timestamp) : new Date(),
    country: simulateContext.country || null,
    region: simulateContext.region || null,
    city: simulateContext.city || null,
    timezone: simulateContext.timezone || 'UTC',
    userAgent: simulateContext.user_agent || request.headers.get('user-agent'),
    device: detectDevice(simulateContext.user_agent || request.headers.get('user-agent')),
    scanCount: simulateContext.scan_count ?? 0,
    ip: null
  };
  
  // Evaluate rules
  let matchedRule: RoutingRule | null = null;
  let destination = defaultDestination;
  let matchReason: Record<string, unknown> | null = null;
  
  for (const rule of (rules || []) as RoutingRule[]) {
    const evaluator = ruleEvaluators[rule.rule_type];
    if (!evaluator) continue;
    
    const match = evaluator(rule.config, scanContext);
    
    if (match.matched) {
      matchedRule = rule;
      
      if (rule.rule_type === 'utm_inject') {
        destination = applyUTMParams(destination, rule.config);
      } else {
        destination = rule.destination_url;
      }
      
      matchReason = match.reason || null;
      break;
    }
  }
  
  const evaluationTime = Date.now() - startTime;
  
  return new Response(JSON.stringify({
    matched_rule: matchedRule,
    destination_url: destination,
    match_reason: matchReason,
    evaluation_time_ms: evaluationTime,
    scan_context: scanContext
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getRoutingStats(qrId: string, locals: APIContext['locals']) {
  const supabase = locals.supabase;
  
  const { data, error } = await supabase
    .rpc('get_qr_routing_stats', { qr_uuid: qrId });
    
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Get unmatched count
  const { data: unmatchedData } = await supabase
    .from('qr_routing_logs')
    .select('id', { count: 'exact', head: true })
    .eq('qr_id', qrId)
    .eq('matched', false);
    
  const unmatchedCount = unmatchedData?.length ?? 0;
  
  return new Response(JSON.stringify({
    rule_matches: data || [],
    unmatched_count: unmatchedCount
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Export rule evaluators for testing
export { ruleEvaluators, detectDevice, applyUTMParams };
