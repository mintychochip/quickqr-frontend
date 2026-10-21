/**
 * Loads real-world URLs for training and evaluating the v1 model.
 *
 * Two safeguards keep the numbers honest. At most `perHost` URLs are taken from any one host, because the corpus
 * is dominated by a handful of sites and would otherwise teach the model those sites. And hosts, not URLs, are
 * split into train and test (a stable hash of the host name), so a test URL never shares a host with training.
 */
import { readFile } from 'node:fs/promises';
import { bodyOf, splitHost } from '../../src/lib/compression/v1';

export type Sample = {
  url: string;
  host: string;
  /** What v1 codes after the host. */
  body: string;
  split: 'train' | 'test';
};

function hashHost(host: string): number {
  let h = 2166136261;
  for (let i = 0; i < host.length; i++) {
    h ^= host.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

export async function loadSamples(path: string, perHost = 10): Promise<Sample[]> {
  const byHost = new Map<string, Array<{ url: string; body: string }>>();
  for (const line of (await readFile(path, 'utf8')).split('\n')) {
    const text = line.trim();
    if (!text) continue;
    let url: URL;
    try {
      url = new URL(text);
    } catch {
      continue;
    }
    const host = url.hostname.toLowerCase();
    const body = bodyOf(url);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) continue;
    if (body === null || !splitHost(host)) continue;
    const list = byHost.get(host) ?? [];
    list.push({ url: text, body });
    byHost.set(host, list);
  }

  const out: Sample[] = [];
  for (const [host, list] of [...byHost].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const step = Math.max(1, Math.floor(list.length / perHost));
    const split = hashHost(host) % 5 === 0 ? 'test' : 'train';
    for (let i = 0, taken = 0; i < list.length && taken < perHost; i += step, taken++) {
      out.push({ url: list[i]!.url, host, body: list[i]!.body, split });
    }
  }
  return out;
}
