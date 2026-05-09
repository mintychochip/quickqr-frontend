import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('BulkUpload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseCSV', () => {
    const parseCSV = (csvContent: string): Record<string, string>[] => {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) return [];

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
      const rows: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        rows.push(row);
      }

      return rows;
    };

    test('parses simple CSV with url and title', () => {
      const csv = 'url,title\nhttps://example.com,Test QR';
      const result = parseCSV(csv);

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('https://example.com');
      expect(result[0].title).toBe('Test QR');
    });

    test('parses CSV with multiple rows', () => {
      const csv = 'url,title\nhttps://example.com,Test 1\nhttps://test.com,Test 2';
      const result = parseCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Test 1');
      expect(result[1].title).toBe('Test 2');
    });

    test('handles quoted values', () => {
      const csv = 'url,title\n"https://example.com","Test QR"';
      const result = parseCSV(csv);

      expect(result[0].url).toBe('https://example.com');
      expect(result[0].title).toBe('Test QR');
    });

    test('returns empty array for single line CSV', () => {
      const csv = 'url,title';
      const result = parseCSV(csv);

      expect(result).toHaveLength(0);
    });
  });

  describe('validateCSV', () => {
    const validateCSV = (rows: Record<string, string>[]): string[] => {
      const errors: string[] = [];

      if (rows.length === 0) {
        errors.push('CSV file is empty or has no data rows');
        return errors;
      }

      const firstRow = rows[0];
      const hasUrl = Object.keys(firstRow).some(k => k.toLowerCase() === 'url');
      const hasTitle = Object.keys(firstRow).some(k => k.toLowerCase() === 'title');

      if (!hasUrl) {
        errors.push('Missing required column: url');
      }
      if (!hasTitle) {
        errors.push('Missing required column: title');
      }

      rows.forEach((row, index) => {
        const rowNum = index + 2;

        if (!row.url || row.url.trim() === '') {
          errors.push(`Row ${rowNum}: Missing URL`);
        } else {
          const urlPattern = /^https?:\/\//;
          if (!urlPattern.test(row.url)) {
            errors.push(`Row ${rowNum}: Invalid URL format '${row.url}'`);
          }
        }

        if (!row.title || row.title.trim() === '') {
          errors.push(`Row ${rowNum}: Missing title`);
        }
      });

      return errors;
    };

    test('validates missing url column', () => {
      const rows = [{ title: 'Test', name: 'Example' }];
      const errors = validateCSV(rows);

      expect(errors).toContain('Missing required column: url');
    });

    test('validates missing title column', () => {
      const rows = [{ url: 'https://example.com' }];
      const errors = validateCSV(rows);

      expect(errors).toContain('Missing required column: title');
    });

    test('validates empty rows array', () => {
      const errors = validateCSV([]);

      expect(errors).toContain('CSV file is empty or has no data rows');
    });

    test('validates invalid URL format', () => {
      const rows = [{ url: 'not-a-url', title: 'Test' }];
      const errors = validateCSV(rows);

      expect(errors.some(e => e.includes('Invalid URL format'))).toBe(true);
    });

    test('validates missing URL in row', () => {
      const rows = [{ url: '', title: 'Test' }];
      const errors = validateCSV(rows);

      expect(errors.some(e => e.includes('Missing URL'))).toBe(true);
    });

    test('validates missing title in row', () => {
      const rows = [{ url: 'https://example.com', title: '' }];
      const errors = validateCSV(rows);

      expect(errors.some(e => e.includes('Missing title'))).toBe(true);
    });

    test('returns no errors for valid CSV', () => {
      const rows = [
        { url: 'https://example.com', title: 'Test 1' },
        { url: 'https://test.com', title: 'Test 2' }
      ];
      const errors = validateCSV(rows);

      expect(errors).toHaveLength(0);
    });
  });

  describe('generateShortCode', () => {
    const generateShortCode = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    test('generates 8 character code', () => {
      const code = generateShortCode();
      expect(code).toHaveLength(8);
    });

    test('generates alphanumeric code', () => {
      const code = generateShortCode();
      expect(/^[A-Za-z0-9]+$/.test(code)).toBe(true);
    });
  });
});
