import type { Db } from '../db';
import { hmacSha256Hex, randomCode } from '../ids';
import type { AnalyticsSummary, LinkTrend, ScanEvent, Sponsor, TimeCountPoint, TrendsSummary } from '../types';
import { StoreError } from './errors';

const HOUR_MS = 60 * 60 * 1000;
const RECENT_SCANS = 20;
const TOP_REFERRERS = 50;
// A scan's text fields come from the scanner's own request, so each is bounded before it is stored.
const MAX_USER_AGENT = 300;
const MAX_REFERRER = 500;

function parseIPv4(text: string): number[] | null {
  const parts = text.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  return octets.every((o) => o >= 0 && o <= 255) ? octets : null;
}

/** The eight 16-bit groups of an IPv6 address, or null. Handles `::` and an embedded IPv4 tail. */
function parseIPv6(input: string): number[] | null {
  const text = input.split('%')[0] ?? '';
  const doubled = text.split('::');
  if (doubled.length > 2) return null;
  const toGroups = (side: string): number[] | null => {
    if (side === '') return [];
    const out: number[] = [];
    const pieces = side.split(':');
    for (const [i, piece] of pieces.entries()) {
      if (i === pieces.length - 1 && piece.includes('.')) {
        const v4 = parseIPv4(piece);
        if (!v4) return null;
        const [a = 0, b = 0, c = 0, d = 0] = v4;
        out.push((a << 8) | b, (c << 8) | d);
      } else if (/^[0-9a-fA-F]{1,4}$/.test(piece)) {
        out.push(parseInt(piece, 16));
      } else {
        return null;
      }
    }
    return out;
  };
  const head = toGroups(doubled[0] ?? '');
  const tail = doubled.length === 2 ? toGroups(doubled[1] ?? '') : [];
  if (!head || !tail) return null;
  if (doubled.length === 1) return head.length === 8 ? head : null;
  const missing = 8 - head.length - tail.length;
  return missing < 1 ? null : [...head, ...new Array<number>(missing).fill(0), ...tail];
}

/**
 * What is kept of a scanner's address: a keyed hash (so repeat scanners can be counted without storing the address) and
 * the /24 (IPv4) or /48 (IPv6) network (so analytics can show roughly where scans come from). Unparseable input is
 * hashed as given and has the prefix "unknown".
 */
export async function scanIdentity(key: string, ip: string): Promise<{ hash: string; prefix: string }> {
  const text = ip.trim();
  const v4 = parseIPv4(text);
  if (v4) {
    const [a = 0, b = 0, c = 0] = v4;
    return { hash: await hmacSha256Hex(key, v4.join('.')), prefix: `${a}.${b}.${c}.0/24` };
  }
  const v6 = parseIPv6(text);
  if (v6) {
    const [g0 = 0, g1 = 0, g2 = 0, , , g5 = 0, g6 = 0, g7 = 0] = v6;
    if (v6.slice(0, 5).every((g) => g === 0) && g5 === 0xffff) {
      const octets = [g6 >> 8, g6 & 255, g7 >> 8, g7 & 255];
      return { hash: await hmacSha256Hex(key, octets.join('.')), prefix: `${octets[0]}.${octets[1]}.${octets[2]}.0/24` };
    }
    return { hash: await hmacSha256Hex(key, v6.map((g) => g.toString(16)).join(':')), prefix: `${g0.toString(16)}:${g1.toString(16)}:${g2.toString(16)}::/48` };
  }
  return { hash: await hmacSha256Hex(key, text), prefix: 'unknown' };
}

export interface NewScan {
  linkCode: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  deviceType: string;
  browser: string;
  referrer: string;
  country: string;
  city: string;
}

/** Records one scan and counts it on its link, in one transaction. A link that no longer exists is `not_found`. */
export async function recordScan(db: Db, scan: NewScan, hashKey: string): Promise<void> {
  const { hash, prefix } = await scanIdentity(hashKey, scan.ip);
  const results = await db.batch([
    db
      .prepare(
        'INSERT INTO scans (uid, link_code, ts, ip_hash, ip_prefix, user_agent, device_type, browser, referrer, country, city) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM links WHERE code = ?)',
      )
      .bind(
        `scan-${scan.linkCode}-${scan.timestamp.getTime()}-${randomCode(6)}`,
        scan.linkCode,
        scan.timestamp.toISOString(),
        hash,
        prefix,
        scan.userAgent.slice(0, MAX_USER_AGENT),
        scan.deviceType,
        scan.browser,
        scan.referrer.slice(0, MAX_REFERRER),
        scan.country,
        scan.city,
        scan.linkCode,
      ),
    db.prepare('UPDATE links SET total_scans = total_scans + 1 WHERE code = ?').bind(scan.linkCode),
  ]);
  if ((results[0]?.meta.changes ?? 0) === 0) throw new StoreError('not_found');
}

interface RecentRow {
  uid: string;
  link_code: string;
  ts: string;
  ip_prefix: string;
  user_agent: string;
  device_type: string;
  browser: string;
  referrer: string;
  country: string;
  city: string;
}

/** The six clock hours ending with the one containing `now`, oldest first, as UTC hours: [{ start, label }]. */
function lastSixHours(now: Date): { start: string; label: string }[] {
  const top = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
  const hours: { start: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const iso = new Date(top - i * HOUR_MS).toISOString();
    hours.push({ start: iso.slice(0, 13), label: `${iso.slice(11, 13)}:00` });
  }
  return hours;
}

