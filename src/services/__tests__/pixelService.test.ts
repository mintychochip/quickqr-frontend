/**
 * Integration tests for marketing pixel functionality
 * Verifies pixel settings CRUD operations and validation
 */
import { supabase } from '../../config/supabase';
import { pixelService, type PixelSettings } from '../pixelService';

// Helper to check if supabase is available
async function isSupabaseAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    
    const { error } = await supabase
      .from('qr_codes')
      .select('count', { count: 'exact', head: true });
    
    clearTimeout(timeout);
    
    return !error?.message?.includes('fetch failed') && !error?.message?.includes('ECONNREFUSED');
  } catch {
    return false;
  }
}

// Helper to check if table exists
async function tableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('count', { count: 'exact', head: true });
    
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

describe('pixel service exports', () => {
  test('pixelService is defined', () => {
    expect(pixelService).toBeDefined();
    expect(typeof pixelService.getPixelSettings).toBe('function');
    expect(typeof pixelService.createPixelSettings).toBe('function');
    expect(typeof pixelService.updatePixelSettings).toBe('function');
    expect(typeof pixelService.deletePixelSettings).toBe('function');
    expect(typeof pixelService.togglePixel).toBe('function');
    expect(typeof pixelService.getActivePixelsForQR).toBe('function');
    expect(typeof pixelService.validateFacebookPixelId).toBe('function');
    expect(typeof pixelService.validateGoogleConversionId).toBe('function');
    expect(typeof pixelService.validateLinkedInPartnerId).toBe('function');
    expect(typeof pixelService.validateGTMContainerId).toBe('function');
  });
});

describe('pixel validation functions', () => {
  test('validateFacebookPixelId accepts numeric strings', () => {
    expect(pixelService.validateFacebookPixelId('123456789')).toBe(true);
    expect(pixelService.validateFacebookPixelId('9876543210')).toBe(true);
    expect(pixelService.validateFacebookPixelId('123456789012345')).toBe(true);
  });

  test('validateFacebookPixelId rejects non-numeric strings', () => {
    expect(pixelService.validateFacebookPixelId('abc123')).toBe(false);
    expect(pixelService.validateFacebookPixelId('123-456')).toBe(false);
    expect(pixelService.validateFacebookPixelId('')).toBe(false);
    expect(pixelService.validateFacebookPixelId('123.456')).toBe(false);
  });

  test('validateGoogleConversionId accepts AW- prefix format', () => {
    expect(pixelService.validateGoogleConversionId('AW-123456789')).toBe(true);
    expect(pixelService.validateGoogleConversionId('AW-9876543210')).toBe(true);
  });

  test('validateGoogleConversionId rejects invalid formats', () => {
    expect(pixelService.validateGoogleConversionId('123456789')).toBe(false);
    expect(pixelService.validateGoogleConversionId('aw-123456789')).toBe(false); // lowercase
    expect(pixelService.validateGoogleConversionId('AW-abc123')).toBe(false);
    expect(pixelService.validateGoogleConversionId('')).toBe(false);
  });

  test('validateLinkedInPartnerId accepts numeric strings', () => {
    expect(pixelService.validateLinkedInPartnerId('123456')).toBe(true);
    expect(pixelService.validateLinkedInPartnerId('9876543')).toBe(true);
  });

  test('validateLinkedInPartnerId rejects non-numeric strings', () => {
    expect(pixelService.validateLinkedInPartnerId('abc123')).toBe(false);
    expect(pixelService.validateLinkedInPartnerId('123-456')).toBe(false);
    expect(pixelService.validateLinkedInPartnerId('')).toBe(false);
  });

  test('validateGTMContainerId accepts valid GTM-XXXXXX format', () => {
    expect(pixelService.validateGTMContainerId('GTM-1234567')).toBe(true);
    expect(pixelService.validateGTMContainerId('GTM-ABCDEFG')).toBe(true);
    expect(pixelService.validateGTMContainerId('gtm-1234567')).toBe(true); // case insensitive
    expect(pixelService.validateGTMContainerId('GTM-ABC1234')).toBe(true);
    expect(pixelService.validateGTMContainerId('GTM-1234567890123')).toBe(true); // longer ID
  });

  test('validateGTMContainerId rejects invalid formats', () => {
    expect(pixelService.validateGTMContainerId('1234567')).toBe(false);
    expect(pixelService.validateGTMContainerId('GTM-123')).toBe(false); // too short
    expect(pixelService.validateGTMContainerId('GTM-')).toBe(false);
    expect(pixelService.validateGTMContainerId('')).toBe(false);
    expect(pixelService.validateGTMContainerId('GTM-12345!')).toBe(false); // invalid char
  });

  test('getDefaultFacebookEvents returns expected events', () => {
    const events = pixelService.getDefaultFacebookEvents();
    expect(events).toContain('PageView');
    expect(events).toContain('Lead');
    expect(events).toContain('ViewContent');
    expect(events.length).toBe(3);
  });
});

