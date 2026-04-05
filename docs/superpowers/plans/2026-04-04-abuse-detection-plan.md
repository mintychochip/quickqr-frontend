# Abuse Detection System Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a hybrid abuse detection system that silently logs low/medium severity abuse for admin review while auto-blocking high-severity abuse with immediate admin notification.

**Architecture:** Abuse detection runs as a service layer integrated into QR creation and scan flows. Detection rules evaluate content, behavior patterns, and rate limits. Severity determines action: log only, admin queue, or auto-block with email. User abuse_score accumulates across incidents, triggering progressive restrictions.

**Tech Stack:** TypeScript, Supabase (Postgres + Edge Functions), Google Safe Browsing API, email via Supabase Edge Function

---

## File Structure

```
src/types/abuse.types.ts                    — TypeScript interfaces
src/services/abuseDetectionService.ts      — Core detection logic + scoring
src/services/emailService.ts                — Admin notification (local wrapper)
supabase/migrations/
  2026-04-04-create-abuse-incidents.sql     — abuse_incidents table
  2026-04-04-add-abuse-fields-to-profiles.sql — abuse_score, is_blocked, blocked_at
functions/send-abuse-alert/
  index.ts                                  — Edge function for admin emails
  deno.json
src/services/qrCodeCreateService.ts        — Hook abuse detection into QR creation
src/pages/QRCodeRedirect.tsx               — Hook abuse detection into scans
src/pages/Admin.tsx                        — Show abuse incidents in admin panel
```

---

## Chunk 1: Database Schema

### Task 1: Create abuse_incidents migration

**Files:**
- Create: `supabase/migrations/2026-04-04-create-abuse-incidents.sql`

- [ ] **Step 1: Write migration**

```sql
-- Create abuse_incidents table for logging detected abuse
CREATE TABLE IF NOT EXISTS abuse_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('malicious_content', 'scan_bot', 'qr_flooding', 'qr_hijacking')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  evidence JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Index for admin review queries
CREATE INDEX idx_abuse_incidents_unresolved ON abuse_incidents (created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX idx_abuse_incidents_user ON abuse_incidents (user_id) WHERE resolved_at IS NULL;

-- RLS
ALTER TABLE abuse_incidents ENABLE ROW LEVEL SECURITY;

-- Admins can view all incidents
CREATE POLICY "Admins can view abuse incidents"
  ON abuse_incidents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND admin = true
    )
  );

-- Only service role can insert incidents (via service key)
CREATE POLICY "Service role can insert abuse incidents"
  ON abuse_incidents FOR INSERT
  TO service_role
  WITH CHECK (true);
```

- [ ] **Step 2: Apply migration**

Run: `supabase db push` or apply via Supabase dashboard
Expected: Migration applies successfully, table created

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/2026-04-04-create-abuse-incidents.sql
git commit -m "feat: add abuse_incidents table for logging detected abuse"
```

---

### Task 2: Add abuse fields to profiles

**Files:**
- Create: `supabase/migrations/2026-04-04-add-abuse-fields-to-profiles.sql`

- [ ] **Step 1: Write migration**

```sql
-- Add abuse scoring and blocking fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS abuse_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- Index for blocked user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_blocked ON profiles (is_blocked) WHERE is_blocked = true;

-- Prevent non-admins from viewing/modifying abuse fields
-- (abuse_score and is_blocked should only be visible to admins and the owning user via RLS)
```

- [ ] **Step 2: Apply migration**

Run: `supabase db push` or apply via Supabase dashboard
Expected: Migration applies, columns added

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/2026-04-04-add-abuse-fields-to-profiles.sql
git commit -m "feat: add abuse_score and is_blocked fields to profiles"
```

---

## Chunk 2: TypeScript Types

### Task 3: Create abuse.types.ts

**Files:**
- Create: `src/types/abuse.types.ts`

- [ ] **Step 1: Write types**

