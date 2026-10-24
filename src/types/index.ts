export interface MenuItem {
  name: string;
  price: string;
}

export type MenuFont = 'serif' | 'sans' | 'mono';

/** A hosted menu's optional owner brand; absent means the original quickqr page. */
export interface MenuDesign {
  logoUrl: string;
  background: string;
  ink: string;
  accent: string;
  font: MenuFont;
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
  ad_style: 'interstitial_3s' | 'sponsor_banner' | 'direct' | 'menu' | 'linkpage' | 'site';
  is_active: boolean;
  kind?: 'menu' | 'linkpage' | 'site' | '';
  items?: MenuItem[];
  links?: PageLink[];
  style?: QRStyle | null;
  /** Absent for an unbranded menu. */
  design?: MenuDesign;
  /** The site a menu was published to; absent while it serves its dynamic page. */
  published_site_code?: string;
  domain?: string;
  domain_verified_at?: string;
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

/** Scans in each of the hours of TrendsSummary.hours, for one link. */
export interface LinkTrend {
  code: string;
  counts: number[];
}

/** Hourly scan counts for all of a person's links in one answer (GET /api/analytics/trends). */
export interface TrendsSummary {
  /** The six UTC clock hours ending with the current one, oldest first, each as the instant it starts. */
  hours: string[];
  /** Only links with a scan in those hours; a link that is not listed had none. */
  links: LinkTrend[];
}
