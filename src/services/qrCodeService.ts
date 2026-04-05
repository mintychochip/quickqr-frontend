/**
 * QR Code Service
 * Handles fetching and managing QR codes via Supabase
 */
import { supabase } from '../config/supabase';

export interface QRCode {
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
  updated_at: string;
  expired?: number;
  // Backward compatibility aliases for PHP backend field names
  qrcodeid?: string;
  createdat?: string;
}

export interface FetchCodesResponse {
  success: boolean;
  codes?: QRCode[];
  error?: string;
}

/**
 * Fetches all QR codes for the current user
 */
export async function fetchUserQRCodes(): Promise<FetchCodesResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('qrcodes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return { success: false, error: error.message };
    }

    // Map to include backward compatibility aliases
    const codesWithAliases = (data || []).map(qr => ({
      ...qr,
      qrcodeid: qr.id,
      createdat: qr.created_at,
    }));

    return { success: true, codes: codesWithAliases };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch QR codes',
    };
  }
}

/**
 * Deletes a QR code
 */
export async function deleteQRCode(qrcodeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('qrcodes')
      .delete()
      .eq('id', qrcodeId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete QR code',
    };
  }
}

/**
 * Gets a display URL for a QR code
 */
export function getQRCodeDisplayUrl(qrCode: QRCode): string {
  try {
    if (!qrCode.content) return 'No content';

    const content = qrCode.content as Record<string, unknown>;

    switch (qrCode.type) {
      case 'url':
        return (content.url as string) || 'N/A';
      case 'text':
        return ((content.text as string)?.substring(0, 50) || 'Text content') + '...';
      case 'email':
        return (content.email as string) || 'Email';
      case 'phone':
        return (content.phone as string) || 'Phone';
      case 'sms':
        return (content.number as string) || 'SMS';
      case 'location':
        return `${content.latitude},${content.longitude}` || 'Location';
      case 'vcard':
      case 'mecard':
        return (content.name as string) || 'Contact Card';
      case 'wifi':
        return (content.ssid as string) || 'WiFi';
      case 'event':
        return (content.title as string) || 'Event';
      default:
        return qrCode.type;
    }
  } catch {
    return 'N/A';
  }
}

/**
 * Gets the QR code name for display
 */
export function getQRCodeName(qrCode: QRCode): string {
  if (qrCode.name) return qrCode.name;
  if (qrCode.type) {
    const typeFormatted = qrCode.type === 'url' ? 'URL' : qrCode.type === 'sms' ? 'SMS' : qrCode.type.charAt(0).toUpperCase() + qrCode.type.slice(1);
    return typeFormatted + ' QR Code';
  }
  return `QR ${qrCode.id?.substring(0, 8) || 'Unknown'}`;
}