```typescript
export type AbuseType = 'malicious_content' | 'scan_bot' | 'qr_flooding' | 'qr_hijacking';
export type AbuseSeverity = 'low' | 'medium' | 'high';

export interface AbuseIncident {
  id: string;
  user_id: string | null;
  type: AbuseType;
  severity: AbuseSeverity;
  evidence: AbuseEvidence;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface AbuseEvidence {
  // Common fields
  ip?: string;
  user_agent?: string;
  timestamp?: string;

  // Malicious content specific
  url?: string;
  domain?: string;
  safe_browsing_match?: string;

  // Scan bot specific
  scan_count?: number;
  fingerprint?: string;
  time_window_seconds?: number;
  ip_scan_count?: number;
  ip_time_window_seconds?: number;

  // QR flooding specific
  qr_count?: number;
  time_window_hours?: number;
  user_tier?: string;

  // QR hijacking specific
  slug?: string;
  scan_count_delta?: number;
  scan_delta_seconds?: number;
}

export interface AbuseDetectionResult {
  severity: AbuseSeverity | null;
  type: AbuseType | null;
  evidence: AbuseEvidence;
  shouldBlock: boolean;
  shouldLog: boolean;
}

export interface ScanBotDetectionInput {
  slug: string;
  os: string;
  fingerprint?: string;
  ip: string;
}

export interface QrFloodingDetectionInput {
  userId: string;
  recentQrCount: number;
  timeWindowHours: number;
}

export interface UserAbuseStatus {
  abuseScore: number;
  isBlocked: boolean;
  tier: 'clean' | 'watch' | 'restricted' | 'blocked';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/abuse.types.ts
git commit -m "feat: add abuse detection TypeScript types"
```

---

## Chunk 3: Abuse Detection Service

### Task 4: Create abuseDetectionService.ts

**Files:**
- Create: `src/services/abuseDetectionService.ts`
- Modify: `src/config/supabase.ts` (add admin client if needed for RPCs)

- [ ] **Step 1: Write types + constants test**

```typescript
// Place in src/services/__tests__/abuseDetectionService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectScanBot, detectQrFlooding, checkQrContent } from '../abuseDetectionService';

vi.mock('../../config/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      gte: vi.fn().mockReturnThis(),
    }),
    rpc: vi.fn(),
  },
}));

describe('detectScanBot', () => {
  it('should return null for legitimate scan patterns', async () => {
    // 1-2 scans over a minute is normal user behavior
    const result = await detectScanBot({
      slug: 'test-slug',
      os: 'iOS',
      fingerprint: 'user-fingerprint',
      ip: '192.168.1.1',
    });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/__tests__/abuseDetectionService.test.ts`
Expected: FAIL — function not exported yet

- [ ] **Step 3: Write minimal detection service**

```typescript
import { supabase } from '../config/supabase';
import type {
  AbuseDetectionResult,
  AbuseEvidence,
  AbuseSeverity,
  AbuseType,
  ScanBotDetectionInput,
  QrFloodingDetectionInput,
  UserAbuseStatus,
} from '../types/abuse';

// Detection thresholds
const SCAN_BOT_SAME_FP_WINDOW_SECONDS = 60;
const SCAN_BOT_SAME_FP_THRESHOLD = 10;
const SCAN_BOT_SAME_IP_WINDOW_SECONDS = 3600;
const SCAN_BOT_SAME_IP_THRESHOLD = 100;

const QR_FLOODING_COUNT_THRESHOLD = 20;
const QR_FLOODING_WINDOW_HOURS = 1;

const SAFE_BROWSING_API = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

export async function checkQrContent(content: Record<string, unknown>): Promise<AbuseDetectionResult> {
  const url = content.url as string | undefined;
  if (!url) return { severity: null, type: null, evidence: {}, shouldBlock: false, shouldLog: false };

  const apiKey = import.meta.env.VITE_SAFE_BROWSING_API_KEY;
  if (!apiKey) {
    // If no API key, skip Safe Browsing check but log it
    return {
      severity: null,
      type: null,
      evidence: { url, warning: 'Safe Browsing API key not configured' },
      shouldBlock: false,
      shouldLog: false,
    };
  }

  try {
    const response = await fetch(`${SAFE_BROWSING_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
    });

    const data = await response.json();
    if (data.matches && data.matches.length > 0) {
      const match = data.matches[0];
      return {
        severity: 'high',
        type: 'malicious_content',
        evidence: {
          url,
          domain: new URL(url).hostname,
          safe_browsing_match: match.threatType,
        },
        shouldBlock: true,
        shouldLog: true,
      };
    }
  } catch (error) {
    // On error, don't block — log and continue
    console.error('Safe Browsing API error:', error);
  }

  return { severity: null, type: null, evidence: { url }, shouldBlock: false, shouldLog: false };
}

