import type { Link, AnalyticsSummary, MenuItem, PageLink, QRStyle, Sponsor, TrendsSummary } from '../types';
import { getAuthToken, setAuthToken } from './auth';

const BASE_URL = '';

const API_UNAVAILABLE =
  'API unavailable. Start the backend: cd backend && go run ./cmd/server (port 8080).';

const SESSION_EXPIRED = 'Your session expired. Sign in again.';

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  if (res.status === 401 && token) {
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('quickqr:unauthorized'));
    }
    throw new Error(SESSION_EXPIRED);
  }
  return res;
}

async function readResponseText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

async function parseJsonResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const text = await readResponseText(res);
  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(res.status === 502 || res.status === 503 ? API_UNAVAILABLE : fallbackMessage);
    }
    throw new Error(fallbackMessage);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      res.ok ? fallbackMessage : `${fallbackMessage} (${res.status})`,
    );
  }
}

function apiErrorFromBody(
  res: Response,
  text: string,
  fallbackMessage: string,
): Error {
  if (!text.trim()) {
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      return new Error(API_UNAVAILABLE);
    }
    return new Error(fallbackMessage);
  }
  try {
    const err = JSON.parse(text) as { error?: string };
    return new Error(err.error || fallbackMessage);
  } catch {
    return new Error(fallbackMessage);
  }
}

export async function fetchLinks(): Promise<Link[]> {
  const res = await request('/api/links');
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to load links');
  }
  const data = await parseJsonResponse<{ links?: Link[] }>(res, 'Failed to load links');
  return data.links || [];
}

export async function createLink(payload: {
  destination_url: string;
  title: string;
  code?: string;
  ad_style?: string;
}): Promise<Link> {
  const res = await request('/api/links', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to create link');
  }
  return parseJsonResponse<Link>(res, 'Failed to create link');
}

export async function updateLink(
  code: string,
  payload: { destination_url?: string; title?: string; ad_style?: string }
): Promise<Link> {
  const res = await request(`/api/links/${encodeURIComponent(code)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to update link');
  }
  return parseJsonResponse<Link>(res, 'Failed to update link');
}

export async function createMenu(payload: { title: string; items: MenuItem[] }): Promise<Link> {
  const res = await request('/api/menus', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to create menu');
  }
  return parseJsonResponse<Link>(res, 'Failed to create menu');
}

export async function updateMenu(
  code: string,
  payload: { title: string; items: MenuItem[] },
): Promise<Link> {
  const res = await request(`/api/menus/${encodeURIComponent(code)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to update menu');
  }
  return parseJsonResponse<Link>(res, 'Failed to update menu');
}

export async function createPage(payload: { title: string; links: PageLink[] }): Promise<Link> {
  const res = await request('/api/pages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to create link page');
  }
  return parseJsonResponse<Link>(res, 'Failed to create link page');
}

export async function updatePage(
  code: string,
  payload: { title: string; links: PageLink[] },
): Promise<Link> {
  const res = await request(`/api/pages/${encodeURIComponent(code)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to update link page');
  }
  return parseJsonResponse<Link>(res, 'Failed to update link page');
}

export interface QrSettingsField {
  name: string;
  type: string;
  editable: boolean;
  values?: string[];
  about: string;
}

export interface QrSettingsDocument {
  resource: 'qr.settings';
  code: string;
  kind?: string;
  settings: {
    title: string;
    destination_url: string;
    ad_style: Link['ad_style'];
    style: QRStyle | null;
  };
  fields: QrSettingsField[];
}

export async function fetchQrSettings(code: string): Promise<QrSettingsDocument> {
  const res = await request(`/api/qr/${encodeURIComponent(code)}/settings`);
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to load settings');
  }
  return parseJsonResponse<QrSettingsDocument>(res, 'Failed to load settings');
}

export async function fetchSiteContext(url: string): Promise<{ name: string; text: string }> {
  const res = await request('/api/qr/context', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Could not read that site');
  }
  return parseJsonResponse<{ name: string; text: string }>(res, 'Could not read that site');
}

export async function patchQrSettings(
  code: string,
  patch: {
    title?: string;
    destination_url?: string;
    ad_style?: Link['ad_style'];
    style?: Partial<QRStyle> | null;
  },
): Promise<QrSettingsDocument> {
  const res = await request(`/api/qr/${encodeURIComponent(code)}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to save settings');
  }
  return parseJsonResponse<QrSettingsDocument>(res, 'Failed to save settings');
}

export async function deleteLink(code: string): Promise<void> {
  const res = await request(`/api/links/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to delete link');
  }
}

export async function fetchLinkAnalytics(code: string): Promise<AnalyticsSummary> {
  const res = await request(`/api/links/${encodeURIComponent(code)}/analytics`);
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to load analytics');
  }
  return parseJsonResponse<AnalyticsSummary>(res, 'Failed to load analytics');
}

export async function fetchGlobalAnalytics(): Promise<AnalyticsSummary> {
  const res = await request('/api/analytics/global');
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to load global metrics');
  }
  return parseJsonResponse<AnalyticsSummary>(res, 'Failed to load global metrics');
}

/** Every link's scans in each of the last six hours, in one request: what the dashboard draws its trend lines from. */
export async function fetchTrends(): Promise<TrendsSummary> {
  const res = await request('/api/analytics/trends');
  if (!res.ok) {
    throw apiErrorFromBody(res, await readResponseText(res), 'Failed to load scan trends');
  }
  return parseJsonResponse<TrendsSummary>(res, 'Failed to load scan trends');
}

export async function fetchActiveSponsor(): Promise<Sponsor | null> {
  try {
    const res = await request('/api/sponsors/active');
    if (!res.ok) return null;
    const data = await parseJsonResponse<{ sponsor?: Sponsor | null }>(
      res,
      'Failed to load sponsor',
    );
    return data.sponsor || null;
  } catch {
    return null;
  }
}
