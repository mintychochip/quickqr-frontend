import type { Locator, Page } from '@playwright/test';

export function generator(page: Page): Locator {
  return page.locator('#generator');
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