export async function detectScanBot(input: ScanBotDetectionInput): Promise<AbuseDetectionResult | null> {
  const { slug, ip, fingerprint } = input;
  const windowStart = new Date(Date.now() - SCAN_BOT_SAME_IP_WINDOW_SECONDS * 1000).toISOString();

  // Check scans by same IP in time window
  const { data: ipScans } = await supabase
    .from('scans')
    .select('id')
    .eq('ip', ip)
    .gte('created_at', windowStart);

  const ipScanCount = ipScans?.length || 0;
  if (ipScanCount > SCAN_BOT_SAME_IP_THRESHOLD) {
    return {
      severity: 'high',
      type: 'scan_bot',
      evidence: {
        ip,
        ip_scan_count: ipScanCount,
        ip_time_window_seconds: SCAN_BOT_SAME_IP_WINDOW_SECONDS,
      },
      shouldBlock: false,
      shouldLog: true,
    };
  }

  // Check scans by same fingerprint in time window (if fingerprint provided)
  if (fingerprint) {
    const fpWindowStart = new Date(Date.now() - SCAN_BOT_SAME_FP_WINDOW_SECONDS * 1000).toISOString();
    const { data: fpScans } = await supabase
      .from('scans')
      .select('id')
      .eq('fingerprint', fingerprint)
      .gte('created_at', fpWindowStart);

    const fpScanCount = fpScans?.length || 0;
    if (fpScanCount > SCAN_BOT_SAME_FP_THRESHOLD) {
      return {
        severity: 'medium',
        type: 'scan_bot',
        evidence: {
          fingerprint,
          scan_count: fpScanCount,
          time_window_seconds: SCAN_BOT_SAME_FP_WINDOW_SECONDS,
        },
        shouldBlock: false,
        shouldLog: true,
      };
    }
  }

  return null;
}

export async function detectQrFlooding(input: QrFloodingDetectionInput): Promise<AbuseDetectionResult | null> {
  const { userId, recentQrCount, timeWindowHours } = input;

  if (timeWindowHours <= QR_FLOODING_WINDOW_HOURS && recentQrCount > QR_FLOODING_COUNT_THRESHOLD) {
    return {
      severity: 'medium',
      type: 'qr_flooding',
      evidence: {
        qr_count: recentQrCount,
        time_window_hours: timeWindowHours,
      },
      shouldBlock: false,
      shouldLog: true,
    };
  }

  // Check total count for free tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single();

  if (profile?.tier === 'free') {
    const { count: totalCount } = await supabase
      .from('qrcodes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if ((totalCount || 0) > 100) {
      return {
        severity: 'high',
        type: 'qr_flooding',
        evidence: {
          qr_count: totalCount,
          user_tier: 'free',
          time_window_hours: 'total',
        },
        shouldBlock: false,
        shouldLog: true,
      };
    }
  }

  return null;
}

export async function getUserAbuseStatus(userId: string): Promise<UserAbuseStatus> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('abuse_score, is_blocked')
    .eq('id', userId)
    .single();

  const abuseScore = profile?.abuse_score || 0;
  const isBlocked = profile?.is_blocked || false;

  let tier: UserAbuseStatus['tier'] = 'clean';
  if (isBlocked) tier = 'blocked';
  else if (abuseScore > 60) tier = 'restricted';
  else if (abuseScore > 30) tier = 'watch';

  return { abuseScore, isBlocked, tier };
}

export async function incrementAbuseScore(userId: string, severity: AbuseSeverity): Promise<void> {
  const increment = severity === 'high' ? 30 : severity === 'medium' ? 15 : 5;

  await supabase.rpc('increment_abuse_score', { user_id: userId, increment });
}

export async function logAbuseIncident(
  userId: string | null,
  type: AbuseType,
  severity: AbuseSeverity,
  evidence: AbuseEvidence
): Promise<void> {
  await supabase.from('abuse_incidents').insert({
    user_id: userId,
    type,
    severity,
    evidence,
  });
}

export async function blockUser(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ is_blocked: true, blocked_at: new Date().toISOString() })
    .eq('id', userId);
}

