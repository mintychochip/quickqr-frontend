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

/** Sign in via the OAuth dev stand-in provider, as the fixture user unless another email is given. */
export async function signInViaOAuth(page: Page, returnTo = '/', email = 'ada@example.com'): Promise<void> {
  const base = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5186');
  const target = new URL(returnTo, base);

  const start = new URL('/api/auth/oauth/dev/start', base);
  start.searchParams.set('as', 'google');
  start.searchParams.set('return_to', target.toString());

  await page.goto(start.toString());
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL((url) => url.pathname === target.pathname, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Log out' }).waitFor({ state: 'visible', timeout: 15_000 });
}

/**
 * With real Google credentials configured, "Continue with Google" goes to Google. Send that request to the local
 * stand-in instead, so a spec does not depend on which providers a developer has set up. Without credentials the app
 * already goes straight to the stand-in and this route never fires.
 */
export async function routeGoogleToStandIn(page: Page): Promise<void> {
  await page.route(/\/api\/auth\/oauth\/google\/start(\?|$)/, (route) => {
    const from = new URL(route.request().url());
    const standIn = new URL('/api/auth/oauth/dev/start', from.origin);
    standIn.searchParams.set('as', 'google');
    standIn.searchParams.set('return_to', from.searchParams.get('return_to') ?? new URL('/', from.origin).toString());
    return route.fulfill({ status: 302, headers: { location: standIn.toString() } });
  });
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

/** WCAG contrast of an element's text over whatever is actually painted behind it. */
export async function contrastOf(el: Locator): Promise<number> {
  return el.evaluate((node) => {
    type Rgba = [number, number, number, number];
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const ctx = probe.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2d canvas is unavailable');

    // Painting resolves any CSS colour (oklch, color-mix, ...) to plain sRGB.
    const paint = (css: string): Rgba => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (top: Rgba, below: Rgba): Rgba => {
      const a = top[3];
      return [
        top[0] * a + below[0] * (1 - a),
        top[1] * a + below[1] * (1 - a),
        top[2] * a + below[2] * (1 - a),
        1,
      ];
    };
    const luminance = ([r, g, b]: Rgba): number => {
      const lin = (c: number) => {
        const s = c / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };

    const chain: Element[] = [];
    for (let n: Element | null = node; n; n = n.parentElement) chain.push(n);
    let backdrop: Rgba = [255, 255, 255, 1];
    for (const n of chain.reverse()) {
      backdrop = over(paint(getComputedStyle(n).backgroundColor), backdrop);
    }
    const text = over(paint(getComputedStyle(node).color), backdrop);
    const [hi = 0, lo = 0] = [luminance(text), luminance(backdrop)].sort((a, b) => b - a);
    return (hi + 0.05) / (lo + 0.05);
  });
}
