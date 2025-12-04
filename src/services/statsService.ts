/**
 * Stats Service
 * Handles fetching user scan statistics
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://artemis.cs.csub.edu/~quickqr/';

export interface UserStats {
  userid: number;
  days_analyzed: number;
  total_qrcodes: number;
  total_scans: number;
  avg_scans_per_qrcode: number;
  last_scan_time: string | null;
  first_scan_time: string | null;
}

export interface StatsResponse {
  success: boolean;
  stats?: UserStats;
  error?: string;
}

export interface OperatingSystemStat {
  operating_system: string;
  scan_count: number;
  percentage: number;
}

export interface QRCodeStat {
  qrcodeid: string;
  name: string;
  type: string;
  content?: string;
  scan_count: number;
  percentage: number;
}

export interface TimelineStat {
  scan_date: string;
  scan_count: number;
}

export interface ListStatsResponse {
  success: boolean;
  data?: any[];
  error?: string;
}

/**
 * Fetches user scan statistics for a given time period
 * @param days - Number of days to analyze (default: 30)
 */
export async function fetchUserStats(days: number = 30): Promise<StatsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/stats.php`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get_user_stats',
        days: days,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.stats) {
      return {
        success: true,
        stats: result.stats,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to fetch statistics',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    };
  }
}

/**
 * Fetches operating systems breakdown
 * @param days - Number of days to analyze (default: 30)
 */
export async function fetchOperatingSystems(days: number = 30): Promise<ListStatsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/stats.php`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get_operating_systems',
        days: days,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        data: result.data || [],
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to fetch operating systems statistics',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch operating systems statistics',
    };
  }
}

/**
 * Fetches scans by QR code
 * @param days - Number of days to analyze (default: 30)
 */
export async function fetchScansByQRCode(days: number = 30): Promise<ListStatsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/stats.php`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get_scans_by_qrcode',
        days: days,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        data: result.data || [],
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to fetch scans by QR code',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch scans by QR code',
    };
  }
}

/**
 * Fetches scans timeline
 * @param days - Number of days to analyze (default: 30)
 */
export async function fetchScansTimeline(days: number = 30): Promise<ListStatsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/stats.php`, {
      method: 'POST',
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get_scans_timeline',
        days: days,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        data: result.data || [],
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to fetch scans timeline',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch scans timeline',
    };
  }
}
