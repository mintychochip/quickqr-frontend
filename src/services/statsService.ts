/**
 * Stats Service
 * Handles fetching user scan statistics via Supabase
 */
import { supabase } from '../config/supabase';

export interface UserStats {
  userid: string;
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
  content?: Record<string, unknown>;
  scan_count: number;
  percentage: number;
}

export interface TimelineStat {
  scan_date: string;
  scan_count: number;
}

export interface ListStatsResponse {
  success: boolean;
  data?: unknown[];
  error?: string;
}

/**
 * Fetches user scan statistics for a given time period
 */
export async function fetchUserStats(days: number = 30): Promise<StatsResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total qrcodes
    const { count: totalQrcodes } = await supabase
      .from('qrcodes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get total scans
    const { data: scans } = await supabase
      .from('scans')
      .select('*, qrcodes!inner(user_id)')
      .eq('qrcodes.user_id', user.id)
      .gte('scanned_at', startDate.toISOString());

    const totalScans = scans?.length || 0;
    const lastScan = scans?.sort((a, b) =>
      new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
    )[0];
    const firstScan = scans?.sort((a, b) =>
      new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
    )[0];

    return {
      success: true,
      stats: {
        userid: user.id,
        days_analyzed: days,
        total_qrcodes: totalQrcodes || 0,
        total_scans: totalScans,
        avg_scans_per_qrcode: totalQrcodes ? totalScans / totalQrcodes : 0,
        last_scan_time: lastScan?.scanned_at || null,
        first_scan_time: firstScan?.scanned_at || null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    };
  }
}

/**
 * Fetches operating systems breakdown
 */
export async function fetchOperatingSystems(days: number = 30): Promise<ListStatsResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: scans, error } = await supabase
      .from('scans')
      .select('os, qrcodes!inner(user_id)')
      .eq('qrcodes.user_id', user.id)
      .gte('scanned_at', startDate.toISOString());

    if (error) return { success: false, error: error.message };

    // Aggregate by OS
    const osMap: Record<string, number> = {};
    const total = scans?.length || 0;

    scans?.forEach(scan => {
      const os = scan.os || 'Unknown';
      osMap[os] = (osMap[os] || 0) + 1;
    });

    const data: OperatingSystemStat[] = Object.entries(osMap).map(([operating_system, scan_count]) => ({
      operating_system,
      scan_count,
      percentage: total ? (scan_count / total) * 100 : 0,
    }));

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch operating systems',
    };
  }
}

/**
 * Fetches scans by QR code
 */
export async function fetchScansByQRCode(days: number = 30): Promise<ListStatsResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: scans, error } = await supabase
      .from('scans')
      .select('qrcode_id, qrcodes(name, type, content)')
      .eq('qrcodes.user_id', user.id)
      .gte('scanned_at', startDate.toISOString());

    if (error) return { success: false, error: error.message };

    // Aggregate by QR code
    const qrMap: Record<string, QRCodeStat> = {};
    const total = scans?.length || 0;

    scans?.forEach(scan => {
      const qid = scan.qrcode_id;
      // qrcodes is returned as an array from Supabase
      const qrData = Array.isArray(scan.qrcodes) ? scan.qrcodes[0] : scan.qrcodes;
      if (!qrMap[qid]) {
        qrMap[qid] = {
          qrcodeid: qid,
          name: qrData?.name || 'Unknown',
          type: qrData?.type || 'unknown',
          content: qrData?.content,
          scan_count: 0,
          percentage: 0,
        };
      }
      qrMap[qid].scan_count++;
    });

    const data = Object.values(qrMap).map(item => ({
      ...item,
      percentage: total ? (item.scan_count / total) * 100 : 0,
    }));

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch scans by QR code',
    };
  }
}

/**
 * Fetches scans timeline
 */
export async function fetchScansTimeline(days: number = 30): Promise<ListStatsResponse> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: scans, error } = await supabase
      .from('scans')
      .select('scanned_at')
      .eq('qrcodes.user_id', user.id)
      .gte('scanned_at', startDate.toISOString());

    if (error) return { success: false, error: error.message };

    // Aggregate by date
    const dateMap: Record<string, number> = {};

    scans?.forEach(scan => {
      const date = new Date(scan.scanned_at).toISOString().split('T')[0];
      dateMap[date] = (dateMap[date] || 0) + 1;
    });

    const data: TimelineStat[] = Object.entries(dateMap)
      .map(([scan_date, scan_count]) => ({ scan_date, scan_count }))
      .sort((a, b) => a.scan_date.localeCompare(b.scan_date));

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch scans timeline',
    };
  }
}
