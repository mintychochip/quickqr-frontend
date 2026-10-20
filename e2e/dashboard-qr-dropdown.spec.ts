import { expect, test, type Page } from '@playwright/test';
import { signInViaOAuth } from './helpers';

async function expectInlineQrInsideViewport(page: Page) {
  const row = page.getByRole('row', { name: /Autumn Cafe Menu/ });
  const canvas = row.getByTestId('qr-canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  const rowBox = await row.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(rowBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(56);
  expect(rowBox!.height).toBeGreaterThan(box!.height);
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 1);
}

test('dashboard QR opens inside the row dropdown', async ({ page }) => {
  await signInViaOAuth(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dynamic links' })).toBeVisible();

  const row = page.getByRole('row', { name: /Autumn Cafe Menu/ });
  await expect(row.getByTestId('qr-canvas')).toBeVisible();
  await row.getByRole('button', { name: 'Show QR Code' }).click();

  const rowDropdown = page.getByTestId('row-dropdown');
  await expect(rowDropdown.getByRole('button', { name: 'Settings' })).toHaveCount(0);
  await expect(rowDropdown.getByRole('button', { name: 'QR code' })).toHaveCount(0);
  await expect(rowDropdown.getByTestId('qr-canvas')).toHaveCount(0);
  await expect(rowDropdown.getByTestId('qr-settings')).toBeVisible();
  await expect(rowDropdown.getByRole('button', { name: 'Statistics' })).toBeVisible();
  await expectInlineQrInsideViewport(page);
  await expect(page.locator('.fixed.inset-0')).toHaveCount(0);

  await page.getByRole('heading', { name: 'Dynamic links' }).click();
  await expect(row.getByTestId('qr-canvas')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('row-dropdown')).toHaveCount(0);
});

test('dashboard QR dropdown stays on a phone screen', async ({ page }) => {
  await signInViaOAuth(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  const row = page.getByRole('row', { name: /Autumn Cafe Menu/ });
  await row.getByRole('button', { name: 'Show QR Code' }).scrollIntoViewIfNeeded();
  await row.getByRole('button', { name: 'Show QR Code' }).click();
  await expectInlineQrInsideViewport(page);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('row-dropdown')).toHaveCount(0);
});
