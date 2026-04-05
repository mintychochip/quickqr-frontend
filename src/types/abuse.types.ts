export type AbuseType = 'malicious_content' | 'scan_bot' | 'qr_flooding' | 'qr_hijacking';
export type AbuseSeverity = 'low' | 'medium' | 'high';

export interface AbuseIncident {
  id: string;
  user_id: string | null;
  type: AbuseType;
  severity: AbuseSeverity;
  evidence: AbuseEvidence;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface AbuseEvidence {
  // Common fields
  ip?: string;
  user_agent?: string;
  timestamp?: string;

  // Malicious content specific
  url?: string;
  domain?: string;
  safe_browsing_match?: string;

  // Scan bot specific
  scan_count?: number;
  fingerprint?: string;
  time_window_seconds?: number;
  ip_scan_count?: number;
  ip_time_window_seconds?: number;

  // QR flooding specific
  qr_count?: number;
  time_window_hours?: number;
  user_tier?: string;

  // QR hijacking specific
  slug?: string;
  scan_count_delta?: number;
  scan_delta_seconds?: number;
}

export interface AbuseDetectionResult {
  severity: AbuseSeverity | null;
  type: AbuseType | null;
  evidence: AbuseEvidence;
  shouldBlock: boolean;
  shouldLog: boolean;
}

export interface ScanBotDetectionInput {
  slug: string;
  os: string;
  fingerprint?: string;
  ip: string;
}

export interface QrFloodingDetectionInput {
  userId: string;
  recentQrCount: number;
  timeWindowHours: number;
}

export interface UserAbuseStatus {
  abuseScore: number;
  isBlocked: boolean;
  tier: 'clean' | 'watch' | 'restricted' | 'blocked';
}
