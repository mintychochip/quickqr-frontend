# Dynamic QR Code Routing Feature Research

## Overview

Dynamic QR Code Routing enables QR codes to redirect to different destinations based on conditional rules evaluated at scan-time. This transforms static QR codes into intelligent gateways that adapt to context — time, location, device, scan count, or custom parameters.

## Competitive Analysis

| Provider | Dynamic Routing | Rule Types | Use Case Focus |
|----------|-----------------|------------|----------------|
| **Bitly** | ✅ Yes | Time, device, location | Marketing campaigns |
| **Rebrandly** | ✅ Yes | Time, geo, device, language | Enterprise branding |
| **Short.io** | ✅ Yes | Geo, device, time, random | A/B testing, localization |
| **Dub.co** | ✅ Partial | Geo, device only | Basic localization |
| **QR Tiger** | ❌ No | - | Static only |
| **Scanova** | ❌ No | - | Static only |
| **unscan** | ✅ Yes | Geo, time, device, UTM | Advanced targeting |

### Key Findings

**Market Gap**: Most QR-specific tools lack dynamic routing entirely. Link shorteners have it but don't expose it through QR-centric UX.

**User Pain Points**:
1. Marketing campaigns need time-based redirects (happy hour menus, limited-time offers)
2. Global businesses need geo-based routing (different stores per country)
3. Mobile vs desktop experiences require device-based splitting
4. Sequential QR experiences need scan-count-based routing (first scan = welcome, subsequent = main app)
5. Personalization requires UTM parameter injection based on context

## Technical Implementation

### 1. Rule Engine Architecture

#### Rule Evaluation Flow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   QR Scan   │───▶│  Rule Engine │───▶│  Evaluate   │───▶│   Select    │
│   Request   │    │  (Edge/CF)   │    │  Conditions │    │  Destination │
└──────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                                                        │
                                                        ▼
                                               ┌──────────────┐
                                               │   Redirect   │
                                               │   Response   │
                                               └──────────────┘
```

#### Rule Types

| Rule Type | Description | Parameters | Priority |
|-----------|-------------|------------|----------|
| **Time-based** | Route based on time windows | start_time, end_time, timezone, days_of_week | High |
| **Geographic** | Route based on location | countries[], regions[], cities[] | High |
| **Device** | Route based on user agent | os[], browser[], device_type[] | Medium |
| **Scan Count** | Route based on scan number | threshold, operator (eq/lt/gt) | Medium |
| **A/B Test** | Route based on variant assignment | test_id, variant_weights | Low |
| **UTM Inject** | Add/modify UTM params | utm_source, utm_medium, utm_campaign | Modifier |
| **Custom** | User-defined logic | edge_function_id | Custom |

### 2. Database Schema

```sql
-- Dynamic routing rules table
CREATE TABLE qr_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_id UUID NOT NULL REFERENCES qrcodes(id) ON DELETE CASCADE,
    
    -- Rule metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 0, -- Higher = evaluated first
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Rule type and configuration
    rule_type VARCHAR(50) NOT NULL, -- 'time', 'geo', 'device', 'scan_count', 'ab_test', 'custom'
    config JSONB NOT NULL, -- Rule-specific configuration
    
    -- Destination when rule matches
    destination_url TEXT NOT NULL,
    
    -- Match behavior
    match_behavior VARCHAR(20) NOT NULL DEFAULT 'redirect', -- 'redirect', 'block', 'allow'
    
    -- Analytics tracking
    track_as_conversion BOOLEAN DEFAULT FALSE,
    conversion_value DECIMAL(10,2),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Indexes
    INDEX idx_qr_id_priority (qr_id, priority DESC),
    INDEX idx_enabled (enabled),
    INDEX idx_rule_type (rule_type)
);

-- Time-based rule configuration (stored in config JSONB)
-- {
--   "start_time": "09:00",
--   "end_time": "17:00",
--   "timezone": "America/Los_Angeles",
--   "days_of_week": [1, 2, 3, 4, 5], -- Monday-Friday
--   "start_date": "2024-01-01",
--   "end_date": "2024-12-31"
-- }

-- Geo-based rule configuration
-- {
--   "countries": ["US", "CA", "MX"],
--   "regions": ["California", "New York"],
--   "cities": ["Los Angeles", "San Francisco"],
--   "exclude_mode": false -- if true, route AWAY from these locations
-- }

-- Device-based rule configuration
-- {
--   "os": ["iOS", "Android"],
--   "browsers": ["Chrome", "Safari"],
--   "device_types": ["mobile", "tablet"],
--   "exclude_mode": false
-- }

-- Scan count rule configuration
-- {
--   "threshold": 100,
--   "operator": "lt", -- lt, lte, gt, gte, eq
--   "reset_period": null -- or 'day', 'week', 'month', 'total'
-- }

