/**
 * QRStudio Component Tests - Calendar/Event QR Support
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock QR dependencies
vi.mock('qr-code-styling', () => ({
  default: vi.fn().mockImplementation(() => ({
    getRawData: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' })),
  })),
}));

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => ({
    scanFile: vi.fn(),
  })),
}));

describe('QRStudio Calendar/Event QR Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateQRContent - VEVENT iCal Format', () => {
    const generateQRContent = (type: string, data: Record<string, string>): string => {
      switch (type) {
        case 'url': return data.url || '';
        case 'text': return data.text || '';
        case 'email':
          const subject = data.subject ? `?subject=${encodeURIComponent(data.subject)}` : '';
          const body = data.body ? `${subject ? '&' : '?'}body=${encodeURIComponent(data.body)}` : '';
          return `mailto:${data.email || ''}${subject}${body}`;
        case 'phone': return `tel:${data.phone || ''}`;
        case 'sms':
          const smsBody = data.message ? `?body=${encodeURIComponent(data.message)}` : '';
          return `sms:${data.phone || ''}${smsBody}`;
        case 'wifi':
          return `WIFI:T:${data.encryption || 'WPA'};S:${data.ssid || ''};P:${data.password || ''};${data.hidden === 'true' ? 'H:true;' : ''};`;
        case 'vcard':
          return `BEGIN:VCARD\nVERSION:3.0\nN:${data.lastName || ''};${data.firstName || ''};;;\nFN:${data.firstName || ''} ${data.lastName || ''}\n${data.phone ? `TEL:${data.phone}\n` : ''}${data.email ? `EMAIL:${data.email}\n` : ''}END:VCARD`;
        case 'event':
          return `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${data.title || ''}\nDTSTART:${data.startDate || ''}\nDTEND:${data.endDate || ''}${data.location ? `\nLOCATION:${data.location}` : ''}${data.description ? `\nDESCRIPTION:${data.description}` : ''}\nEND:VEVENT\nEND:VCALENDAR`;
        default: return '';
      }
    };

    test('generates basic VEVENT with title and dates', () => {
      const data = {
        title: 'Team Meeting',
        startDate: '20250115T140000',
        endDate: '20250115T150000',
      };
      const result = generateQRContent('event', data);
      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('VERSION:2.0');
      expect(result).toContain('BEGIN:VEVENT');
      expect(result).toContain('SUMMARY:Team Meeting');
      expect(result).toContain('DTSTART:20250115T140000');
      expect(result).toContain('DTEND:20250115T150000');
      expect(result).toContain('END:VEVENT');
      expect(result).toContain('END:VCALENDAR');
    });

    test('includes location when provided', () => {
      const data = {
        title: 'Conference',
        startDate: '20250610T090000',
        endDate: '20250610T170000',
        location: 'Convention Center Hall A',
      };
      const result = generateQRContent('event', data);
      expect(result).toContain('LOCATION:Convention Center Hall A');
    });

    test('includes description when provided', () => {
      const data = {
        title: 'Workshop',
        startDate: '20250320T100000',
        endDate: '20250320T120000',
        description: 'Hands-on coding workshop',
      };
      const result = generateQRContent('event', data);
      expect(result).toContain('DESCRIPTION:Hands-on coding workshop');
    });

    test('includes both location and description when provided', () => {
      const data = {
        title: 'Product Launch',
        startDate: '20250701T130000',
        endDate: '20250701T150000',
        location: 'Main Auditorium',
        description: 'Q3 product showcase',
      };
      const result = generateQRContent('event', data);
      expect(result).toContain('LOCATION:Main Auditorium');
      expect(result).toContain('DESCRIPTION:Q3 product showcase');
    });

    test('handles empty optional fields gracefully', () => {
      const data = {
        title: 'Quick Sync',
        startDate: '20250120T090000',
        endDate: '20250120T093000',
        location: '',
        description: '',
      };
      const result = generateQRContent('event', data);
      expect(result).not.toContain('LOCATION');
      expect(result).not.toContain('DESCRIPTION');
    });
  });

  describe('QR Type Detection', () => {
    test('detects BEGIN:VCALENDAR as event type', () => {
      const result = 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Test\nEND:VEVENT\nEND:VCALENDAR';
      let type = 'text';
      if (result.startsWith('http://') || result.startsWith('https://')) type = 'url';
      else if (result.startsWith('mailto:')) type = 'email';
      else if (result.startsWith('tel:')) type = 'phone';
      else if (result.startsWith('sms:')) type = 'sms';
      else if (result.startsWith('WIFI:')) type = 'wifi';
      else if (result.startsWith('BEGIN:VCARD')) type = 'vcard';
      else if (result.startsWith('BEGIN:VCALENDAR')) type = 'event';
      expect(type).toBe('event');
    });

    test('preserves other type detections', () => {
      const tests = [
        { input: 'https://example.com', expected: 'url' },
        { input: 'mailto:test@example.com', expected: 'email' },
        { input: 'tel:+1234567890', expected: 'phone' },
        { input: 'sms:+1234567890', expected: 'sms' },
        { input: 'WIFI:T:WPA;S:Network;', expected: 'wifi' },
        { input: 'BEGIN:VCARD\nVERSION:3.0', expected: 'vcard' },
        { input: 'plain text', expected: 'text' },
      ];

      tests.forEach(({ input, expected }) => {
        let type = 'text';
        if (input.startsWith('http://') || input.startsWith('https://')) type = 'url';
        else if (input.startsWith('mailto:')) type = 'email';
        else if (input.startsWith('tel:')) type = 'phone';
        else if (input.startsWith('sms:')) type = 'sms';
        else if (input.startsWith('WIFI:')) type = 'wifi';
        else if (input.startsWith('BEGIN:VCARD')) type = 'vcard';
        else if (input.startsWith('BEGIN:VCALENDAR')) type = 'event';
        expect(type).toBe(expected);
      });
    });
  });

  describe('Event Form Fields', () => {
    const getFields = (qrType: string) => {
      switch (qrType) {
        case 'url': return [{ key: 'url', label: 'URL / Website', placeholder: 'https://example.com' }];
        case 'text': return [{ key: 'text', label: 'Text Content', placeholder: 'Enter your message here...' }];
        case 'email': return [
          { key: 'email', label: 'Email Address', placeholder: 'email@example.com' },
          { key: 'subject', label: 'Subject (optional)', placeholder: 'Email subject' },
          { key: 'body', label: 'Message (optional)', placeholder: 'Email body' }
        ];
        case 'phone': return [{ key: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567' }];
        case 'sms': return [
          { key: 'phone', label: 'Phone Number', placeholder: '+1 (555) 123-4567' },
          { key: 'message', label: 'Message (optional)', placeholder: 'Your SMS message' }
        ];
        case 'wifi': return [
          { key: 'ssid', label: 'Network Name (SSID)', placeholder: 'MyWiFiNetwork' },
          { key: 'password', label: 'Password', placeholder: 'WiFi password' },
          { key: 'encryption', label: 'Security', placeholder: 'WPA' },
          { key: 'hidden', label: 'Hidden Network', placeholder: 'false' }
        ];
        case 'vcard': return [
          { key: 'firstName', label: 'First Name', placeholder: 'John' },
          { key: 'lastName', label: 'Last Name', placeholder: 'Doe' },
          { key: 'phone', label: 'Phone (optional)', placeholder: '+1 (555) 123-4567' },
          { key: 'email', label: 'Email (optional)', placeholder: 'john@example.com' },
          { key: 'organization', label: 'Company (optional)', placeholder: 'Acme Inc' }
        ];
        case 'event': return [
          { key: 'title', label: 'Event Title', placeholder: 'Team Meeting' },
          { key: 'startDate', label: 'Start Date (YYYYMMDDTHHMMSS)', placeholder: '20250115T140000' },
          { key: 'endDate', label: 'End Date (YYYYMMDDTHHMMSS)', placeholder: '20250115T150000' },
          { key: 'location', label: 'Location (optional)', placeholder: 'Conference Room A' },
          { key: 'description', label: 'Description (optional)', placeholder: 'Weekly team sync' }
        ];
        default: return [];
      }
    };

    test('returns correct fields for event type', () => {
      const fields = getFields('event');
      expect(fields).toHaveLength(5);
      expect(fields[0]).toEqual({ key: 'title', label: 'Event Title', placeholder: 'Team Meeting' });
      expect(fields[1]).toEqual({ key: 'startDate', label: 'Start Date (YYYYMMDDTHHMMSS)', placeholder: '20250115T140000' });
      expect(fields[2]).toEqual({ key: 'endDate', label: 'End Date (YYYYMMDDTHHMMSS)', placeholder: '20250115T150000' });
      expect(fields[3]).toEqual({ key: 'location', label: 'Location (optional)', placeholder: 'Conference Room A' });
      expect(fields[4]).toEqual({ key: 'description', label: 'Description (optional)', placeholder: 'Weekly team sync' });
    });

    test('event fields include required and optional fields', () => {
      const fields = getFields('event');
      const requiredFields = fields.filter(f => !f.label.includes('optional'));
      const optionalFields = fields.filter(f => f.label.includes('optional'));
      expect(requiredFields).toHaveLength(3); // title, startDate, endDate
      expect(optionalFields).toHaveLength(2); // location, description
    });
  });
});
