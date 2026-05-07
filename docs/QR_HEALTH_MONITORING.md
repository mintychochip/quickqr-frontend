# QR Health Monitoring - Feature Research

## Overview
QR Health Monitoring is a proactive feature that periodically checks if QR code destination URLs are still valid and accessible. This prevents "dead" QR codes that lead to 404s or broken sites.

## Problem
Users create QR codes pointing to external URLs, but have no visibility when:
- Destination site goes down
- URL returns 404/500 errors
- SSL certificate expires
- Domain expires or changes hands
- Content is moved without redirect

## Solution: Automated Health Checks

### Core Features

1. **Periodic URL Validation**
   - HEAD/GET requests to QR destination URLs
   - Check HTTP status codes (2xx = healthy, 4xx/5xx = unhealthy)
   - SSL certificate validation
   - Response time tracking

2. **Health Status Dashboard**
   - Visual indicator (green/yellow/red) per QR code
   - Last checked timestamp
   - Error details when unhealthy
   - Filter/sort by health status

3. **Notification System**
   - Email alerts when QR code becomes unhealthy
   - Webhook support for integration with Slack/PagerDuty
   - Configurable check frequency per QR code
   - Batch daily/weekly digest option

4. **Auto-Remediation Options**
   - Suggest alternative URLs based on redirects
   - Archive/disable broken QR codes automatically
   - Fallback URL configuration

### Technical Implementation

```
Database Schema:
- qr_health_checks table:
  - id, qr_code_id, checked_at, status (healthy/unhealthy/error)
  - http_status, response_time_ms, error_message, ssl_valid

- qr_code_settings table (add column):
  - health_check_enabled (boolean)
  - health_check_frequency (daily/weekly/monthly)
  - notify_email, notify_webhook_url

Background Job:
- Cron job runs every hour
- Queue health checks for enabled QR codes
- Rate-limited HTTP requests (respect robots.txt, add delays)
- Store results, trigger notifications on status change
```

### API Endpoints Needed

```
GET /api/qr-codes/:id/health - Get health status for a QR code
POST /api/qr-codes/:id/health/check - Trigger manual health check
PUT /api/qr-codes/:id/health/settings - Update health check settings
GET /api/health/dashboard - Aggregate health metrics
```

### UI Components

1. QR Code List View
   - Add health status icon/badge to each QR card
   - Filter by health status

2. QR Code Detail View
   - Health status section with history graph
   - Enable/disable health checks toggle
   - Notification settings
   - Manual "Check Now" button

3. Health Dashboard
   - Overall health score (% of healthy QRs)
   - Recent failures list
   - Trend graph (health over time)

### Competitive Analysis

Most QR SaaS platforms (QR Tiger, Flowcode, Beaconstac) offer this as a premium feature because:
- It demonstrates ongoing value beyond code generation
- Reduces customer churn from "my QR stopped working" complaints
- Creates upsell opportunity for monitoring plans

### Estimated Scope

- Backend: 2-3 API endpoints, 1 database table, 1 cron job
- Frontend: 3-4 UI components, settings panel
- Testing: Integration tests for HTTP checks, notification triggers
- Timeline: ~2-3 days for MVP

### Open Questions

1. Check frequency default? (suggest: weekly for free, daily for paid)
2. Notification channels beyond email? (Slack, webhook)
3. Should we follow redirects and warn if destination changed?
4. Rate limiting strategy to avoid being blocked by destination sites?

---

Research conducted: 2026-05-01
Next step: Await prioritization or user feedback on this feature direction
