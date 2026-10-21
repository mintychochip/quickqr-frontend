import { expect, test } from '@playwright/test';
import { signInViaOAuth } from './helpers';

test('creates a dynamic code without leaving the dashboard', async ({ page }) => {
  const title = `Dashboard ${Date.now()}`;

  await signInViaOAuth(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dynamic links' })).toBeVisible();

  await page.getByRole('button', { name: '+ Create code' }).click();
  const panel = page.getByTestId('create-code-panel');
  await expect(panel).toBeVisible();

  await panel.getByLabel('Destination URL').fill('https://example.com/from-dashboard');
  await panel.getByLabel('Title').fill(title);
  await panel.getByTestId('create-code-submit').click();

  await expect(panel.getByTestId('create-code-success')).toBeVisible({ timeout: 15_000 });
  const shortLink = (await panel.getByTestId('qr-encoded-value').textContent()) ?? '';
  expect(shortLink).toMatch(/\/r\/[a-z0-9]+/i);

  await panel.getByRole('button', { name: 'Done' }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.getByText(title, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Create code', exact: true }).click();
  await expect(panel).toBeVisible();
  await page.getByRole('button', { name: 'Back to navigation' }).click();
  await expect(panel).toHaveCount(0);
});

test('opens the create sidebar from the left on a phone', async ({ page }) => {
  await signInViaOAuth(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dynamic links' })).toBeVisible();

  await page.getByRole('button', { name: 'Create code', exact: true }).click();
  const panel = page.getByTestId('create-code-panel');
  await expect(panel).toBeVisible();
  await page.waitForTimeout(300);

  const box = await panel.boundingBox();
  expect(box?.x).toBe(0);
  expect(box?.width).toBeLessThanOrEqual(390);

  await page.getByRole('button', { name: 'Back to navigation' }).click();
  await expect(panel).toHaveCount(0);
});
