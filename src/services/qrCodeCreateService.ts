// QR Code Creation Service
import { getCurrentUser } from './authService';

export interface QRCodeData {
  mode: 'static' | 'dynamic';
  type: string;
  content: any;
  styling?: any;
}

export interface CreateQRCodeResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    qrcodeid: string;
    name: string;
    content: string;
    type: string;
    styling?: any;
    createdat: string;
    expirytime?: string;
  };
}

export async function createQRCode(
  name: string,
  contentObject: any,
  type: string,
  styling?: any
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

    console.log('Sending QR Code creation request:', {
      action: 'create',
      name: name,
      content: contentObject,
      type: type,
      styling: styling,
      authenticatedUser: authCheck.user
    });

    // Prepare the request body - backend gets user ID from session
    const requestBody = {
      action: 'create',
      name: name,
      content: typeof contentObject === 'string' ? contentObject : JSON.stringify(contentObject),
      type: type,
      styling: styling ? JSON.stringify(styling) : null
    };

    // Debug: Show what's being sent in the request body
    console.log('DEBUG - Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch('https://artemis.cs.csub.edu/~jlo/qrcode_handler.php?action=create', {
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
    console.log('API Response:', data);

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
    console.error('Error creating QR code:', error);

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