async function summarize(db: Db, scope: string, params: unknown[], linkCode: string | undefined, now: Date): Promise<AnalyticsSummary> {
  const hours = lastSixHours(now);
  const windowStart = `${hours[0]?.start ?? ''}:00:00.000Z`;
  const batch = await db.batch([
    db.prepare(`SELECT COUNT(*) AS total, COUNT(DISTINCT ip_hash) AS uniq FROM scans WHERE ${scope}`).bind(...params),
    db.prepare(`SELECT device_type AS k, COUNT(*) AS n FROM scans WHERE ${scope} GROUP BY device_type`).bind(...params),
    db.prepare(`SELECT referrer AS k, COUNT(*) AS n FROM scans WHERE ${scope} GROUP BY referrer ORDER BY n DESC, k ASC LIMIT ${TOP_REFERRERS}`).bind(...params),
    db
      .prepare(
        `SELECT uid, link_code, ts, ip_prefix, user_agent, device_type, browser, referrer, country, city FROM scans WHERE ${scope} ORDER BY ts DESC, id DESC LIMIT ${RECENT_SCANS}`,
      )
      .bind(...params),
    db.prepare(`SELECT substr(ts, 1, 13) AS h, COUNT(*) AS n FROM scans WHERE ${scope} AND ts >= ? GROUP BY h`).bind(...params, windowStart),
  ]);
  const rowsAt = (index: number): Record<string, unknown>[] => batch[index]?.results ?? [];

  const counts = new Map((rowsAt(4) as { h: string; n: number }[]).map((r) => [r.h, r.n]));
  const timeline: TimeCountPoint[] = hours.map((h) => ({ time: h.label, count: counts.get(h.start) ?? 0 }));
  const tally = (rows: Record<string, unknown>[]): Record<string, number> => Object.fromEntries(rows.map((r) => [String(r.k), Number(r.n)]));
  const head = (rowsAt(0)[0] ?? {}) as { total?: number; uniq?: number };

  const summary: AnalyticsSummary = {
    total_scans: head.total ?? 0,
    unique_devices: head.uniq ?? 0,
    device_breakdown: tally(rowsAt(1)),
    recent_scans: (rowsAt(3) as unknown as RecentRow[]).map((r) => ({
      id: r.uid,
      link_code: r.link_code,
      timestamp: r.ts,
      ip: r.ip_prefix,
      user_agent: r.user_agent,
      device_type: r.device_type,
      browser: r.browser,
      referrer: r.referrer,
      country: r.country,
      city: r.city,
    })),
    hourly_timeline: timeline,
    top_referrers: tally(rowsAt(2)),
  };
  if (linkCode !== undefined) summary.link_code = linkCode;
  return summary;
}

/** Summarizes the scans of one link. */
export function getAnalytics(db: Db, code: string, now = new Date()): Promise<AnalyticsSummary> {
  return summarize(db, 'link_code = ?', [code], code, now);
}

/** Summarizes the scans of every link a person currently owns. */
export function getAnalyticsForOwner(db: Db, ownerId: string, now = new Date()): Promise<AnalyticsSummary> {
  if (!ownerId) return summarize(db, '0', [], undefined, now);
  return summarize(db, 'link_code IN (SELECT code FROM links WHERE owner_id = ?)', [ownerId], undefined, now);
}

/**
 * Scans per link per clock hour inside the window, for the links one person owns. It reads the window through the
 * (link_code, ts) index, so its cost follows the scans of the last six hours and the number of links, not how many scans
 * a link has ever had (a test pins the query plan). `h` is the hour as `YYYY-MM-DDTHH`, the same bucket `summarize` uses.
 */
export const TRENDS_SQL =
  'SELECT link_code AS code, substr(ts, 1, 13) AS h, COUNT(*) AS n FROM scans WHERE link_code IN (SELECT code FROM links WHERE owner_id = ?) AND ts >= ? GROUP BY link_code, h';

/** The hourly counts the dashboard draws for every link a person owns, in one query instead of five per link. */
export async function getTrendsForOwner(db: Db, ownerId: string, now = new Date()): Promise<TrendsSummary> {
  const window = lastSixHours(now);
  const hours = window.map((h) => `${h.start}:00:00Z`);
  if (!ownerId) return { hours, links: [] };

  const windowStart = `${window[0]?.start ?? ''}:00:00.000Z`;
  const { results } = await db.prepare(TRENDS_SQL).bind(ownerId, windowStart).all<{ code: string; h: string; n: number }>();

  const byCode = new Map<string, number[]>();
  for (const row of results) {
    const slot = window.findIndex((h) => h.start === row.h);
    if (slot < 0) continue; // after the current hour: a scan stamped by a clock that ran ahead
    const counts = byCode.get(row.code) ?? window.map(() => 0);
    counts[slot] = Number(row.n);
    byCode.set(row.code, counts);
  }
  const links: LinkTrend[] = [...byCode].map(([code, counts]) => ({ code, counts }));
  links.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0)); // by code unit, as Go sorts, whatever the locale
  return { hours, links };
}

/** Deletes up to `limit` scans older than `cutoff` and says how many it deleted. Call until it returns 0. */
export async function purgeScansBefore(db: Db, cutoff: Date, limit: number): Promise<number> {
  const res = await db
    .prepare('DELETE FROM scans WHERE id IN (SELECT id FROM scans WHERE ts < ? ORDER BY ts LIMIT ?)')
    .bind(cutoff.toISOString(), limit)
    .run();
  return res.meta.changes;
}

interface SponsorRow {
  id: string;
  brand_name: string;
  badge: string;
  headline: string;
  tagline: string;
  cta: string;
  target_url: string;
  logo_url: string;
  active: number;
}

export async function getActiveSponsor(db: Db): Promise<Sponsor | null> {
  const row = await db.prepare('SELECT * FROM sponsors WHERE active = 1 LIMIT 1').first<SponsorRow>();
  return row ? { ...row, active: true } : null;
}

export type { ScanEvent };
