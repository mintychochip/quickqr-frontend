// QR Code Creation Service
import { supabase } from '../config/supabase';
import { getCurrentUser } from './authService';
import { runAbuseDetection, getUserAbuseStatus } from './abuseDetectionService';
import type { QRCodeStylingProps, CreateQRCodeResponse as QRCreateResponse } from '../types/qrcode.types';

export interface QRCodeData {
  mode: 'static' | 'dynamic';
  type: string;
  content: Record<string, unknown>;
  styling?: QRCodeStylingProps;
  expirytime?: string | null;
}

export type CreateQRCodeResponse = QRCreateResponse;

export async function createQRCode(
  name: string,
  contentObject: Record<string, unknown> | string,
  type: string,
  styling?: QRCodeStylingProps,
  expirytime?: string | null
): Promise<CreateQRCodeResponse> {
  try {
    const authCheck = await getCurrentUser();
    if (!authCheck.success || !authCheck.user) {
      return {
        success: false,
        error: authCheck.error || 'You must be logged in to create QR codes',
      };
    }

    const userId = authCheck.user.id;

    // Check user abuse status before creating
    const abuseStatus = await getUserAbuseStatus(userId);
    if (abuseStatus.isBlocked) {
      return { success: false, error: 'Account temporarily suspended. Contact support.' };
    }
    if (abuseStatus.tier === 'restricted') {
      return { success: false, error: 'Account has restrictions. Please reduce QR creation rate.' };
    }

    const content = typeof contentObject === 'string' ? contentObject : JSON.stringify(contentObject);

    const { data, error } = await supabase
      .from('qrcodes')
      .insert({
        user_id: authCheck.user.id,
        name,
        type,
        content: typeof contentObject === 'string' ? contentObject : contentObject,
        styling: styling || null,
        mode: 'static',
        expirytime: expirytime || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // After QR creation, run abuse detection
    // Query recent QR count from the last hour
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: recentQrCount } = await supabase
      .from('qrcodes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo);

    const abuseResult = await runAbuseDetection(userId, 'create', {
      content,
      recentQrCount: recentQrCount || 0,
      timeWindowHours: 1,
    });

    return {
      success: true,
      data: {
        qrcodeid: data.id,
        name: data.name,
        content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content,
        type: data.type,
        styling: data.styling,
        createdat: data.created_at,
        expirytime: data.expirytime,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create QR code',
    };
  }
}
