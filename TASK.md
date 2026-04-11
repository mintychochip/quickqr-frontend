# Task: Implement ScanLimits Component for QuickQR

## Overview
Implement a scan count limits feature that allows users to limit QR codes by maximum number of scans.

## Context
The QuickQR app has advanced QR settings in src/components/:
- PasswordProtection.tsx - password protection
- QRScheduler.tsx - time-based scheduling with expiration dates  
- ABTestManager.tsx - A/B testing

You need to create a new ScanLimits component following the same pattern.

## Files to Create/Modify

### 1. Create `src/components/scanlimits/ScanLimits.tsx`
Interface: maxScans (number), enabled (boolean), message (string for when limit reached)
- UI: Toggle to enable, number input for max scans, text input for custom message
- Save/load from Supabase table 'qr_scan_limits' (qr_id, max_scans, current_scans, enabled, message)
- Use the same styling pattern as PasswordProtection (amber/yellow theme like #fef3c7 background)

### 2. Find and update the QR settings modal
- Find where the Advanced modal is (likely src/components/QRSettingsModal.tsx or similar)
- Add a new tab for "Limits" that renders the ScanLimits component
- The modal already has tabs for Scheduling, Protection, A/B Testing

### 3. Update scan tracking logic
- Find where scans are recorded (likely in a redirect/analytics service)
- Before recording a scan, check if limit is reached
- If limit reached, show the custom message instead of redirecting
- Increment current_scans counter with each valid scan

### 4. Create `src/services/__tests__/scanLimitsService.test.ts`
- Test incrementing scan count
- Test limit enforcement
- Test limit reached message display

## Database Schema (assume exists)
Table: 'qr_scan_limits'
- qr_id (uuid, primary key)
- max_scans (integer)
- current_scans (integer, default 0)
- enabled (boolean)
- message (text, for limit reached message)

## Reference Files
- src/components/password/PasswordProtection.tsx - follow this pattern
- src/components/scheduling/QRScheduler.tsx - for Supabase interaction pattern

## Steps
1. Read PasswordProtection.tsx and QRScheduler.tsx to understand the pattern
2. Create ScanLimits.tsx component
3. Find the settings modal and add the Limits tab
4. Find scan tracking code and add limit enforcement
5. Create test file
6. Run `npm test` to verify all tests pass
7. Commit with message: "feat: add scan count limits for QR codes"

## Verification
- Component renders correctly with toggle, number input, text input
- Settings save to and load from Supabase
- Scan limits are enforced during redirect
- All existing tests still pass
- New tests for scan limits pass
