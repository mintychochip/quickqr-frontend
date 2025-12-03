// QR Code Creation Service
import { getCurrentUser } from './authService';
import { getApiUrl } from '../config/api';
import { QRContentObject, QRCodeStylingProps, CreateQRCodeResponse as QRCreateResponse } from '../types/qrcode.types';

export interface QRCodeData {
  mode: 'static' | 'dynamic';
  type: string;
  content: QRContentObject;
  styling?: QRCodeStylingProps;
}

export type CreateQRCodeResponse = QRCreateResponse;

export async function createQRCode(
  name: string,
  contentObject: QRContentObject | string,
  type: string,
  styling?: QRCodeStylingProps
): Promise<CreateQRCodeResponse> {
  try {
    // First check if user is authenticated
    const authCheck = await getCurrentUser();
    if (!authCheck.success) {
      return {
        success: false,
        error: authCheck.error || 'You must be logged in to create QR codes'
      };
    }

    // Prepare the request body - backend gets user ID from session
    const requestBody = {
      action: 'create',
      name: name,
      content: typeof contentObject === 'string' ? contentObject : JSON.stringify(contentObject),
      type: type,
      styling: styling ? JSON.stringify(styling) : null
    };

    const response = await fetch(getApiUrl('create'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: requestBody.name,
        content: requestBody.content,
        type: requestBody.type,
        styling: requestBody.styling
      }),
      credentials: 'include', // Include cookies/session for authentication
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Handle response format differences
    if (data.success && data.data) {
      // Parse content if it's JSON
      if (data.data.content && typeof data.data.content === 'string') {
        try {
          const parsedContent = JSON.parse(data.data.content);
          data.data.content = parsedContent;
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }

      // Parse styling if it's JSON
      if (data.data.styling && typeof data.data.styling === 'string') {
        try {
          const parsedStyling = JSON.parse(data.data.styling);
          data.data.styling = parsedStyling;
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
    }

    return data;
  } catch (error) {
    // Handle specific authentication errors
    if (error instanceof Error && error.message.includes('401')) {
      return {
        success: false,
        error: 'Session expired - please log in again'
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create QR code'
    };
  }
}