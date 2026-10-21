import jsQR from 'jsqr';
import type { Locator, Page } from '@playwright/test';

export function generator(page: Page): Locator {
  return page.locator('#generator');
}

/** Open the studio's type menu and pick one. The menu is a portal, so it is found on the page rather than inside the studio. */
export async function chooseType(gen: Locator, name: string): Promise<void> {
  await gen.getByTestId('type-menu').click();
  await gen.page().getByRole('menuitemradio', { name, exact: true }).click();
}

/** Read the code the way a phone would: decode the pixels on screen. */
export async function decodedCode(card: Locator): Promise<string | null> {
  const { data, width, height } = await card.getByTestId('qr-canvas').evaluate((el) => {
    const canvas = el as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2d canvas is unavailable');
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { data: Array.from(image.data), width: image.width, height: image.height };
  });
  return jsQR(new Uint8ClampedArray(data), width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}

/** Sign in via the OAuth dev stand-in provider. */
export async function signInViaOAuth(page: Page, returnTo = '/'): Promise<void> {
  const base = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5186');
  const target = new URL(returnTo, base);

  const start = new URL('/api/auth/oauth/dev/start', base);
  start.searchParams.set('as', 'google');
  start.searchParams.set('return_to', target.toString());

  await page.goto(start.toString());
  await page.getByRole('textbox', { name: 'Email' }).fill('ada@example.com');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL((url) => url.pathname === target.pathname, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Log out' }).waitFor({ state: 'visible', timeout: 15_000 });
}

/** Authenticate through the OAuth dev stand-in and return the API token. */
export async function signInToken(email = 'ada@example.com'): Promise<string> {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5186';
  const start = new URL('/api/auth/oauth/dev/start', base);
  start.searchParams.set('as', 'google');
  start.searchParams.set('return_to', new URL('/', base).toString());
  const startRes = await fetch(start.toString(), { redirect: 'manual' });
  const consentLocation = startRes.headers.get('location');
  if (!consentLocation) {
    throw new Error('no redirect from oauth dev start');
  }
  const state = new URL(consentLocation, base).searchParams.get('state');
  if (!state) {
    throw new Error('no state in consent URL');
  }
  const consent = new URL('/api/auth/oauth/dev/consent', base);
  consent.searchParams.set('state', state);
  const consentRes = await fetch(consent.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email }).toString(),
    redirect: 'manual',
  });
  const finalLocation = consentRes.headers.get('location');
  const token = finalLocation
    ? new URL(finalLocation, base).searchParams.get('auth_token')
    : null;
  if (!token) {
    throw new Error('no auth_token in dev consent redirect');
  }
  return token;
}
