/**
 * Admin Service
 * Handles admin operations via Supabase
 */
import { supabase } from '../config/supabase';
import type { AbuseIncident } from '../types/abuse.types';

export interface AdminQRCode {
  id: string;
  user_id: string;
  name: string;
  content: Record<string, unknown>;
  type: string;
  styling: Record<string, unknown> | null;
  mode: string;
  expirytime: string | null;
  scan_count: number;
  created_at: string;
  user_email?: string;
  // Backward compatibility aliases
  qrcodeid?: string;
  createdat?: string;
}

export interface AdminFetchCodesResponse {
  success: boolean;
  codes?: AdminQRCode[];
  error?: string;
}

export interface AdminUpdateResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface AdminDeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

async function isAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('admin')
    .eq('id', user.id)
    .single();

  return profile?.admin === true;
}

/**
 * Fetches all QR codes from all users (admin only)
 */
export async function fetchAllQRCodes(): Promise<AdminFetchCodesResponse> {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Forbidden: Admin access required' };
    }

    const { data, error } = await supabase
      .from('qrcodes')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const codes: AdminQRCode[] = data?.map(row => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      content: row.content,
      type: row.type,
      styling: row.styling,
      mode: row.mode,
      expirytime: row.expirytime,
      scan_count: row.scan_count,
      created_at: row.created_at,
      user_email: row.profiles?.email,
      qrcodeid: row.id,
      createdat: row.created_at,
    })) || [];

    return { success: true, codes };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch QR codes',
    };
  }
}

/**
 * Updates a QR code's content (admin only)
 */
export async function updateQRCode(qrcodeid: string, content: string): Promise<AdminUpdateResponse> {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Forbidden: Admin access required' };
    }

    const { error } = await supabase
      .from('qrcodes')
      .update({
        content: typeof content === 'string' ? JSON.parse(content) : content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', qrcodeid);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: 'QR code updated successfully' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update QR code',
    };
  }
}

/**
 * Deletes any QR code (admin only)
 */
export async function deleteQRCode(qrcodeid: string): Promise<AdminDeleteResponse> {
  try {
    if (!await isAdmin()) {
      return { success: false, error: 'Forbidden: Admin access required' };
    }

    const { error } = await supabase
      .from('qrcodes')
      .delete()
      .eq('id', qrcodeid);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, message: 'QR code deleted successfully' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete QR code',
    };
  }
}

export async function fetchAbuseIncidents(): Promise<{ success: boolean; incidents?: AbuseIncident[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('abuse_incidents')
      .select('*')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return { success: false, error: error.message };
    return { success: true, incidents: data || [] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch' };
  }
}

export async function resolveAbuseIncident(id: string): Promise<{ success: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  await supabase
    .from('abuse_incidents')
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('id', id);

  return { success: true };
}
