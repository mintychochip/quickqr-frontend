/**
 * Admin Service
 * Handles admin operations for managing all QR codes
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://artemis.cs.csub.edu/~quickqr/';

export interface AdminQRCode {
  qrcodeid: string;
  content: string;
  createdat: string;
  expirytime: string | null;
  userid: number;
  styling: string | null;
  name: string;
  type: string;
  scan_count: number;
  user_email: string;
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

/**
 * Fetches all QR codes from all users (admin only)
 */
export async function fetchAllQRCodes(): Promise<AdminFetchCodesResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin_handler.php`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'list_all_qrcodes',
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized: Please log in' };
      }
      if (response.status === 403) {
        return { success: false, error: 'Forbidden: Admin access required' };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
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
    const response = await fetch(`${API_BASE_URL}/admin_handler.php`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'update_qrcode',
        qrcodeid,
        content,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized: Please log in' };
      }
      if (response.status === 403) {
        return { success: false, error: 'Forbidden: Admin access required' };
      }
      if (response.status === 404) {
        return { success: false, error: 'QR code not found' };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
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
    const response = await fetch(`${API_BASE_URL}/admin_handler.php`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete_qrcode',
        qrcodeid,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized: Please log in' };
      }
      if (response.status === 403) {
        return { success: false, error: 'Forbidden: Admin access required' };
      }
      if (response.status === 404) {
        return { success: false, error: 'QR code not found' };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete QR code',
    };
  }
}