-- A/B test rule configuration
-- {
--   "test_id": "uuid",
--   "variant_id": "uuid",
--   "assignment_mode": "sticky" -- sticky (same user gets same variant) or random
-- }

-- UTM injection rule configuration
-- {
--   "utm_source": "qr_code",
--   "utm_medium": "dynamic_route",
--   "utm_campaign": "{rule_name}",
--   "utm_content": "{scan_count}",
--   "preserve_existing": true
-- }

-- Routing rule execution logs (for analytics)
CREATE TABLE qr_routing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_id UUID NOT NULL REFERENCES qrcodes(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES qr_routing_rules(id) ON DELETE SET NULL,
    scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
    
    -- Request context
    matched BOOLEAN NOT NULL,
    source_url TEXT NOT NULL,
    destination_url TEXT,
    
    -- Match details
    rule_type VARCHAR(50),
    match_reason JSONB, -- What conditions matched
    
    -- Performance
    evaluation_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    INDEX idx_qr_id_created (qr_id, created_at DESC),
    INDEX idx_rule_id (rule_id),
    INDEX idx_scan_id (scan_id)
);

-- Default fallbacks when no rules match
CREATE TABLE qr_routing_defaults (
    qr_id UUID PRIMARY KEY REFERENCES qrcodes(id) ON DELETE CASCADE,
    default_url TEXT NOT NULL,
    fallback_behavior VARCHAR(20) NOT NULL DEFAULT 'redirect', -- 'redirect', 'block', 'show_message'
    fallback_message TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 3. Edge Function Implementation (Cloudflare Workers)

```typescript
// functions/qr/[code].ts
export const onRequestGet: PagesFunction = async (context) => {
  const { code } = context.params;
  const request = context.request;
  
  // 1. Fetch QR code data
  const qrData = await fetchQRCode(code);
  if (!qrData) return new Response('Not found', { status: 404 });
  
  // 2. Gather scan context
  const scanContext = {
    timestamp: new Date(),
    country: request.cf?.country,
    region: request.cf?.region,
    city: request.cf?.city,
    timezone: request.cf?.timezone,
    userAgent: request.headers.get('user-agent'),
    device: detectDevice(request.headers.get('user-agent')),
    scanCount: await getScanCount(qrData.id),
    ip: request.headers.get('cf-connecting-ip'),
    fingerprint: generateFingerprint(request),
  };
  
  // 3. Fetch and evaluate routing rules
  const rules = await fetchRoutingRules(qrData.id);
  let matchedRule = null;
  let destination = null;
  
  for (const rule of rules.sort((a, b) => b.priority - a.priority)) {
    if (!rule.enabled) continue;
    
    const evaluator = getRuleEvaluator(rule.rule_type);
    const match = evaluator(rule.config, scanContext);
    
    if (match.matched) {
      matchedRule = rule;
      destination = applyRuleDestination(rule, qrData.destination_url, match);
      break;
    }
  }
  
  // 4. Use default if no match
  if (!destination) {
    const defaultConfig = await fetchDefaultRouting(qrData.id);
    destination = defaultConfig?.default_url || qrData.destination_url;
  }
  
  // 5. Log routing decision (async, don't block)
  logRoutingDecision(qrData.id, matchedRule?.id, scanContext, destination).catch(console.error);
  
  // 6. Record scan (async)
  recordScan(qrData.id, scanContext).catch(console.error);
  
  // 7. Return redirect
  return Response.redirect(destination, 302);
};

// Rule evaluators
const ruleEvaluators = {
  time: (config, context) => {
    const now = context.timestamp;
    const userTz = context.timezone || 'UTC';
    const localTime = toZonedTime(now, userTz);
    
    const currentTime = format(localTime, 'HH:mm');
    const currentDay = getDay(localTime); // 0-6
    
    const inTimeWindow = currentTime >= config.start_time && currentTime <= config.end_time;
    const onAllowedDay = config.days_of_week?.includes(currentDay) ?? true;
    const inDateRange = (!config.start_date || now >= new Date(config.start_date)) &&
                        (!config.end_date || now <= new Date(config.end_date));
    
    return {
      matched: inTimeWindow && onAllowedDay && inDateRange,
      reason: { currentTime, currentDay, inTimeWindow, onAllowedDay }
    };
  },
  
  geo: (config, context) => {
    const { countries, regions, cities, exclude_mode } = config;
    
    const countryMatch = !countries || countries.includes(context.country);
    const regionMatch = !regions || regions.includes(context.region);
    const cityMatch = !cities || cities.includes(context.city);
    
    const locationMatch = countryMatch && regionMatch && cityMatch;
    const matched = exclude_mode ? !locationMatch : locationMatch;
    
    return {
      matched,
      reason: { country: context.country, region: context.region, city: context.city }
    };
  },
  
  device: (config, context) => {
    const { os, browsers, device_types, exclude_mode } = config;
    const device = context.device;
    
    const osMatch = !os || os.includes(device.os);
    const browserMatch = !browsers || browsers.includes(device.browser);
    const typeMatch = !device_types || device_types.includes(device.type);
    
    const deviceMatch = osMatch && browserMatch && typeMatch;
    const matched = exclude_mode ? !deviceMatch : deviceMatch;
    
    return {
      matched,
      reason: { os: device.os, browser: device.browser, type: device.type }
    };
  },
  
  scan_count: (config, context) => {
    const { threshold, operator, reset_period } = config;
    let count = context.scanCount;
    
    // Apply reset period logic if needed
    if (reset_period && reset_period !== 'total') {
      count = getScanCountInPeriod(context.qrId, reset_period);
    }
    
    const operators = {
      lt: count < threshold,
      lte: count <= threshold,
      gt: count > threshold,
      gte: count >= threshold,
      eq: count === threshold,
    };
    
    return {
      matched: operators[operator] ?? false,
      reason: { count, threshold, operator }
    };
  },
  
  utm_inject: (config, context) => {
    // UTM rules always match (they modify URL rather than route)
    return { matched: true, reason: { utm_params: config } };
  }
};
```

### 4. Frontend Components

#### Routing Rules Manager

```typescript
// Component: RoutingRulesManager.tsx
interface RoutingRulesManagerProps {
  qrId: string;
}

export function RoutingRulesManager({ qrId }: RoutingRulesManagerProps) {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Dynamic Routing Rules</h3>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>
      
      <RulesList 
        rules={rules} 
        onReorder={handleReorder}
        onToggle={handleToggle}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />
      
      {isAdding && (
        <AddRuleModal 
          qrId={qrId}
          onClose={() => setIsAdding(false)}
          onSave={handleSaveRule}
        />
      )}
      
      <DefaultFallbackConfig qrId={qrId} />
      
      <RoutingAnalytics qrId={qrId} />
    </div>
  );
}

// Component: RuleBuilder (form for creating/editing rules)
export function RuleBuilder({ type, config, onChange }: RuleBuilderProps) {
  switch (type) {
    case 'time':
      return <TimeRuleBuilder config={config} onChange={onChange} />;
    case 'geo':
      return <GeoRuleBuilder config={config} onChange={onChange} />;
    case 'device':
      return <DeviceRuleBuilder config={config} onChange={onChange} />;
    case 'scan_count':
      return <ScanCountRuleBuilder config={config} onChange={onChange} />;
    default:
      return <CustomRuleBuilder config={config} onChange={onChange} />;
  }
}
```

#### Rule Builder UI Components

```typescript
// Time-based rule builder
function TimeRuleBuilder({ config, onChange }: TimeRuleBuilderProps) {
  return (
    <div className="space-y-4">
      <TimeRangePicker
        startTime={config.start_time}
        endTime={config.end_time}
        onChange={(start, end) => onChange({ ...config, start_time: start, end_time: end })}
      />
      
      <TimezoneSelector
        value={config.timezone}
        onChange={(tz) => onChange({ ...config, timezone: tz })}
      />
      
      <DaysOfWeekSelector
        selected={config.days_of_week}
        onChange={(days) => onChange({ ...config, days_of_week: days })}
      />
      
      <DateRangePicker
        startDate={config.start_date}
        endDate={config.end_date}
        onChange={(start, end) => onChange({ ...config, start_date: start, end_date: end })}
      />
    </div>
  );
}

// Geographic rule builder
function GeoRuleBuilder({ config, onChange }: GeoRuleBuilderProps) {
  return (
    <div className="space-y-4">
      <CountryMultiSelect
        selected={config.countries}
        onChange={(countries) => onChange({ ...config, countries })}
      />
      
      <RegionMultiSelect
        countries={config.countries}
        selected={config.regions}
        onChange={(regions) => onChange({ ...config, regions })}
      />
      
      <Toggle
        label="Exclude mode (route away from selected locations)"
        checked={config.exclude_mode}
        onChange={(exclude) => onChange({ ...config, exclude_mode: exclude })}
      />
    </div>
  );
}
```

### 5. API Endpoints

```typescript
// GET /api/v1/qr-codes/:id/routing-rules
// List all routing rules for a QR code
interface ListRoutingRulesResponse {
  rules: RoutingRule[];
  default_config: DefaultRoutingConfig;
}

// POST /api/v1/qr-codes/:id/routing-rules
// Create a new routing rule
interface CreateRoutingRuleRequest {
  name: string;
  description?: string;
  rule_type: RuleType;
  config: RuleConfig;
  destination_url: string;
  priority?: number;
  enabled?: boolean;
  match_behavior?: 'redirect' | 'block' | 'allow';
  track_as_conversion?: boolean;
}

// PUT /api/v1/qr-codes/:id/routing-rules/:ruleId
// Update an existing rule

// DELETE /api/v1/qr-codes/:id/routing-rules/:ruleId
// Delete a rule

// POST /api/v1/qr-codes/:id/routing-rules/reorder
// Reorder rules by priority
interface ReorderRulesRequest {
  rule_ids: string[]; // Ordered list of rule IDs
}

// GET /api/v1/qr-codes/:id/routing-analytics
// Get routing analytics
interface RoutingAnalyticsResponse {
  total_scans: number;
  rule_matches: {
    rule_id: string;
    rule_name: string;
    match_count: number;
    percentage: number;
  }[];
  unmatched_count: number;
  conversion_count: number;
  average_evaluation_time_ms: number;
}

// POST /api/v1/qr-codes/:id/routing-test
// Test routing with simulated context
interface TestRoutingRequest {
  simulate_context: {
    timestamp?: string;
    country?: string;
    region?: string;
    city?: string;
    user_agent?: string;
    scan_count?: number;
  };
}

interface TestRoutingResponse {
  matched_rule?: RoutingRule;
  destination_url: string;
  match_reason: object;
  evaluation_time_ms: number;
}
```

## Implementation Phases

### Phase 1: Core Rule Engine (MVP - 5-7 days) ✅ COMPLETED

- [x] Database schema for routing rules
- [x] Edge function rule evaluation engine
- [x] Time-based routing rules
- [x] Default fallback configuration
- [x] Routing analytics logging
- [ ] Basic rule management UI (Phase 3)

### Phase 2: Geographic & Device Routing (4-5 days)

- [ ] Geo-based routing using CF headers
- [ ] Device detection and routing
- [ ] Rule priority and ordering UI
- [ ] Test routing simulator
- [ ] Routing analytics dashboard

### Phase 3: Advanced Rules (5-7 days)

- [ ] Scan count-based routing
- [ ] UTM parameter injection
- [ ] A/B test integration with existing system
- [ ] Custom edge function rules
- [ ] Rule templates (common presets)

### Phase 4: Enterprise Features (4-5 days)

- [ ] Bulk rule import/export
- [ ] Rule versioning and rollback
- [ ] Advanced analytics (funnels, cohorts)
- [ ] API access for programmatic rule management
- [ ] Webhook notifications on rule triggers

## Business Value

### Pricing Strategy

| Plan | Dynamic Routing |
|------|-----------------|
| Free | 1 rule per QR |
| Starter | 3 rules per QR, time + geo |
| Pro | 10 rules per QR, all rule types |
| Enterprise | Unlimited rules, custom edge functions |

### Use Cases by Segment

**Restaurants & Hospitality**:
- Time-based: Breakfast menu (6am-11am), lunch (11am-4pm), dinner (4pm-10pm)
- Day-based: Weekend brunch specials vs weekday menus

**Retail & E-commerce**:
- Geo-based: US customers to US store, EU to EU store, elsewhere to global
- Device-based: Mobile to app store, desktop to website

**Marketing & Events**:
- Scan count: First 100 scans get early bird pricing
- Time-based: Pre-event info, during-event live updates, post-event recordings

**SaaS & Apps**:
- Device-based: iOS to App Store, Android to Play Store, desktop to web app
- UTM injection: Track which QR placement drove the scan

## Integration Points

### With Existing A/B Testing
- Routing rules can activate/deactivate A/B tests
- A/B test variants can be destinations in routing rules
- Unified analytics across routing + A/B testing

### With Health Monitoring
- Dynamic routing failures trigger health check alerts
- Route destinations are included in health monitoring

### With Webhooks
- `routing.rule_matched` event for external automation
- `routing.no_match` event for monitoring

### With Zapier
- Trigger: "QR Code Rule Matched"
- Action: "Update Routing Rule"

## Open Questions

1. How should rule conflicts be resolved? (Priority-based is current plan)
2. Should rules support "AND" conditions (time AND geo) or only single-type rules?
3. How to handle daylight saving time transitions in time-based rules?
4. Should we cache routing decisions for performance?
5. How to handle bot traffic in scan count rules?

## Security Considerations

- Validate all destination URLs against Safe Browsing API
- Rate limit rule changes to prevent abuse
- Audit log all rule modifications
- Sanitize user-defined custom rule inputs
- Validate redirect chains don't create loops

## Performance Targets

- Rule evaluation: <10ms p99
- Total redirect response: <50ms p99
- Support 10,000 rules per QR code (Enterprise)
- Edge caching: Cache rule configs for 60 seconds
