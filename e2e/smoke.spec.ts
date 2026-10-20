import { expect, test } from '@playwright/test';
import { generator } from './helpers';

test.describe('smoke', () => {
  test('home loads generator and QR preview', async ({ page }) => {
    await page.goto('/');
    const gen = generator(page);
    await expect(page.getByRole('heading', { name: /Dynamic QR codes/i })).toBeVisible();
    await expect(gen).toBeVisible();
    await expect(gen.getByTestId('qr-canvas')).toBeVisible();
    await expect(gen.getByTestId('qr-encoded-value')).not.toHaveText('');
  });

  test('backend health via dev proxy', async ({ request }) => {
    const res = await request.get('/api/qr/style-parser');
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { default_engine?: string };
    expect(body.default_engine).toBeDefined();
  });
});
