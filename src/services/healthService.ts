/**
 * Health Monitoring Service
 * Handles fetching and managing QR code health status via API
 */
import { supabase } from '../config/supabase';

export interface HealthStatus {
  id?: string;
  qr_code_id?: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  checked_at: string;
  http_status?: number;
  response_time_ms: number;
  ssl_valid?: boolean;
  ssl_expires_at?: string;
  redirect_count?: number;
  final_url?: string;
  error_message?: string;
  error_type?: 'timeout' | 'dns_error' | 'ssl_error' | 'http_error' | 'redirect_loop' | 'unknown';
  created_at?: string;
}

export interface HealthConfig {
  qr_code_id?: string;
  enabled: boolean;
  check_frequency: 'hourly' | 'daily' | 'weekly';
  alert_threshold: 'all' | 'warning' | 'critical';
  notify_email?: string;
  notify_webhook?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QRHealthData {
  qr_code_id: string;
  destination_url: string;
  current_status: HealthStatus | null;
  history: HealthStatus[];
  config: HealthConfig;
}

export interface HealthDashboardData {
  totalQRs: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  unknownCount: number;
  overallHealthPercentage: number;
  recentAlerts: Array<{
    id: string;
    qr_code_id: string;
    qr_name?: string;
    status: string;
    message: string;
    created_at: string;
  }>;
}

export interface HealthHistoryData {
  qr_code_id: string;
  days: number;
  data: Array<{
    date: string;
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    responseTimeMs: number;
    uptimePercentage: number;
    checksCount: number;
    errorsCount: number;
  }>;
  summary: {
    overallUptimePercentage: number;
    averageResponseTimeMs: number;
    totalChecks: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetches health status for a specific QR code
 */
export async function fetchQRHealthStatus(qrId: string): Promise<ApiResponse<QRHealthData>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${import.meta.env.PUBLIC_API_URL || ''}/api/v1/qr/health-check/${qrId}`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized' };
      }
      if (response.status === 403) {
        return { success: false, error: 'Access denied' };
      }
      if (response.status === 404) {
        return { success: false, error: 'QR code not found' };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `HTTP ${response.status}` };
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch health status'
    };
  }
}

/**
 * Triggers an immediate health check for a QR code
 */
export async function triggerHealthCheck(qrId: string): Promise<ApiResponse<{ health_check: HealthStatus; result: HealthStatus }>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${import.meta.env.PUBLIC_API_URL || ''}/api/v1/qr/health-check/${qrId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized' };
      }
      if (response.status === 403) {
        return { success: false, error: 'Access denied' };
      }
      if (response.status === 404) {
        return { success: false, error: 'QR code not found' };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `HTTP ${response.status}` };
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger health check'
    };
  }
}

/**
 * Fetches aggregate health dashboard data for the user
 */
export async function fetchUserHealthDashboard(): Promise<ApiResponse<HealthDashboardData>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${import.meta.env.PUBLIC_API_URL || ''}/api/v1/qr/health-dashboard`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized' };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `HTTP ${response.status}` };
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch health dashboard'
    };
  }
}

/**
 * Fetches health history for a QR code (time-series data for charts)
 */
export async function fetchHealthHistory(
  qrId: string,
  days: number = 30
): Promise<ApiResponse<HealthHistoryData>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${import.meta.env.PUBLIC_API_URL || ''}/api/v1/qr/health-history/${qrId}?days=${days}`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized' };
      }
      if (response.status === 403) {
        return { success: false, error: 'Access denied' };
      }
      if (response.status === 404) {
        return { success: false, error: 'QR code not found' };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `HTTP ${response.status}` };
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch health history'
    };
  }
}

/**
 * Updates health monitoring configuration for a QR code
 */
export async function updateHealthConfig(
  qrId: string,
  config: Partial<HealthConfig>
): Promise<ApiResponse<HealthConfig>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch(
      `${import.meta.env.PUBLIC_API_URL || ''}/api/v1/qr/health-config/${qrId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, error: 'Unauthorized' };
      }
      if (response.status === 403) {
        return { success: false, error: 'Access denied' };
      }
      if (response.status === 404) {
        return { success: false, error: 'QR code not found' };
      }
      const errorData = await response.json().catch(() => ({}));
      return { success: false, error: errorData.error || `HTTP ${response.status}` };
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update health config'
    };
  }
}
