# Abuse Detection System Design

**Date:** 2026-04-04
**Status:** Approved

## Overview

A hybrid abuse detection system that silently logs lower-severity abuse for admin review while auto-blocking confirmed high-severity abuse with immediate admin notification.

## Scope

Detect and handle 4 abuse types:
1. **Malicious QR content** — URLs pointing to phishing/malware/inappropriate content
2. **Scan bot abuse** — Automated tools inflating scan counts or probing the system
3. **Spam QR generation** — Mass flooding with QR codes
4. **QR code hijacking** — Guessing IDs to hijack existing QR codes

## Severity Model

| Severity | Detection Trigger | Action |
|----------|-------------------|--------|
| Low | Suspicious patterns (not confirmed abuse) | Silent log, increment `abuse_score` on user |
| Medium | Violation detected | Silent log + admin review queue |
| High | Confirmed abuse (malware URL, bot confirmed) | Auto-block + immediate email to admin |

## Architecture

### Components

#### 1. Abuse Detection Service (`src/services/abuseDetectionService.ts`)

```
checkQrContent(content)     — URL reputation via Google Safe Browsing API
detectScanBot(slug, os, scanHistory)  — Pattern recognition for bot-like scans
detectQrFlooding(userId)    — Rate limiting on QR creation per user
detectQrHijacking(slug)     — Monitor for rapid scan_count changes
```

#### 2. Database Schema

**New `abuse_incidents` table:**
```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES profiles(id)
type        TEXT ('malicious_content', 'scan_bot', 'qr_flooding', 'qr_hijacking')
severity    TEXT ('low', 'medium', 'high')
evidence    JSONB
created_at  TIMESTAMPTZ
resolved_at TIMESTAMPTZ
resolved_by UUID REFERENCES profiles(id)
```

**Updated `profiles` table:**
```sql
abuse_score INTEGER DEFAULT 0  -- 0-100+ scale
is_blocked BOOLEAN DEFAULT FALSE
blocked_at TIMESTAMPTZ
```

#### 3. User `abuse_score` Thresholds

| Score | Status | Effect |
|-------|--------|--------|
| 0-30 | Clean | Normal operation |
| 31-60 | Watch | Extra logging, rate limit warnings |
| 61-100 | Restricted | QR creation limited, admin flagged |
| 100+ | Auto-blocked | Cannot create new QR codes |

#### 4. Auto-block Triggers (High Severity)

- Malware/phishing URL confirmed by Safe Browsing API
- Bot signature definitively matched (>100 bot scans detected)
- >50 QR codes created in 1 hour by same user
- Manual admin override

Blocked users cannot create new QR codes but existing QR codes still serve (graceful degradation).

#### 5. Admin Notification

When high-severity auto-block triggers:
- Email sent immediately to admin via Supabase Edge Function
- Email contains: user info, abuse type, evidence snippet, timestamp, link to admin panel

### Data Flow

```
User creates/scans QR
        ↓
Abuse Detection Service
        ↓
    ┌───┴───┐
  Low/Med  High
    ↓       ↓
 Log only  Auto-block
    ↓       ↓
 admin    Email admin
 review   + block user
    ↓
 resolve incident
    ↓
 decrement abuse_score
```

## Detection Rules

### Malicious Content
- Check URLs against Google Safe Browsing API before saving QR code
- Block known phishing, malware, and inappropriate domains
- Log attempt but do not auto-block (may be false positive)

### Scan Bot Detection
- >10 scans from same fingerprint within 1 minute
- >100 scans from same IP in 1 hour
- Scan pattern matches known bot signatures
- Suspicious: rapid sequential scan attempts with no referrer

### QR Flooding Detection
- >20 QR codes created in 1 hour by same user
- >100 QR codes total for free-tier users
- Configurable limits via environment variables

### QR Hijacking Detection
- Monitor for rapid scan_count changes suggesting ID enumeration
- UUID v4 format provides ~30 bits of entropy — enumeration is infeasible but we log attempts
- Alert if scan_count increases without corresponding legitimate scan pattern

## File Structure

```
src/services/abuseDetectionService.ts   — Core detection logic
src/services/emailService.ts            — Admin notification emails
src/types/abuse.types.ts                — TypeScript types

supabase/
  migrations/
    2026-04-04-create-abuse-incidents.sql
    2026-04-04-add-abuse-fields-to-profiles.sql

functions/
  send-abuse-alert/                      — Edge function for admin emails
```

## Environment Variables

```
VITE_SAFE_BROWSING_API_KEY   — Google Safe Browsing API key
ABUSE_ALERT_EMAIL            — Admin email for notifications
```

## Testing Strategy

- Unit tests for each detection function
- Integration tests with mock Supabase data
- Simulated bot traffic tests in staging

## Future Enhancements

- IP-based rate limiting at edge (Vercel Firewall)
- CAPTCHA integration for flagged users
- User-facing abuse appeal flow
- Machine learning anomaly detection for scan patterns
