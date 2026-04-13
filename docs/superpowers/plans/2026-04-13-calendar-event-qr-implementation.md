# Calendar/Event QR Code Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Calendar/Event QR code type to the QRStudio component with full functionality including generation, form fields, and scanner detection

**Architecture:** The implementation will extend the existing QRStudio component to include a new 'event' type in the qrType union, add VEVENT iCal format generation in the generateQRContent function, implement form fields for event data input, and add scanner detection for calendar events.

**Tech Stack:** React, TypeScript, QRCodeStyling, html5-qrcode

---

### Task 1: Add 'event' to qrType union type

**Files:**
- Modify: `src/components/QRStudio.tsx`

- [ ] **Step 1: Update the qrType state to include 'event'**

Update the qrType state definition in QRStudio.tsx to include 'event' in the union type:

```typescript
// Current:
const [qrType, setQrType] = useState<'url' | 'text' | 'email' | 'phone' | 'sms' | 'wifi' | 'vcard'>('url');

// Updated to:
const [qrType, setQrType] = useState<'url' | 'text' | 'email' | 'phone' | 'sms' | 'wifi' | 'vcard' | 'event'>('url');
```

- [ ] **Step 2: Update the QR type options in the select dropdown**

Add the new event type to the select dropdown options:

```typescript
<option value="event" className="bg-[#111118]">📅 Event</option>
```

### Task 2: Add VEVENT iCal format generation in generateQRContent() for 'event' type

**Files:**
- Modify: `src/components/QRStudio.tsx`

- [ ] **Step 1: Add case for 'event' type in generateQRContent function**

Add a new case to the switch statement in generateQRContent function to handle the 'event' type with iCal VEVENT format:

```typescript
case 'event':
  return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${data.title}
DTSTART:${data.startDate}
DTEND:${data.endDate}
LOCATION:${data.location || ''}
DESCRIPTION:${data.description || ''}
END:VEVENT
END:VCALENDAR`;
```

### Task 3: Add form fields in getFields() for 'event' type

**Files:**
- Modify: `src/components/QRStudio.tsx`

- [ ] **Step 1: Add event fields to getFields function**

Add a new case in getFields() function to return form fields for the 'event' type:

```typescript
case 'event': return [
  { key: 'title', label: 'Event Title', placeholder: 'Annual Conference' },
  { key: 'startDate', label: 'Start Date', placeholder: '20260415T090000Z' },
  { key: 'endDate', label: 'End Date', placeholder: '20260415T170000Z' },
  { key: 'location', label: 'Location (optional)', placeholder: 'Convention Center' },
  { key: 'description', label: 'Description (optional)', placeholder: 'Event description' }
];
```

### Task 4: Add 'event' detection in scanner

**Files:**
- Modify: `src/components/QRStudio.tsx`

- [ ] **Step 1: Add event detection in the scanner**

In the QR code scanning section, add detection for calendar events by checking for "BEGIN:VCALENDAR" in the scanned data:

```typescript
// In the handleFileUpload function, add to the type detection section:
else if (result.includes('BEGIN:VCALENDAR')) type = 'event';
```

### Task 5: Create integration tests for event QR generation

**Files:**
- Create: `src/components/__tests__/QRStudio.test.tsx`

- [ ] **Step 1: Create test file for QRStudio component**

Create a new test file QRStudio.test.tsx with tests for the event QR code generation:

```typescript
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
// Import the component and any other necessary imports

describe('QRStudio Event QR Code Tests', () => {
  test('should generate correct VEVENT iCal format', () => {
    // Test that the VEVENT format is correctly generated
    const testData = {
      title: 'Team Meeting',
      startDate: '20260415T090000Z',
      endDate: '20260415T100000Z',
      location: 'Conference Room A',
      description: 'Weekly team sync'
    };
    
    const expected = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Team Meeting
DTSTART:20260415T090000Z
DTEND:20260415T100000Z
LOCATION:Conference Room A
DESCRIPTION:Weekly team sync
END:VEVENT
END:VCALENDAR`;
    
    // Expect the generated content to match the expected format
    expect(generateQRContent('event', testData)).toBe(expected);
  });
  
  test('should render event form fields correctly', () => {
    // Test that the event form fields are correctly rendered
    const fields = getFields();
    const eventFields = fields['event'];
    expect(eventFields).toHaveLength(4);
    expect(eventFields[0].key).toBe('title');
    expect(eventFields[1].key).toBe('startDate');
    expect(eventFields[2].key).toBe('endDate');
    expect(eventFields[3].key).toBe('location');
  });
});
```

- [ ] **Step 2: Run all tests to verify nothing breaks**

Run: `npm test`
Expected: All tests should pass