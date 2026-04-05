// QR Code Creation Service
import { supabase } from '../config/supabase';
import { getCurrentUser } from './authService';
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
