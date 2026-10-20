import { expect, test } from '@playwright/test';
import { generator } from './helpers';

test('style preset updates summary and canvas', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const bar = page.getByTestId('style-bar');

  await expect(bar).toBeVisible();
  await gen.getByTestId('style-preset-print_safe').click();
  await expect(gen.getByText('High-contrast print preset')).toBeVisible();
  await expect(gen.getByTestId('qr-canvas')).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 640));
  await expect
    .poll(async () => bar.evaluate((el) => Number(getComputedStyle(el).opacity)))
    .toBeLessThan(0.05);
});

test('style prompt apply shows engine label', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  await gen.getByRole('textbox', { name: 'QR style prompt' }).fill('print safe');
  await gen.getByRole('button', { name: 'Apply' }).click();
  await expect(gen.getByText(/Applied \(.*\):/)).toBeVisible({ timeout: 8_000 });
});
