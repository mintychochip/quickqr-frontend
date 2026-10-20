import { expect, test } from '@playwright/test';
import { generator } from './helpers';

test('static mode shows the compressed URL in preview', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const host = new URL(page.url()).host.toUpperCase();

  await gen.getByRole('tab', { name: 'Static', exact: true }).click();
  await expect(gen.getByTestId('static-compressed-url')).toBeVisible();

  const compressed = gen.getByTestId('static-compressed-url');
  await expect(compressed).not.toHaveText('—', { timeout: 8_000 });
  await expect(compressed).toContainText(`HTTP://${host}/`);
  await expect(compressed).not.toContainText('HA.MR');

  await expect(gen.getByTestId('qr-encoded-value')).toContainText(`HTTP://${host}/`);
});

test('static code resolves to its destination on this origin', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const host = new URL(page.url()).host;

  await gen.getByRole('tab', { name: 'Static', exact: true }).click();
  await gen.locator('#static-url').fill(`http://${host}/?static-destination=1`);

  const compressed = gen.getByTestId('static-compressed-url');
  await expect(compressed).toContainText(`HTTP://${host.toUpperCase()}/`);
  const href = ((await compressed.textContent()) ?? '').trim();

  await page.goto(href);
  await expect(page).toHaveURL(/static-destination=1/);
});
