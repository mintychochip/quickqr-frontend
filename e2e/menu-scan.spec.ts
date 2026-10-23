import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { dynamicQrValue } from '../src/lib/dynamicQr';
import { PRO_USER, signInViaOAuth } from './helpers';

function menuExcerpt(body: string): string {
  const match = body.match(/<main[\s\S]*<\/main>/);
  return match?.[0] ?? body;
}

test('hosted menu QR stays stable while the public menu changes', async ({ page, browser, request }) => {
  await page.goto('/');
  await signInViaOAuth(page, '/', PRO_USER);
  const editor = page.getByTestId('menu-editor');
  await page.goto('/dashboard/menus/new');

  await editor.getByTestId('menu-title').fill('Harbor Lunch');
  const names = editor.getByTestId('menu-item-name');
  const prices = editor.getByTestId('menu-item-price');
  await names.nth(0).fill('Tomato Soup');
  await prices.nth(0).fill('6.00');
  await names.nth(1).fill('Grilled Cheese');
  await prices.nth(1).fill('9.50');

  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/api/menus') && res.request().method() === 'POST' && res.ok(),
    ),
    editor.getByTestId('create-menu').click(),
  ]);
  await expect(editor.getByTestId('menu-success')).toBeVisible();

  const encoded = ((await editor.getByTestId('qr-encoded-value').textContent()) ?? '').trim();
  expect(encoded).toMatch(/^https?:\/\/.+\/r\/[a-z0-9]+$/i);
  const code = encoded.match(/\/r\/([a-z0-9]+)$/i)?.[1] ?? '';
  const compressed = dynamicQrValue(new URL(encoded).origin, code);
  expect(compressed).not.toBe(encoded);

  const guest = await browser.newContext();
  const menuPage = await guest.newPage();
  try {
    await menuPage.goto(encoded);
    await expect(menuPage.getByTestId('public-menu-title')).toHaveText('Harbor Lunch');
    await expect(menuPage.getByText('Tomato Soup')).toBeVisible();
    await expect(menuPage.getByText('6.00')).toBeVisible();
    await expect(menuPage.getByText('Grilled Cheese')).toBeVisible();
    await expect(menuPage.getByText('9.50')).toBeVisible();

    await prices.nth(1).fill('11.00');
    await editor.getByTestId('menu-add-item').click();
    await names.nth(2).fill('Iced Tea');
    await prices.nth(2).fill('3.25');

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/menus') && res.request().method() === 'PUT' && res.ok(),
      ),
      editor.getByTestId('save-menu').click(),
    ]);

    await expect(editor.getByTestId('qr-encoded-value')).toHaveText(encoded);

    const first = await request.get(encoded);
    const second = await request.get(new URL(compressed).href);
    const body1 = await first.text();
    const body2 = await second.text();

    for (const body of [body1, body2]) {
      expect(body).toContain('Harbor Lunch');
      expect(body).toContain('Tomato Soup');
      expect(body).toContain('6.00');
      expect(body).toContain('Grilled Cheese');
      expect(body).toContain('11.00');
      expect(body).toContain('Iced Tea');
      expect(body).toContain('3.25');
    }

    const httpLog = process.env.MENU_SCAN_HTTP_LOG;
    if (httpLog) {
      const log = `${httpLog}.1`;
      fs.writeFileSync(log, body1);
      console.log(`MENU_HTTP_1 ${encoded}\n${menuExcerpt(body1)}`);
      console.log(`MENU_HTTP_2 ${encoded}\n${menuExcerpt(body2)}`);
    }

    await menuPage.reload();
    await expect(menuPage.getByTestId('public-menu-title')).toHaveText('Harbor Lunch');
    await expect(menuPage.getByText('Grilled Cheese')).toBeVisible();
    await expect(menuPage.getByText('11.00')).toBeVisible();
    await expect(menuPage.getByText('Iced Tea')).toBeVisible();
    await expect(menuPage.getByText('3.25')).toBeVisible();
    await expect(menuPage.getByText('Tomato Soup')).toBeVisible();
    await expect(menuPage.getByText('9.50')).toHaveCount(0);

    const shot = process.env.MENU_SCAN_SHOT;
    if (shot) {
      await menuPage.screenshot({ path: shot, fullPage: true });
    }
  } finally {
    await guest.close();
  }
});
