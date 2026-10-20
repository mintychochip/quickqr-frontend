export interface MenuItem {
  name: string;
  price: string;
}

export interface PageLink {
  name: string;
  url: string;
}

export interface QRStyle {
  fgColor: string;
  bgColor: string;
  accentColor?: string;
  errorLevel: 'L' | 'M' | 'Q' | 'H';
  frame: 'plain' | 'soft' | 'ring';
  moduleColorMode?: 'uniform' | 'finder_accent' | 'gradient';
  dotShape?: 'square' | 'rounded' | 'circle';
  summary?: string;
}

export interface Link {
  id: string;
  code: string;
  title: string;
  destination_url: string;
  created_at: string;
  updated_at: string;
  total_scans: number;
  ad_style: 'interstitial_3s' | 'sponsor_banner' | 'direct' | 'menu' | 'linkpage';
  is_active: boolean;
  kind?: 'menu' | 'linkpage' | '';
  items?: MenuItem[];
  links?: PageLink[];
  style?: QRStyle | null;
}

export interface ScanEvent {
  id: string;
  link_code: string;
  timestamp: string;
  ip: string;
  device_type: 'iOS' | 'Android' | 'Desktop' | 'Other';
  browser: string;
  referrer: string;
  country: string;
  city: string;
}

export interface Sponsor {
  id: string;
  brand_name: string;
  badge: string;
  headline: string;
  tagline: string;
  cta: string;
  target_url: string;
  logo_url: string;
  active: boolean;
}

export interface TimeCountPoint {
  time: string;
  count: number;
}

export interface AnalyticsSummary {
  link_code?: string;
  total_scans: number;
  unique_devices: number;
  device_breakdown: Record<string, number>;
  recent_scans: ScanEvent[];
  hourly_timeline: TimeCountPoint[];
  top_referrers: Record<string, number>;
}
