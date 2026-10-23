import { expect, test, type Page } from '@playwright/test';
import { contrastOf, routeGoogleToStandIn, signInToken, signInViaOAuth } from './helpers';

/**
 * Gift links exist only on the hosted (Cloudflare) backend, and the administrator is whoever ADMIN_EMAILS names. Locally
 * that is the fixture user: ADMIN_EMAILS=ada@example.com in frontend/.dev.vars, then restart `wrangler pages dev`.
 */
const ADMIN = 'ada@example.com';
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5186';

const unique = (): string => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
/** A person who has never signed in here, so what they hold is only what the test gives them. */
const person = (name: string): string => `${name}-${unique()}@example.com`;

async function api(token: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<Response> {
  return fetch(new URL(path, BASE), {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    redirect: 'manual',
  });
}

/** Makes a gift as the administrator. `path` is its link on the origin under test (the server names its own public origin). */
async function makeGift(body: Record<string, unknown> = {}): Promise<{ id: string; path: string; token: string }> {
  const response = await api(await signInToken(ADMIN), '/api/admin/gifts', { method: 'POST', body: { plan: 'plus', days: 30, ...body } });
  expect(response.status).toBe(201);
  const made = (await response.json()) as { id: string; link: string };
  const link = new URL(made.link);
  return { id: made.id, path: `${link.pathname}${link.hash}`, token: link.hash.slice(1) };
}

async function claim(email: string, token: string): Promise<Response> {
  return api(await signInToken(email), '/api/gifts/redeem', { method: 'POST', body: { token } });
}

const sideways = (page: Page): Promise<number> => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

test.describe('gift links (hosted backend only)', () => {
  test.beforeAll(async () => {
    const response = await api(await signInToken(ADMIN), '/api/auth/me');
    const { user } = (await response.json()) as { user: { is_admin?: boolean } };
    test.skip(user.is_admin === undefined, 'Gift links exist only on the hosted backend; this server is the Go reference server.');
    if (!user.is_admin) {
      throw new Error(`${ADMIN} is not an administrator here: put ADMIN_EMAILS=${ADMIN} in frontend/.dev.vars and restart wrangler pages dev.`);
    }
  });

  test('an administrator makes a gift in the dashboard, and its link is shown once', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await signInViaOAuth(page, '/', ADMIN);
    await page.goto('/dashboard/gifts');
    await expect(page.getByTestId('gifts-section')).toBeVisible();

    const note = `e2e ${unique()}`;
    await page.getByLabel('Plan lasts (days)').fill('14');
    await page.getByLabel('Note').fill(note);
    await page.getByTestId('gift-make').click();

    const link = await page.getByTestId('gift-link').inputValue();
    expect(link).toMatch(/\/gift#[A-Za-z0-9_-]{27}$/);
    const token = new URL(link).hash.slice(1);

    await page.getByTestId('gift-copy').click();
    await expect(page.getByTestId('gift-copy')).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(link);

    const row = page.getByTestId('gift-row').filter({ hasText: note });
    await expect(row).toContainText('Plus for 14 days');
    await expect(row).toContainText('0 of 1 claimed');
    await expect(row.getByTestId('gift-status')).toHaveText('Active');
    await expect(page.getByTestId('gift-list')).not.toContainText(token);

    // The server kept a hash, so a reload has the gift in the list and nowhere to read its link from.
    await page.reload();
    await expect(page.getByTestId('gift-row').filter({ hasText: note })).toBeVisible();
    await expect(page.getByTestId('gift-created')).toHaveCount(0);
    expect(await page.content()).not.toContain(token);
  });

  test('a form the server refuses says why and makes nothing', async ({ page }) => {
    await signInViaOAuth(page, '/', ADMIN);
    await page.goto('/dashboard/gifts');
    await expect(page.getByTestId('gift-make')).toBeEnabled();

    // The browser's own limits stop an out-of-range number before it is sent; switch them off to read the server's answer.
    await page.getByTestId('gift-form').evaluate((form) => form.setAttribute('novalidate', ''));
    await page.getByLabel('Plan lasts (days)').fill('9999');
    await page.getByTestId('gift-make').click();

    await expect(page.getByRole('alert')).toContainText('days must be a whole number from 1 to 366');
    await expect(page.getByTestId('gift-created')).toHaveCount(0);
  });

  test('a person signs in from the link, claims the plan, and the token rides in no address', async ({ page }) => {
    const gift = await makeGift({ days: 30 });
    const email = person('sam');
    const requests: Array<{ method: string; url: string; referer: string | undefined; body: string | null }> = [];
    page.on('request', (request) => {
      requests.push({ method: request.method(), url: request.url(), referer: request.headers().referer, body: request.postData() });
    });

    await page.goto(gift.path);
    await expect(page.getByRole('heading', { name: 'You have a gift.' })).toBeVisible();
    // The fragment leaves the address bar as soon as the page opens.
    expect(page.url()).not.toContain(gift.token);
    expect(page.url()).not.toContain('#');

    await page.getByTestId('gift-sign-in').click();
    await routeGoogleToStandIn(page);
    await page.getByRole('dialog', { name: 'Sign in to claim your gift' }).getByRole('button', { name: 'Continue with Google' }).click();
    await page.getByRole('textbox', { name: 'Email' }).fill(email);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    // Back from the provider, which lost the fragment, the token is still waiting. Nothing is claimed by arriving.
    await expect(page.getByTestId('gift-account')).toHaveText(email);
    await expect(page.getByTestId('gift-result')).toHaveCount(0);

    await page.getByTestId('gift-claim').click();
    await expect(page.getByTestId('gift-result')).toContainText(/Plus.*\w{3} \d{1,2}, \d{4}/);
    expect(page.url()).not.toContain('#');

    // The one request that carried the token is the claim, and it carried it in a body.
    const carrying = requests.filter((r) => r.url.includes(gift.token) || r.referer?.includes(gift.token) || r.body?.includes(gift.token));
    expect(carrying.map((r) => `${r.method} ${new URL(r.url).pathname}`)).toEqual(['POST /api/gifts/redeem']);
    expect(carrying[0]?.url).not.toContain(gift.token);

    // The plan is on the account everywhere the app names it.
    await page.getByRole('link', { name: 'Go to your dashboard' }).click();
    await expect(page.locator('aside[aria-label="Dashboard navigation"] [data-slot="badge"]')).toHaveText('Plus');
    await page.getByRole('button', { name: 'Account menu' }).click();
    await expect(page.getByText(/Plus plan until \w{3} \d{1,2}, \d{4}/)).toBeVisible();
  });

  test('a gift takes the sponsor screen off the recipient\u2019s scans, and only theirs', async () => {
    const [sam, lee] = [person('sam'), person('lee')];
    const destination = 'https://example.com/gift-scan';
    const newLink = async (email: string): Promise<string> => {
      const response = await api(await signInToken(email), '/api/links', { method: 'POST', body: { destination_url: destination, title: 'gift scan' } });
      return ((await response.json()) as { code: string }).code;
    };
    const scan = (code: string): Promise<Response> => fetch(new URL(`/r/${code}`, BASE), { redirect: 'manual' });
    const [samCode, leeCode] = [await newLink(sam), await newLink(lee)];

    // Free: the sponsor screen.
    const before = await scan(samCode);
    expect(before.status).toBe(200);
    expect(before.headers.get('content-type')).toContain('text/html');

    const gift = await makeGift();
    expect((await claim(sam, gift.token)).status).toBe(200);

    const after = await scan(samCode);
    expect(after.status).toBe(302);
    expect(after.headers.get('location')).toBe(destination);
    expect((await scan(leeCode)).status).toBe(200);
  });

  test('a link that works once works for one person, and its answer is the same sentence as for a link that never existed', async ({ page }) => {
    const gift = await makeGift({ uses: 1 });
    expect((await claim(person('first'), gift.token)).status).toBe(200);

    await signInViaOAuth(page, '/', person('second'));
    await page.goto(gift.path);
    await page.getByTestId('gift-claim').click();
    await expect(page.getByTestId('gift-invalid')).toBeVisible();
    const usedUp = await page.getByRole('main').innerText();

    await page.goto('/gift?again=1#AAAAAAAAAAAAAAAAAAAAAAAAAAA');
    await page.getByTestId('gift-claim').click();
    await expect(page.getByTestId('gift-invalid')).toBeVisible();
    expect(await page.getByRole('main').innerText()).toBe(usedUp);
  });

  test('revoking in the dashboard stops the link and leaves a plan already claimed alone', async ({ page }) => {
    const gift = await makeGift({ uses: 2, note: `revoke ${unique()}` });
    const early = person('early');
    expect((await claim(early, gift.token)).status).toBe(200);

    await signInViaOAuth(page, '/', ADMIN);
    await page.goto('/dashboard/gifts');
    const row = page.locator(`[data-gift-id="${gift.id}"]`);
    await expect(row).toContainText('1 of 2 claimed');
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByTestId('gift-revoke').click();
    await expect(row.getByTestId('gift-status')).toHaveText('Revoked');
    await expect(row.getByTestId('gift-revoke')).toHaveCount(0);

    expect((await claim(person('late'), gift.token)).status).toBe(404);
    const me = (await (await api(await signInToken(early), '/api/auth/me')).json()) as { user: { plan: string } };
    expect(me.user.plan).toBe('plus');
  });

  test('someone who is not an administrator sees no Admin menu, and the admin routes answer as if they were not there', async ({ page }) => {
    const email = person('plain');
    await signInViaOAuth(page, '/', email);
    await page.goto('/dashboard');
    await expect(page.getByTestId('nav-dashboard')).toBeVisible();
    await expect(page.getByTestId('nav-gifts')).toHaveCount(0);

    await page.goto('/dashboard/gifts');
    await expect(page.getByRole('heading', { name: 'Dynamic links' })).toBeVisible();
    await expect(page.getByTestId('gifts-section')).toHaveCount(0);

    const token = await signInToken(email);
    for (const [method, path] of [['GET', '/api/admin/gifts'], ['POST', '/api/admin/gifts'], ['POST', '/api/admin/gifts/gft-nothing/revoke']] as const) {
      const response = await api(token, path, { method, body: method === 'POST' ? { plan: 'plus', days: 30 } : undefined });
      expect(response.status, `${method} ${path}`).toBe(404);
    }
  });

  test('a second link pasted into the same tab is the one claimed, and the address stays clean', async ({ page }) => {
    const [first, second] = [await makeGift(), await makeGift()];
    await signInViaOAuth(page, '/', person('paste'));
    await page.goto(first.path);
    await expect(page.getByTestId('gift-claim')).toBeVisible();

    // Pasting a link that differs only after the # does not reload the page.
    await page.evaluate((token) => {
      window.location.hash = token;
    }, second.token);
    await expect.poll(() => page.url()).not.toContain('#');
    await page.getByTestId('gift-claim').click();
    await expect(page.getByTestId('gift-result')).toBeVisible();

    const listed = (await (await api(await signInToken(ADMIN), '/api/admin/gifts')).json()) as { gifts: Array<{ id: string; uses: number }> };
    const usesOf = (id: string): number | undefined => listed.gifts.find((gift) => gift.id === id)?.uses;
    expect({ first: usesOf(first.id), second: usesOf(second.id) }).toEqual({ first: 0, second: 1 });
  });

  test('without a gift in the address the page says so and offers the way home', async ({ page }) => {
    await page.goto('/gift');
    await expect(page.getByTestId('gift-incomplete')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to quickqr.app' })).toHaveAttribute('href', '/');
  });

  test('on a phone the claim page and the admin page do not scroll sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const gift = await makeGift();

    await page.goto(gift.path);
    await expect(page.getByRole('heading', { name: 'You have a gift.' })).toBeVisible();
    expect(await sideways(page)).toBeLessThanOrEqual(0);

    await signInViaOAuth(page, '/', ADMIN);
    await page.goto('/dashboard/gifts');
    await expect(page.getByTestId('gifts-section')).toBeVisible();
    await page.getByLabel('Note').fill('a long note so the row has something to wrap: '.repeat(2).trim());
    await page.getByTestId('gift-make').click();
    await expect(page.getByTestId('gift-created')).toBeVisible();
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`the claim page is readable in the ${scheme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const gift = await makeGift();
      await page.goto(gift.path);
      await expect(page.getByRole('heading', { name: 'You have a gift.' })).toBeVisible();

      for (const line of await page.getByRole('main').locator('h1, p, button').all()) {
        expect(await contrastOf(line), `${scheme}: "${(await line.innerText()).slice(0, 40)}"`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
