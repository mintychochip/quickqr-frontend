import { expect, test } from '@playwright/test';
import { generator, signInViaOAuth } from './helpers';

test('sign in and create dynamic link', async ({ page }) => {
  const destination = 'https://example.com/e2e-dynamic';
  const gen = generator(page);

  await page.goto('/');
  await gen.locator('#destination-url').fill(destination);

  await signInViaOAuth(page);

  await gen.getByTestId('create-dynamic-link').click();
  await expect(gen.getByTestId('dynamic-link-success')).toBeVisible({ timeout: 15_000 });

  await expect(gen.getByTestId('qr-encoded-value')).toContainText('/r/', { ignoreCase: true });

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await gen.getByTestId('copy-qr-share').click();
  const shareLink = await page.evaluate(() => navigator.clipboard.readText());
  expect(shareLink).toContain('/qr?url=');
  expect(decodeURIComponent(shareLink)).toContain('/r/');
});
