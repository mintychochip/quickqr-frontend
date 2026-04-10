/**
 * Unit tests for UTM URL building logic
 */

interface UTMParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

function buildUTMURL(baseUrl: string, params: UTMParams): string {
  if (!baseUrl) return '';
  
  try {
    const url = new URL(baseUrl);
    const utmKeys: (keyof UTMParams)[] = ['source', 'medium', 'campaign', 'term', 'content'];
    
    utmKeys.forEach(key => {
      const value = params[key];
      if (value && value.trim()) {
        url.searchParams.set(`utm_${key}`, value.trim());
      }
    });
    
    return url.toString();
  } catch {
    return baseUrl;
  }
}

describe('UTM URL Builder', () => {
  test('returns empty string for empty base URL', () => {
    expect(buildUTMURL('', { source: 'google' })).toBe('');
  });

  test('builds URL with source and medium', () => {
    const url = buildUTMURL('https://example.com', { source: 'google', medium: 'cpc' });
    expect(url).toBe('https://example.com/?utm_source=google&utm_medium=cpc');
  });

  test('builds URL with all UTM params', () => {
    const url = buildUTMURL('https://example.com/page', {
      source: 'newsletter',
      medium: 'email',
      campaign: 'summer_sale',
      term: 'discount',
      content: 'header_link'
    });
    expect(url).toContain('utm_source=newsletter');
    expect(url).toContain('utm_medium=email');
    expect(url).toContain('utm_campaign=summer_sale');
    expect(url).toContain('utm_term=discount');
    expect(url).toContain('utm_content=header_link');
  });

  test('skips empty params', () => {
    const url = buildUTMURL('https://example.com', {
      source: 'facebook',
      medium: '',
      campaign: undefined as any
    });
    expect(url).toBe('https://example.com/?utm_source=facebook');
  });

  test('handles existing query params', () => {
    const url = buildUTMURL('https://example.com?existing=param', { source: 'twitter' });
    expect(url).toContain('existing=param');
    expect(url).toContain('utm_source=twitter');
  });

  test('handles invalid URL gracefully', () => {
    expect(buildUTMURL('not-a-url', { source: 'test' })).toBe('not-a-url');
  });
});
