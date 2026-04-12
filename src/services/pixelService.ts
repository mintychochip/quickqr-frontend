import { supabase } from '../config/supabase';

export interface PixelSettings {
  id: string;
  qr_id: string;
  user_id: string;
  facebook_pixel_id: string | null;
  facebook_events: string[];
  facebook_enabled: boolean;
  google_conversion_id: string | null;
  google_conversion_label: string | null;
  google_enabled: boolean;
  linkedin_partner_id: string | null;
  linkedin_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePixelInput {
  qr_id: string;
  facebook_pixel_id?: string;
  facebook_events?: string[];
  facebook_enabled?: boolean;
  google_conversion_id?: string;
  google_conversion_label?: string;
  google_enabled?: boolean;
  linkedin_partner_id?: string;
  linkedin_enabled?: boolean;
}

export interface UpdatePixelInput {
  facebook_pixel_id?: string;
  facebook_events?: string[];
  facebook_enabled?: boolean;
  google_conversion_id?: string;
  google_conversion_label?: string;
  google_enabled?: boolean;
  linkedin_partner_id?: string;
  linkedin_enabled?: boolean;
}

export interface PixelEvent {
  type: 'facebook' | 'google' | 'linkedin';
  event_name: string;
  data?: Record<string, unknown>;
}

export const pixelService = {
  async getPixelSettings(qr_id: string): Promise<PixelSettings | null> {
    const { data, error } = await supabase
      .from('pixel_settings')
      .select('*')
      .eq('qr_id', qr_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async createPixelSettings(input: CreatePixelInput): Promise<PixelSettings> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('pixel_settings')
      .insert({
        user_id: session.user.id,
        qr_id: input.qr_id,
        facebook_pixel_id: input.facebook_pixel_id || null,
        facebook_events: input.facebook_events || ['PageView'],
        facebook_enabled: input.facebook_enabled || false,
        google_conversion_id: input.google_conversion_id || null,
        google_conversion_label: input.google_conversion_label || null,
        google_enabled: input.google_enabled || false,
        linkedin_partner_id: input.linkedin_partner_id || null,
        linkedin_enabled: input.linkedin_enabled || false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePixelSettings(qr_id: string, input: UpdatePixelInput): Promise<PixelSettings> {
    const { data, error } = await supabase
      .from('pixel_settings')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('qr_id', qr_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePixelSettings(qr_id: string): Promise<void> {
    const { error } = await supabase
      .from('pixel_settings')
      .delete()
      .eq('qr_id', qr_id);

    if (error) throw error;
  },

  async togglePixel(qr_id: string, pixelType: 'facebook' | 'google' | 'linkedin', enabled: boolean): Promise<PixelSettings> {
    const updateField = `${pixelType}_enabled`;
    const { data, error } = await supabase
      .from('pixel_settings')
      .update({
        [updateField]: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('qr_id', qr_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getActivePixelsForQR(qr_id: string): Promise<PixelSettings | null> {
    const { data, error } = await supabase
      .from('pixel_settings')
      .select('*')
      .eq('qr_id', qr_id)
      .or('facebook_enabled.eq.true,google_enabled.eq.true,linkedin_enabled.eq.true')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  validateFacebookPixelId(pixelId: string): boolean {
    // Facebook Pixel IDs are numeric strings
    return /^\d+$/.test(pixelId);
  },

  validateGoogleConversionId(conversionId: string): boolean {
    // Google conversion IDs typically start with AW- followed by digits
    return /^AW-\d+$/.test(conversionId);
  },

  validateLinkedInPartnerId(partnerId: string): boolean {
    // LinkedIn partner IDs are numeric strings
    return /^\d+$/.test(partnerId);
  },

  getDefaultFacebookEvents(): string[] {
    return ['PageView', 'Lead', 'ViewContent'];
  },
};

export default pixelService;
