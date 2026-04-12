/**
 * Integration tests for utmTemplateService
 * Verifies service functions are properly exported and callable
 */
import {
  fetchUserUTMTemplates,
  createUTMTemplate,
  updateUTMTemplate,
  deleteUTMTemplate,
  applyTemplate,
  validateUTMParams,
  type UTMTemplate,
  type UTMParams,
} from '../utmTemplateService';

describe('utmTemplateService exports', () => {
  test('fetchUserUTMTemplates is exported as a function', () => {
    expect(typeof fetchUserUTMTemplates).toBe('function');
  });

  test('createUTMTemplate is exported as a function', () => {
    expect(typeof createUTMTemplate).toBe('function');
  });

  test('updateUTMTemplate is exported as a function', () => {
    expect(typeof updateUTMTemplate).toBe('function');
  });

  test('deleteUTMTemplate is exported as a function', () => {
    expect(typeof deleteUTMTemplate).toBe('function');
  });

  test('applyTemplate is exported as a function', () => {
    expect(typeof applyTemplate).toBe('function');
  });

  test('validateUTMParams is exported as a function', () => {
    expect(typeof validateUTMParams).toBe('function');
  });
});

describe('utmTemplateService response shapes', () => {
  test('fetchUserUTMTemplates returns proper error when unauthenticated', async () => {
    const result = await fetchUserUTMTemplates();
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
    expect(result.success).toBe(false);
  });

  test('createUTMTemplate returns proper error when unauthenticated', async () => {
    const result = await createUTMTemplate({
      name: 'Test Template',
      source: 'google',
      medium: 'cpc',
    });
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
    expect(result.success).toBe(false);
  });

  test('updateUTMTemplate returns proper error when unauthenticated', async () => {
    const result = await updateUTMTemplate('test-id', { name: 'Updated' });
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
    expect(result.success).toBe(false);
  });

  test('deleteUTMTemplate returns proper error when unauthenticated', async () => {
    const result = await deleteUTMTemplate('test-id');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('error');
    expect(result.success).toBe(false);
  });
});

describe('validateUTMParams', () => {
  test('returns valid: true for complete params', () => {
    const params: UTMParams = {
      source: 'google',
      medium: 'cpc',
      campaign: 'summer_sale',
    };
    const result = validateUTMParams(params);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('returns valid: false when source is missing', () => {
    const params: UTMParams = {
      source: '',
      medium: 'cpc',
    };
    const result = validateUTMParams(params);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Source is required');
  });

  test('returns valid: false when source is only whitespace', () => {
    const params: UTMParams = {
      source: '   ',
      medium: 'cpc',
    };
    const result = validateUTMParams(params);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Source is required');
  });

  test('returns valid: false when medium is missing', () => {
    const params: UTMParams = {
      source: 'google',
      medium: '',
    };
    const result = validateUTMParams(params);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Medium is required');
  });

  test('returns valid: true with only required fields', () => {
    const params: UTMParams = {
      source: 'facebook',
      medium: 'social',
    };
    const result = validateUTMParams(params);
    expect(result.valid).toBe(true);
  });
});

describe('applyTemplate', () => {
  test('converts template to UTM params correctly', () => {
    const template: UTMTemplate = {
      id: '123',
      user_id: 'user-456',
      name: 'Google Ads Campaign',
      source: 'google',
      medium: 'cpc',
      campaign: 'spring_sale',
      term: 'qr_codes',
      content: 'banner_1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = applyTemplate(template);

    expect(result.source).toBe('google');
    expect(result.medium).toBe('cpc');
    expect(result.campaign).toBe('spring_sale');
    expect(result.term).toBe('qr_codes');
    expect(result.content).toBe('banner_1');
  });

  test('handles template with only required fields', () => {
    const template: UTMTemplate = {
      id: '123',
      user_id: 'user-456',
      name: 'Basic Template',
      source: 'newsletter',
      medium: 'email',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const result = applyTemplate(template);

    expect(result.source).toBe('newsletter');
    expect(result.medium).toBe('email');
    expect(result.campaign).toBeUndefined();
    expect(result.term).toBeUndefined();
    expect(result.content).toBeUndefined();
  });
});

describe('createUTMTemplate validation', () => {
  test('returns error when name is missing', async () => {
    const result = await createUTMTemplate({
      name: '',
      source: 'google',
      medium: 'cpc',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Template name is required');
  });

  test('returns error when source is missing', async () => {
    const result = await createUTMTemplate({
      name: 'Test',
      source: '',
      medium: 'cpc',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Source is required');
  });

  test('returns error when medium is missing', async () => {
    const result = await createUTMTemplate({
      name: 'Test',
      source: 'google',
      medium: '',
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Medium is required');
  });
});