describe('pixel functionality', () => {
  let supabaseAvailable = false;
  let pixelTableExists = false;
  let testQRId: string | null = null;
  let testPixelSettings: PixelSettings | null = null;

  beforeAll(async () => {
    supabaseAvailable = await isSupabaseAvailable();
    if (supabaseAvailable) {
      pixelTableExists = await tableExists('pixel_settings');
    }
  });

  beforeEach(async () => {
    if (!supabaseAvailable || !pixelTableExists) {
      return;
    }
    
    // Get or create a test QR code for pixel settings
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Try to find an existing QR code
      const { data: qrCodes } = await supabase
        .from('qr_codes')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1);
      
      if (qrCodes && qrCodes.length > 0) {
        testQRId = qrCodes[0].id;
      }
      
      // Clean up any existing test pixel settings
      await supabase
        .from('pixel_settings')
        .delete()
        .eq('user_id', session.user.id);
    }
  });

  afterAll(async () => {
    if (!supabaseAvailable || !pixelTableExists) {
      return;
    }
    
    // Clean up test pixel settings
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase
        .from('pixel_settings')
        .delete()
        .eq('user_id', session.user.id);
    }
  });

  test('can create pixel settings', async () => {
    if (!supabaseAvailable) {
      console.warn('Supabase not available - skipping test');
      return;
    }
    if (!pixelTableExists) {
      console.warn('pixel_settings table does not exist - skipping test');
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No authenticated session - skipping test');
      return;
    }

    if (!testQRId) {
      console.warn('No test QR code available - skipping test');
      return;
    }

    const newPixel = await pixelService.createPixelSettings({
      qr_id: testQRId,
      facebook_pixel_id: '123456789',
      facebook_events: ['PageView', 'Lead'],
      facebook_enabled: true,
      google_conversion_id: 'AW-987654321',
      google_conversion_label: 'test_label',
      google_enabled: true,
      linkedin_partner_id: '456789',
      linkedin_enabled: false,
      gtm_container_id: 'GTM-TEST123',
      gtm_enabled: true,
    });

    expect(newPixel).toBeDefined();
    expect(newPixel.qr_id).toBe(testQRId);
    expect(newPixel.user_id).toBe(session.user.id);
    expect(newPixel.facebook_pixel_id).toBe('123456789');
    expect(newPixel.facebook_events).toContain('PageView');
    expect(newPixel.facebook_events).toContain('Lead');
    expect(newPixel.facebook_enabled).toBe(true);
    expect(newPixel.google_conversion_id).toBe('AW-987654321');
    expect(newPixel.google_conversion_label).toBe('test_label');
    expect(newPixel.google_enabled).toBe(true);
    expect(newPixel.linkedin_partner_id).toBe('456789');
    expect(newPixel.linkedin_enabled).toBe(false);
    expect(newPixel.gtm_container_id).toBe('GTM-TEST123');
    expect(newPixel.gtm_enabled).toBe(true);

    testPixelSettings = newPixel;
  });

  test('can retrieve pixel settings', async () => {
    if (!supabaseAvailable || !pixelTableExists || !testQRId) {
      console.warn('Cannot run retrieve test - skipping');
      return;
    }

    const pixel = await pixelService.getPixelSettings(testQRId);
    
    if (testPixelSettings) {
      expect(pixel).toBeDefined();
      expect(pixel?.id).toBe(testPixelSettings.id);
    }
  });

  test('can update pixel settings', async () => {
    if (!supabaseAvailable || !pixelTableExists || !testQRId) {
      console.warn('Cannot run update test - skipping');
      return;
    }

    const updated = await pixelService.updatePixelSettings(testQRId, {
      facebook_pixel_id: '987654321',
      facebook_enabled: false,
      google_enabled: true,
    });

    expect(updated.facebook_pixel_id).toBe('987654321');
    expect(updated.facebook_enabled).toBe(false);
    expect(updated.google_enabled).toBe(true);
    // Other fields should be preserved
    expect(updated.google_conversion_id).toBe('AW-987654321');
  });

  test('can toggle pixel enabled state', async () => {
    if (!supabaseAvailable || !pixelTableExists || !testQRId) {
      console.warn('Cannot run toggle test - skipping');
      return;
    }

    // Enable Facebook pixel
    const enabled = await pixelService.togglePixel(testQRId, 'facebook', true);
    expect(enabled.facebook_enabled).toBe(true);

    // Disable Facebook pixel
    const disabled = await pixelService.togglePixel(testQRId, 'facebook', false);
    expect(disabled.facebook_enabled).toBe(false);

    // Toggle Google
    const googleEnabled = await pixelService.togglePixel(testQRId, 'google', true);
    expect(googleEnabled.google_enabled).toBe(true);

    // Toggle LinkedIn
    const linkedinEnabled = await pixelService.togglePixel(testQRId, 'linkedin', true);
    expect(linkedinEnabled.linkedin_enabled).toBe(true);

    // Toggle GTM
    const gtmEnabled = await pixelService.togglePixel(testQRId, 'gtm', true);
    expect(gtmEnabled.gtm_enabled).toBe(true);
  });

  test('can get active pixels for QR code', async () => {
    if (!supabaseAvailable || !pixelTableExists || !testQRId) {
      console.warn('Cannot run get active pixels test - skipping');
      return;
    }

    // First enable all pixels
    await pixelService.updatePixelSettings(testQRId, {
      facebook_enabled: true,
      google_enabled: true,
      linkedin_enabled: true,
      gtm_enabled: true,
    });

    const activePixels = await pixelService.getActivePixelsForQR(testQRId);
    expect(activePixels).toBeDefined();
    expect(activePixels?.qr_id).toBe(testQRId);
    expect(activePixels?.facebook_enabled || activePixels?.google_enabled || activePixels?.linkedin_enabled || activePixels?.gtm_enabled).toBe(true);
  });

  test('returns null for QR without pixel settings', async () => {
    if (!supabaseAvailable || !pixelTableExists) {
      console.warn('Cannot run test - skipping');
      return;
    }

    const nonExistentQRId = '00000000-0000-0000-0000-000000000000';
    const pixel = await pixelService.getPixelSettings(nonExistentQRId);
    expect(pixel).toBeNull();
  });

  test('can create pixel settings with defaults', async () => {
    if (!supabaseAvailable || !pixelTableExists || !testQRId) {
      console.warn('Cannot run test - skipping');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No authenticated session - skipping test');
      return;
    }

    // Delete existing settings first
    await pixelService.deletePixelSettings(testQRId);

    // Create with minimal input
    const pixel = await pixelService.createPixelSettings({
      qr_id: testQRId,
    });

    expect(pixel).toBeDefined();
    expect(pixel.facebook_enabled).toBe(false);
    expect(pixel.google_enabled).toBe(false);
    expect(pixel.linkedin_enabled).toBe(false);
    expect(pixel.gtm_enabled).toBe(false);
    expect(pixel.facebook_events).toContain('PageView'); // Default event
    expect(pixel.facebook_pixel_id).toBeNull();
    expect(pixel.google_conversion_id).toBeNull();
    expect(pixel.linkedin_partner_id).toBeNull();
    expect(pixel.gtm_container_id).toBeNull();

    testPixelSettings = pixel;
  });

  test('can delete pixel settings', async () => {
    if (!supabaseAvailable || !pixelTableExists || !testQRId) {
      console.warn('Cannot run delete test - skipping');
      return;
    }

    // Ensure we have settings to delete
    let pixel = await pixelService.getPixelSettings(testQRId);
    if (!pixel) {
      pixel = await pixelService.createPixelSettings({ qr_id: testQRId });
    }

    await pixelService.deletePixelSettings(testQRId);

    const deleted = await pixelService.getPixelSettings(testQRId);
    expect(deleted).toBeNull();

    testPixelSettings = null;
  });
});

describe('pixel service connectivity', () => {
  test('supabase client is defined', async () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });
});
