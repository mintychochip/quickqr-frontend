import { signInToken } from './helpers';

const USER_AGENTS = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
];

const REFERERS = [
  'https://example.com/menu/fall-season',
  'https://example.com/techcon/schedule',
  'https://example.com/newsletter/october',
];

interface FixtureLink {
  title: string;
  destination_url: string;
  ad_style?: string;
}

const FIXTURE_LINKS: Record<string, FixtureLink> = {
  'menu-cafe': {
    title: 'Autumn Cafe Menu 2026',
    destination_url: 'https://example.com/menu/fall-season',
  },
  'event-techcon': {
    title: 'TechCon 2026 Badge QR',
    destination_url: 'https://example.com/techcon/schedule',
    ad_style: 'sponsor_banner',
  },
};

async function ensureLink(base: string, token: string, code: string): Promise<void> {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const create = await fetch(`${base}/api/links`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code, ...FIXTURE_LINKS[code] }),
  });
  if (create.status === 201) {
    return;
  }
  if (create.status === 409) {
    const listRes = await fetch(`${base}/api/links`, { headers });
    const list = (await listRes.json()) as { links?: { code: string }[] };
    if ((list.links ?? []).some((link) => link.code === code)) {
      return;
    }
    throw new Error(`link code ${code} belongs to someone else`);
  }
  throw new Error(`POST /api/links ${code} answered ${create.status}`);
}

async function totalScans(base: string, token: string, code: string): Promise<number> {
  const res = await fetch(`${base}/api/links/${code}/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return 0;
  }
  const summary = (await res.json()) as { total_scans?: number };
  return summary.total_scans ?? 0;
}

async function recordScans(base: string, code: string, count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await fetch(`${base}/r/${code}`, {
      redirect: 'manual',
      headers: {
        'User-Agent': USER_AGENTS[i % USER_AGENTS.length] as string,
        Referer: REFERERS[i % REFERERS.length] as string,
      },
    });
  }
}

export default async function globalSetup(): Promise<void> {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5186';
  const token = await signInToken();
  await ensureLink(base, token, 'menu-cafe');
  await ensureLink(base, token, 'event-techcon');
  if ((await totalScans(base, token, 'menu-cafe')) < 20) {
    await recordScans(base, 'menu-cafe', 40);
  }
  if ((await totalScans(base, token, 'event-techcon')) < 20) {
    await recordScans(base, 'event-techcon', 25);
  }
}