export async function runAbuseDetection(
  userId: string | null,
  type: 'create' | 'scan',
  data: Record<string, unknown>
): Promise<AbuseDetectionResult | null> {
  let result: AbuseDetectionResult | null = null;

  if (type === 'create') {
    // Check QR content for malicious URLs
    const contentResult = await checkQrContent(data.content as Record<string, unknown>);
    if (contentResult?.severity) {
      result = contentResult;
    }

    // Check for QR flooding
    const floodingResult = await detectQrFlooding({
      userId: userId!,
      recentQrCount: data.recentQrCount as number || 1,
      timeWindowHours: data.timeWindowHours as number || 1,
    });
    if (floodingResult?.severity && (!result || floodingResult.severity === 'high')) {
      result = floodingResult;
    }
  }

  if (type === 'scan') {
    const scanResult = await detectScanBot({
      slug: data.slug as string,
      os: data.os as string,
      fingerprint: data.fingerprint as string | undefined,
      ip: data.ip as string,
    });
    result = scanResult;
  }

  // Handle result
  if (result) {
    if (result.shouldLog && userId) {
      await logAbuseIncident(userId, result.type!, result.severity!, result.evidence);
      await incrementAbuseScore(userId, result.severity!);
    }

    if (result.shouldBlock && userId) {
      await blockUser(userId);
      // TODO: Trigger email notification via edge function
    }
  }

  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/services/__tests__/abuseDetectionService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/services/abuseDetectionService.ts src/types/abuse.types.ts
git commit -m "feat: add abuse detection service with scan bot and QR flooding detection"
```

---

## Chunk 4: Admin Notification Edge Function

### Task 5: Create send-abuse-alert Edge Function

**Files:**
- Create: `functions/send-abuse-alert/index.ts`
- Create: `functions/send-abuse-alert/deno.json`

- [ ] **Step 1: Write edge function**

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface AbuseAlertPayload {
  userId: string;
  userEmail: string;
  abuseType: string;
  severity: string;
  evidence: Record<string, unknown>;
  timestamp: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload: AbuseAlertPayload = await req.json();
  const adminEmail = Deno.env.get('ABUSE_ALERT_EMAIL');

  if (!adminEmail) {
    console.error('ABUSE_ALERT_EMAIL not configured');
    return new Response('Internal server error', { status: 500 });
  }

  const evidenceText = JSON.stringify(payload.evidence, null, 2);
  const emailBody = `
Abuse Detection Alert

A high-severity abuse incident has been auto-blocked.

User: ${payload.userEmail} (${payload.userId})
Type: ${payload.abuseType}
Severity: ${payload.severity}
Time: ${payload.timestamp}

Evidence:
${evidenceText}

View in Admin Panel: ${Deno.env.get('APP_URL') || 'https://quickqr.app'}/admin

---
QuickQR Abuse Detection System
  `.trim();

  // Use Supabase's built-in email sending via Edge Function
  // or integrate with Resend, SendGrid, etc.
  const { error } = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'QuickQR Abuse <abuse@quickqr.app>',
      to: adminEmail,
      subject: `[QuickQR] High-Severity Abuse Auto-Blocked: ${payload.abuseType}`,
      text: emailBody,
    }),
  }).then(r => r.json());

  if (error) {
    console.error('Failed to send abuse alert email:', error);
    return new Response('Failed to send alert', { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Write deno.json**

```json
{
  "name": "send-abuse-alert",
  "version": "1.0.0",
  "imports": {
    "jsr:@supabase/functions-js/edge-runtime.d.ts": "https://esm.sh/@supabase/functions-js@2.4.1/edge-runtime.d.ts"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add functions/send-abuse-alert/index.ts functions/send-abuse-alert/deno.json
git commit -m "feat: add send-abuse-alert edge function for admin notifications"
```

---

## Chunk 5: Integration

### Task 6: Hook abuse detection into QR creation

**Files:**
- Modify: `src/services/qrCodeCreateService.ts`

- [ ] **Step 1: Read current file**

Run: `cat src/services/qrCodeCreateService.ts`

- [ ] **Step 2: Add abuse detection integration**

Add to top of `createQRCode` function:
```typescript
import { runAbuseDetection, getUserAbuseStatus } from './abuseDetectionService';

// Check user abuse status before creating
const abuseStatus = await getUserAbuseStatus(userId);
if (abuseStatus.isBlocked) {
  return { success: false, error: 'Account temporarily suspended. Contact support.' };
}
if (abuseStatus.tier === 'restricted') {
  return { success: false, error: 'Account has restrictions. Please reduce QR creation rate.' };
}

// After QR creation, run abuse detection
const abuseResult = await runAbuseDetection(userId, 'create', {
  content,
  recentQrCount: 1, // TODO: Get actual recent count
  timeWindowHours: 1,
});
```

- [ ] **Step 3: Commit**

```bash
git add src/services/qrCodeCreateService.ts
git commit -m "feat: integrate abuse detection into QR code creation"
```

---

### Task 7: Hook abuse detection into scan flow

**Files:**
- Modify: `src/pages/QRCodeRedirect.tsx`

- [ ] **Step 1: Read current file**

Run: `cat src/pages/QRCodeRedirect.tsx`

- [ ] **Step 2: Add abuse detection after scan recording**

After the scan is recorded (after `supabase.from('scans').insert(...)`), add:
```typescript
// Run abuse detection on scan
runAbuseDetection(qrCode.user_id, 'scan', {
  slug,
  os,
  ip: await getClientIP(), // Need to implement or pass through
  fingerprint: getFingerprint(), // Implement device fingerprinting
});
```

Note: This runs async and doesn't block the redirect.

- [ ] **Step 3: Commit**

```bash
git add src/pages/QRCodeRedirect.tsx
git commit -m "feat: integrate abuse detection into QR code scan flow"
```

---

### Task 8: Add abuse incidents to Admin panel

**Files:**
- Modify: `src/pages/Admin.tsx`
- Modify: `src/services/adminService.ts`

- [ ] **Step 1: Add fetchAbuseIncidents to adminService**

```typescript
export async function fetchAbuseIncidents(): Promise<{ success: boolean; incidents?: AbuseIncident[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('abuse_incidents')
      .select('*')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return { success: false, error: error.message };
    return { success: true, incidents: data || [] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch' };
  }
}

export async function resolveAbuseIncident(id: string): Promise<{ success: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  await supabase
    .from('abuse_incidents')
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('id', id);

  return { success: true };
}
```

- [ ] **Step 2: Add abuse incidents section to Admin.tsx**

Add a new tab/section in the Admin panel showing unresolved abuse incidents with:
- User email
- Abuse type
- Severity badge
- Evidence preview
- "Resolve" button

- [ ] **Step 3: Commit**

```bash
git add src/pages/Admin.tsx src/services/adminService.ts
git commit -m "feat: show abuse incidents in admin panel"
```

---

## Chunk 6: RPC Function for Abuse Score Increment

### Task 9: Create increment_abuse_score Postgres function

**Files:**
- Create: `supabase/migrations/2026-04-04-create-increment-abuse-score.sql`

- [ ] **Step 1: Write migration**

```sql
CREATE OR REPLACE FUNCTION increment_abuse_score(user_id UUID, increment INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET
    abuse_score = LEAST(abuse_score + increment, 100),
    is_blocked = CASE WHEN abuse_score + increment >= 100 THEN TRUE ELSE is_blocked END
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/2026-04-04-create-increment-abuse-score.sql
git commit -m "feat: add increment_abuse_score Postgres function"
```

---

## Environment Variables

Add to `.env.example`:

```
VITE_SAFE_BROWSING_API_KEY=     # Google Safe Browsing API key
ABUSE_ALERT_EMAIL=              # Admin email for notifications
RESEND_API_KEY=                 # For sending emails from edge function
```

---

## Test Coverage Targets

- `detectScanBot`: Normal user, fingerprint bot, IP bot
- `detectQrFlooding`: Normal user, flooding user, free tier over limit
- `checkQrContent`: Safe URL, malicious URL, no API key configured
- `getUserAbuseStatus`: Clean, watch, restricted, blocked tiers
- `blockUser`: Verify profile updated correctly

---

## Review Checklist Before Marking Complete

- [ ] All migrations applied to Supabase
- [ ] Edge function deployed
- [ ] Environment variables configured
- [ ] Abuse detection fires on QR creation (tested manually)
- [ ] Abuse detection fires on scan (tested manually)
- [ ] Admin panel shows abuse incidents
- [ ] Email notification fires on auto-block (tested)
- [ ] Tests passing
