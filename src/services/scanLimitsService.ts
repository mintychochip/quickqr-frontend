import { supabase } from '../config/supabase';

export interface ScanLimit {
  id: string;
  qr_id: string;
  user_id: string;
  enabled: boolean;
  max_scans: number;
  current_scans: number;
  message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateScanLimitInput {
  qr_id: string;
  enabled?: boolean;
  max_scans?: number;
  current_scans?: number;
  message?: string;
}

export interface UpdateScanLimitInput {
  enabled?: boolean;
  max_scans?: number;
  current_scans?: number;
  message?: string;
}

export const scanLimitsService = {
  async getScanLimit(qr_id: string): Promise<ScanLimit | null> {
    const { data, error } = await supabase
      .from('qr_scan_limits')
      .select('*')
      .eq('qr_id', qr_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  async upsertScanLimit(input: CreateScanLimitInput): Promise<ScanLimit> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('qr_scan_limits')
      .upsert({
        user_id: session.user.id,
        qr_id: input.qr_id,
        enabled: input.enabled ?? true,
        max_scans: input.max_scans ?? 100,
        current_scans: input.current_scans ?? 0,
        message: input.message || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'qr_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateScanLimit(qr_id: string, input: UpdateScanLimitInput): Promise<ScanLimit> {
    const { data, error } = await supabase
      .from('qr_scan_limits')
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

  async deleteScanLimit(qr_id: string): Promise<void> {
    const { error } = await supabase
      .from('qr_scan_limits')
      .delete()
      .eq('qr_id', qr_id);

    if (error) throw error;
  },

  async incrementScanCount(qr_id: string): Promise<ScanLimit> {
    const current = await this.getScanLimit(qr_id);
    if (!current) throw new Error('Scan limit not found');

    const { data, error } = await supabase
      .from('qr_scan_limits')
      .update({
        current_scans: current.current_scans + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('qr_id', qr_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async checkLimitReached(qr_id: string): Promise<{ reached: boolean; message: string | null; current: number; max: number }> {
    const limit = await this.getScanLimit(qr_id);
    if (!limit) {
      return { reached: false, message: null, current: 0, max: 0 };
    }

    const reached = limit.enabled && limit.current_scans >= limit.max_scans;
    return {
      reached,
      message: reached ? limit.message : null,
      current: limit.current_scans,
      max: limit.max_scans,
    };
  },

  async toggleScanLimit(qr_id: string, enabled: boolean): Promise<ScanLimit> {
    const { data, error } = await supabase
      .from('qr_scan_limits')
      .update({
        enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('qr_id', qr_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export default scanLimitsService;
