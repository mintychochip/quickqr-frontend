// The JSON shapes the API sends. They mirror backend/internal/models (Go) and docs/openapi.yaml field for field.

import type { MenuDesign } from './menuDesign';

export const LINK_KIND_MENU = 'menu';
export const LINK_KIND_LINK_PAGE = 'linkpage';
export const LINK_KIND_SITE = 'site';

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
  errorLevel: string;
  frame: string;
  moduleColorMode?: string;
  dotShape?: string;
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
  ad_style: string;
  is_active: boolean;
  kind?: string;
  items?: MenuItem[];
  links?: PageLink[];
  style?: QRStyle;
  /** A menu's owner brand; absent means the unbranded quickqr page. */
  design?: MenuDesign;
  /** The site code a menu was published to; absent when it serves its dynamic page. */
  published_site_code?: string;
  /** A site's customer domain, set on the hosted backend only; the owner forwards it to `/s/{code}/`. */
  domain?: string;
  /** When a forwarding check last saw the domain redirect to the site, ISO 8601. Cleared when it breaks. */
  domain_verified_at?: string;
}

/** A link plus the owner, which is stored but never sent to a client. */
export interface StoredLink extends Link {
  owner_id: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}

/** A scan. `ip` is whatever the writer had; analytics returns the network prefix there, never the address. */
export interface ScanEvent {
  id: string;
  link_code: string;
  timestamp: string;
  ip: string;
  user_agent: string;
  device_type: string;
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

/** Scans in each of the six hours of TrendsSummary.hours, for one link. */
export interface LinkTrend {
  code: string;
  counts: number[];
}

/** What the dashboard draws for all of a person's links at once (GET /api/analytics/trends). */
export interface TrendsSummary {
  /** The six UTC clock hours ending with the one that contains now, oldest first, each as the instant it starts. */
  hours: string[];
  /** Only links with at least one scan in those hours, in code order. A link that is not listed had none. */
  links: LinkTrend[];
}
