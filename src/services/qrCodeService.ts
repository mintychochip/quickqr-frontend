/**
 * QR Code Service
 * Handles fetching and managing QR codes for authenticated users
 */

const API_BASE_URL = 'https://artemis.cs.csub.edu/~jlo';

export interface QRCode {
  qrcodeid: string;
  content: string;
  createdat: string;
  expirytime: string | null;
  userid: number;
  styling: string | null;
  name: string;
  type: string;
  scan_count: number;
}

export interface FetchCodesResponse {
  success: boolean;
  codes?: QRCode[];
  error?: string;
}

/**
 * Fetches all QR codes for a specific user
 * @param userid - The user ID to fetch codes for
 */
export async function fetchUserQRCodes(userid: number): Promise<FetchCodesResponse> {
  try {
    console.log('Fetching QR codes for user:', userid);

    const response = await fetch(`${API_BASE_URL}/qrcode_handler.php?action=list&limit=100`, {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Fetch codes response:', result);
    console.log('Response type:', typeof result);
    console.log('Is array?', Array.isArray(result));

    // Handle different response formats
    let codes: QRCode[] = [];

    if (Array.isArray(result)) {
      codes = result;
    } else if (result.data && result.data.qrcodes && Array.isArray(result.data.qrcodes)) {
      codes = result.data.qrcodes;
    } else if (result.codes && Array.isArray(result.codes)) {
      codes = result.codes;
    } else if (result.success && result.codes) {
      codes = result.codes;
    }

    console.log('Parsed codes:', codes);

    // Debug: Check if styling field is present
    codes.forEach((code, index) => {
      console.log(`QR Code ${index} styling:`, code.styling, typeof code.styling);
    });

    return {
      success: true,
      codes: codes,
    };
  } catch (error) {
    console.error('Error fetching QR codes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch QR codes',
    };
  }
}

/**
 * Gets a display URL for a QR code (for the "URL" column in dashboard)
 * @param qrCode - The QR code object
 */
export function getQRCodeDisplayUrl(qrCode: QRCode): string {
  try {
    // Check if content exists
    if (!qrCode.content) {
      return 'No content';
    }

    // Parse the content field as JSON
    const contentDecoded = typeof qrCode.content === 'string'
      ? JSON.parse(qrCode.content)
      : qrCode.content;

    // Return appropriate display based on type
    switch (qrCode.type) {
      case 'url':
        return contentDecoded.url || 'N/A';
      case 'text':
        return (contentDecoded.text?.substring(0, 50) || 'Text content') + (contentDecoded.text?.length > 50 ? '...' : '');
      case 'email':
        return contentDecoded.email || 'Email';
      case 'phone':
        return contentDecoded.phone || 'Phone';
      case 'sms':
        return contentDecoded.number || 'SMS';
      case 'location':
        return `${contentDecoded.latitude},${contentDecoded.longitude}` || 'Location';
      case 'vcard':
      case 'mecard':
        return contentDecoded.name || 'Contact Card';
      case 'wifi':
        return contentDecoded.ssid || 'WiFi';
      case 'event':
        return contentDecoded.title || 'Event';
      default:
        return qrCode.type;
    }
  } catch (e) {
    console.error('Error parsing QR code content:', e, qrCode);
    return qrCode.content?.substring(0, 50) || 'N/A';
  }
}

/**
 * Deletes a QR code
 * @param qrcodeId - The ID of the QR code to delete
 */
export async function deleteQRCode(qrcodeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Deleting QR code:', qrcodeId);

    const response = await fetch(`https://artemis.cs.csub.edu/~jlo/qrcode_handler.php?action=delete`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        qrcodeid: qrcodeId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Delete response:', result);

    if (result.success) {
      return {
        success: true,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to delete QR code',
      };
    }
  } catch (error) {
    console.error('Error deleting QR code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete QR code',
    };
  }
}

/**
 * Gets the QR code name/title for display
 * For now, we'll use the type or generate one from the qrcodeid
 * @param qrCode - The QR code object
 */
export function getQRCodeName(qrCode: QRCode): string {
  // Use the name field from database if available
  if (qrCode.name) {
    return qrCode.name;
  }

  // Fallback: Generate name from type
  if (qrCode.type) {
    return qrCode.type.charAt(0).toUpperCase() + qrCode.type.slice(1) + ' QR Code';
  }

  // Last fallback: use first 8 chars of qrcodeid
  return `QR ${qrCode.qrcodeid?.substring(0, 8) || 'Unknown'}`;
}
