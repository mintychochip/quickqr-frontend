import { expect, test } from '@playwright/test';
import { dynamicQrValue } from '../src/lib/dynamicQr';
import { signInViaOAuth } from './helpers';

test('hosted link page keeps its code while the link list changes', async ({ page, browser }) => {
  await page.goto('/');
  await signInViaOAuth(page);
  const editor = page.getByTestId('link-page-editor');
  await page.goto('/dashboard/pages/new');

  await editor.getByTestId('page-title').fill('Harbor Lunch');
  await editor.getByTestId('page-link-name').nth(0).fill('Order online');
  await editor.getByTestId('page-link-url').nth(0).fill('https://example.com/order');
  await editor.getByTestId('page-link-name').nth(1).fill('Call us');
  await editor.getByTestId('page-link-url').nth(1).fill('https://example.com/call');

  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/api/pages') && res.request().method() === 'POST' && res.ok(),
    ),
    editor.getByTestId('create-page').click(),
  ]);
  await expect(editor.getByTestId('page-success')).toBeVisible();

  const encoded = ((await editor.getByTestId('qr-encoded-value').textContent()) ?? '').trim();
  expect(encoded).toMatch(/^https?:\/\/.+\/r\/[a-z0-9]+$/i);
  const code = encoded.match(/\/r\/([a-z0-9]+)$/i)?.[1] ?? '';
  const compressed = dynamicQrValue(new URL(encoded).origin, code);

  const guest = await browser.newContext();
  const pageView = await guest.newPage();
  try {
    await pageView.goto(encoded);
    await expect(pageView.getByTestId('public-page-title')).toHaveText('Harbor Lunch');
    await expect(pageView.getByTestId('public-page-link-name').nth(0)).toHaveText('Order online');
    await expect(pageView.getByTestId('public-page-link-url').nth(0)).toHaveAttribute(
      'href',
      'https://example.com/order',
    );
    await expect(pageView.getByTestId('public-page-link-name').nth(1)).toHaveText('Call us');

    await editor.getByTestId('page-link-url').nth(1).fill('https://example.com/reserve');

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/pages') && res.request().method() === 'PUT' && res.ok(),
      ),
      editor.getByTestId('save-page').click(),
    ]);

    await expect(editor.getByTestId('qr-encoded-value')).toHaveText(encoded);

    const plain = await page.request.get(encoded);
    expect(await plain.text()).toContain('https://example.com/reserve');
    const hot = await page.request.get(new URL(compressed).href);
    expect(await hot.text()).toContain('https://example.com/reserve');

    await pageView.reload();
    await expect(pageView.getByTestId('public-page-link-name').nth(1)).toHaveText('Call us');
    await expect(pageView.getByTestId('public-page-link-url').nth(1)).toHaveAttribute(
      'href',
      'https://example.com/reserve',
    );
    await expect(page).toHaveURL(/\/dashboard\/pages\/new$/);
  } finally {
    await guest.close();
  }
});
