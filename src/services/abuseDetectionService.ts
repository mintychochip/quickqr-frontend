/**
 * Abuse Detection Service
 * Handles detection and response to abusive behavior
 */
import { supabase } from '../config/supabase';
import type {
  AbuseType,
  AbuseSeverity,
  AbuseEvidence,
  AbuseDetectionResult,
  ScanBotDetectionInput,
  QrFloodingDetectionInput,
  UserAbuseStatus,
} from '../types/abuse.types';

// Thresholds
const SCAN_BOT_SAME_FP_WINDOW_SECONDS = 60;
const SCAN_BOT_SAME_FP_THRESHOLD = 10;
const SCAN_BOT_SAME_IP_WINDOW_SECONDS = 3600;
const SCAN_BOT_SAME_IP_THRESHOLD = 100;
const QR_FLOODING_COUNT_THRESHOLD = 20;
const QR_FLOODING_WINDOW_HOURS = 1;
const SAFE_BROWSING_API = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

/**
 * Check QR content for malicious URLs using Google Safe Browsing API
 */
export async function checkQrContent(
  content: Record<string, unknown>
): Promise<{ safe: boolean; evidence: AbuseEvidence }> {
  const apiKey = import.meta.env.VITE_SAFE_BROWSING_API_KEY;
  if (!apiKey) {
    return { safe: true, evidence: {} };
  }

  // Extract URLs from content
  const urls: string[] = [];
  if (content.url && typeof content.url === 'string') {
    urls.push(content.url);
  }

  // Recursively find URLs in nested content
  const findUrls = (obj: unknown): void => {
    if (!obj) return;
    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (key === 'url' && typeof value === 'string') {
          urls.push(value);
        } else if (typeof value === 'object') {
          findUrls(value);
        }
      }
    }
  };
  findUrls(content);

  if (urls.length === 0) {
    return { safe: true, evidence: {} };
  }

  try {
    const response = await fetch(`${SAFE_BROWSING_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'quickqr', clientVersion: '1.0.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: urls.map(url => ({ url })),
        },
      }),
    });

    if (!response.ok) {
      // API error - don't block
      return { safe: true, evidence: {} };
    }

    const data = await response.json();
    if (data.matches && data.matches.length > 0) {
      const match = data.matches[0];
      return {
        safe: false,
        evidence: {
          url: urls[0],
          domain: new URL(urls[0]).hostname,
          safe_browsing_match: match.threatType,
        },
      };
    }

    return { safe: true, evidence: {} };
  } catch {
    // Error - don't block
    return { safe: true, evidence: {} };
  }
}

/**
 * Detect scan bot activity based on IP and fingerprint
 */
export async function detectScanBot(
  input: ScanBotDetectionInput
): Promise<AbuseDetectionResult | null> {
  const windowSecondsIp = SCAN_BOT_SAME_IP_WINDOW_SECONDS;
  const thresholdIp = SCAN_BOT_SAME_IP_THRESHOLD;
  const windowSecondsFp = SCAN_BOT_SAME_FP_WINDOW_SECONDS;
  const thresholdFp = SCAN_BOT_SAME_FP_THRESHOLD;

  // Check IP-based detection
  const ipCutoff = new Date(Date.now() - windowSecondsIp * 1000).toISOString();
  const { count: ipCount } = await supabase
    .from('scans')
    .select('*', { count: 'exact', head: true })
    .eq('ip', input.ip)
    .gt('created_at', ipCutoff);

  if (ipCount && ipCount > thresholdIp) {
    return {
      severity: 'high',
      type: 'scan_bot',
      evidence: {
        ip: input.ip,
        ip_scan_count: ipCount as number,
        ip_time_window_seconds: windowSecondsIp,
        fingerprint: input.fingerprint,
      },
      shouldBlock: false,
      shouldLog: true,
    };
  }

  // Check fingerprint-based detection
  if (input.fingerprint) {
    const fpCutoff = new Date(Date.now() - windowSecondsFp * 1000).toISOString();
    const { count: fpCount } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('fingerprint', input.fingerprint)
      .gt('created_at', fpCutoff);

    if (fpCount && fpCount > thresholdFp) {
      return {
        severity: 'medium',
        type: 'scan_bot',
        evidence: {
          fingerprint: input.fingerprint,
          scan_count: fpCount as number,
          time_window_seconds: windowSecondsFp,
          ip: input.ip,
        },
        shouldBlock: false,
        shouldLog: true,
      };
    }
  }

  return null;
}

/**
 * Detect QR flooding from the same user
 */
export async function detectQrFlooding(
  input: QrFloodingDetectionInput
): Promise<AbuseDetectionResult | null> {
  const windowHours = QR_FLOODING_WINDOW_HOURS;
  const threshold = QR_FLOODING_COUNT_THRESHOLD;

  const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabase
    .from('qrcodes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', input.userId)
    .gt('created_at', cutoff);

  // Check for flooding based on recent count
  if (recentCount && recentCount > threshold) {
    return {
      severity: 'medium',
      type: 'qr_flooding',
      evidence: {
        qr_count: recentCount as number,
        time_window_hours: windowHours,
      },
      shouldBlock: false,
      shouldLog: true,
    };
  }

  // Check for free tier users exceeding 100 total QRs
  const { count: totalCount } = await supabase
    .from('qrcodes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', input.userId);

  if (totalCount && totalCount > 100) {
    return {
      severity: 'high',
      type: 'qr_flooding',
      evidence: {
        qr_count: totalCount as number,
        time_window_hours: windowHours,
        user_tier: 'free',
      },
      shouldBlock: false,
      shouldLog: true,
    };
  }

  return null;
}

/**
 * Get user's abuse status
 */
export async function getUserAbuseStatus(userId: string): Promise<UserAbuseStatus> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('abuse_score, is_blocked')
    .eq('id', userId)
    .single();

  const abuseScore = profile?.abuse_score || 0;
  const isBlocked = profile?.is_blocked || false;

  let tier: UserAbuseStatus['tier'];
  if (isBlocked) {
    tier = 'blocked';
  } else if (abuseScore <= 30) {
    tier = 'clean';
  } else if (abuseScore <= 60) {
    tier = 'watch';
  } else {
    tier = 'restricted';
  }

  return { abuseScore, isBlocked, tier };
}

/**
 * Increment user's abuse score
 */
export async function incrementAbuseScore(
  userId: string,
  severity: AbuseSeverity
): Promise<void> {
  const incrementMap: Record<AbuseSeverity, number> = {
    high: 30,
    medium: 15,
    low: 5,
  };
  const increment = incrementMap[severity];

  await supabase.rpc('increment_abuse_score', {
    user_id: userId,
    increment,
  });
}

/**
 * Log an abuse incident
 */
export async function logAbuseIncident(
  userId: string,
  type: AbuseType,
  severity: AbuseSeverity,
  evidence: AbuseEvidence
): Promise<void> {
  await supabase.from('abuse_incidents').insert({
    user_id: userId,
    type,
    severity,
    evidence,
  });
}

/**
 * Block a user
 */
export async function blockUser(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ is_blocked: true, blocked_at: new Date().toISOString() })
    .eq('id', userId);
}

/**
 * Trigger abuse alert edge function
 */
async function triggerAbuseAlert(
  userId: string,
  abuseType: AbuseType,
  severity: AbuseSeverity,
  evidence: AbuseEvidence
): Promise<void> {
  // Get user email for alert
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-abuse-alert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      userId,
      userEmail: profile?.email || 'unknown',
      abuseType,
      severity,
      evidence,
      timestamp: new Date().toISOString(),
    }),
  }).catch(err => console.error('Failed to send abuse alert:', err));
}

/**
 * Main entry point for abuse detection
 */
export async function runAbuseDetection(
  userId: string,
  type: 'create' | 'scan',
  data: ScanBotDetectionInput | QrFloodingDetectionInput | Record<string, unknown>
): Promise<AbuseDetectionResult> {
  if (type === 'scan') {
    const scanInput = data as ScanBotDetectionInput;
    const result = await detectScanBot(scanInput);

    if (result && result.shouldLog) {
      await logAbuseIncident(userId, result.type!, result.severity!, result.evidence);
      await incrementAbuseScore(userId, result.severity!);

      if (result.severity === 'high') {
        await blockUser(userId);
        await triggerAbuseAlert(userId, result.type!, result.severity!, result.evidence);
        result.shouldBlock = true;
      }
    }

    return result || {
      severity: null,
      type: null,
      evidence: {},
      shouldBlock: false,
      shouldLog: false,
    };
  }

  if (type === 'create') {
    const createData = data as Record<string, unknown>;
    const results: AbuseDetectionResult[] = [];

    // Check QR content
    const contentCheck = await checkQrContent(createData);
    if (!contentCheck.safe) {
      const result: AbuseDetectionResult = {
        severity: 'high',
        type: 'malicious_content',
        evidence: contentCheck.evidence,
        shouldBlock: true,
        shouldLog: true,
      };
      await logAbuseIncident(userId, result.type!, result.severity!, result.evidence);
      await incrementAbuseScore(userId, result.severity!);
      await blockUser(userId);
      await triggerAbuseAlert(userId, result.type!, result.severity!, result.evidence);
      return result;
    }

    // Check QR flooding
    const floodingResult = await detectQrFlooding({
      userId,
      recentQrCount: 0,
      timeWindowHours: QR_FLOODING_WINDOW_HOURS,
    });

    if (floodingResult && floodingResult.shouldLog) {
      await logAbuseIncident(userId, floodingResult.type!, floodingResult.severity!, floodingResult.evidence);
      await incrementAbuseScore(userId, floodingResult.severity!);

      if (floodingResult.severity === 'high') {
        await blockUser(userId);
        await triggerAbuseAlert(userId, floodingResult.type!, floodingResult.severity!, floodingResult.evidence);
        floodingResult.shouldBlock = true;
      }
      return floodingResult;
    }

    return {
      severity: null,
      type: null,
      evidence: {},
      shouldBlock: false,
      shouldLog: false,
    };
  }

  return {
    severity: null,
    type: null,
    evidence: {},
    shouldBlock: false,
    shouldLog: false,
  };
}
