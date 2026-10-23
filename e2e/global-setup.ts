import { ADMIN_USER, PRO_USER, signInToken } from './helpers';

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

interface SignedIn {
  plan?: string;
  is_admin?: boolean;
}

async function me(base: string, token: string): Promise<SignedIn> {
  const res = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`GET /api/auth/me answered ${res.status}`);
  // The e2e server is ours and GET /api/auth/me documents this envelope; the fields are optional per server.
  const body = (await res.json()) as { user: SignedIn };
  return body.user;
}

/**
 * Menus are a Pro feature on a server with plans, and the menu specs use this second person so the fixture user stays
 * Free (her scans must keep showing the sponsor screen). On the Go server there are no plans and menus are open, so
 * there is nothing to grant.
 */
async function ensureProUser(base: string): Promise<void> {
  const token = await signInToken(PRO_USER);
  const user = await me(base, token);
  if (user.is_admin === undefined) return;
  if (user.plan === 'pro') return;

  const adminToken = await signInToken(ADMIN_USER);
  const admin = await me(base, adminToken);
  if (admin.is_admin !== true) {
    throw new Error(
      `${ADMIN_USER} is not an administrator here: put ADMIN_EMAILS=${ADMIN_USER} in frontend/.dev.vars and restart wrangler pages dev.`,
    );
  }
  const made = await fetch(`${base}/api/admin/gifts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: 'pro', days: 30 }),
  });
  if (made.status !== 201) throw new Error(`POST /api/admin/gifts answered ${made.status}`);
  // The hosted create-gift answer carries the one copy of the token; that shape is documented in openapi.yaml.
  const madeBody = (await made.json()) as { token: string };
  const gift = madeBody.token;
  const claimed = await fetch(`${base}/api/gifts/redeem`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: gift }),
  });
  if (claimed.status !== 200) throw new Error(`POST /api/gifts/redeem answered ${claimed.status}`);
  if ((await me(base, token)).plan !== 'pro') throw new Error(`${PRO_USER} was not granted Pro`);
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
  await ensureProUser(base);
}
