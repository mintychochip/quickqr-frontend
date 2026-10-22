import type { Db } from '../db';
import { hmacSha256Hex, randomCode } from '../ids';
import type { AnalyticsSummary, ScanEvent, Sponsor, TimeCountPoint } from '../types';
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
function parseIPv6(text: string): number[] | null {
  text = text.split('%')[0];
  const doubled = text.split('::');
  if (doubled.length > 2) return null;
  const toGroups = (side: string): number[] | null => {
    if (side === '') return [];
    const out: number[] = [];
    const pieces = side.split(':');
    for (let i = 0; i < pieces.length; i++) {
      if (i === pieces.length - 1 && pieces[i].includes('.')) {
        const v4 = parseIPv4(pieces[i]);
        if (!v4) return null;
        out.push((v4[0] << 8) | v4[1], (v4[2] << 8) | v4[3]);
      } else if (/^[0-9a-fA-F]{1,4}$/.test(pieces[i])) {
        out.push(parseInt(pieces[i], 16));
      } else {
        return null;
      }
    }
    return out;
  };
  const head = toGroups(doubled[0]);
  const tail = doubled.length === 2 ? toGroups(doubled[1]) : [];
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
  if (v4) return { hash: await hmacSha256Hex(key, v4.join('.')), prefix: `${v4[0]}.${v4[1]}.${v4[2]}.0/24` };
  const v6 = parseIPv6(text);
  if (v6) {
    const mapped = v6.slice(0, 5).every((g) => g === 0) && v6[5] === 0xffff;
    if (mapped) {
      const octets = [v6[6] >> 8, v6[6] & 255, v6[7] >> 8, v6[7] & 255];
      return { hash: await hmacSha256Hex(key, octets.join('.')), prefix: `${octets[0]}.${octets[1]}.${octets[2]}.0/24` };
    }
    return { hash: await hmacSha256Hex(key, v6.map((g) => g.toString(16)).join(':')), prefix: `${v6[0].toString(16)}:${v6[1].toString(16)}:${v6[2].toString(16)}::/48` };
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
  if (results[0].meta.changes === 0) throw new StoreError('not_found');
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
  const windowStart = `${hours[0].start}:00:00.000Z`;
  const [totals, devices, referrers, recent, hourly] = await db.batch([
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

  const counts = new Map((hourly.results as { h: string; n: number }[]).map((r) => [r.h, r.n]));
  const timeline: TimeCountPoint[] = hours.map((h) => ({ time: h.label, count: counts.get(h.start) ?? 0 }));
  const tally = (rows: Record<string, unknown>[]): Record<string, number> => Object.fromEntries(rows.map((r) => [String(r.k), Number(r.n)]));
  const head = (totals.results[0] ?? {}) as { total?: number; uniq?: number };

  const summary: AnalyticsSummary = {
    total_scans: head.total ?? 0,
    unique_devices: head.uniq ?? 0,
    device_breakdown: tally(devices.results),
    recent_scans: (recent.results as unknown as RecentRow[]).map((r) => ({
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
    top_referrers: tally(referrers.results),
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
