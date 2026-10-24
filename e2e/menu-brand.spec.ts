import { expect, test } from '@playwright/test';
import { PRO_USER, signInViaOAuth } from './helpers';

test('a Pro owner can brand a menu, preview it, and clear the brand', async ({ page, browser }) => {
  await page.goto('/');
  await signInViaOAuth(page, '/', PRO_USER);
  const editor = page.getByTestId('menu-editor');
  await page.goto('/dashboard/menus/new');

  await editor.getByTestId('menu-title').fill('Branded Lunch');
  await editor.getByTestId('menu-item-name').nth(0).fill('Soup');
  await editor.getByTestId('menu-item-price').nth(0).fill('6.00');
  await editor.getByTestId('menu-item-name').nth(1).fill('Tea');
  await editor.getByTestId('menu-item-price').nth(1).fill('3.00');
  await editor.getByTestId('menu-preset-reading').click();
  await editor.getByTestId('menu-brand-accent').fill('#ff0000');
  await editor.getByTestId('menu-brand-logo').fill('https://sites.quickqr.app/x/logo.png');

  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/menus') && res.request().method() === 'POST' && res.ok()),
    editor.getByTestId('create-menu').click(),
  ]);
  await expect(editor.getByTestId('menu-success')).toBeVisible();
  const encoded = ((await editor.getByTestId('qr-encoded-value').textContent()) ?? '').trim();
  const code = encoded.match(/\/r\/([a-z0-9]+)$/i)?.[1] ?? '';
  expect(code).not.toBe('');

  const guest = await browser.newContext();
  const menuPage = await guest.newPage();
  try {
    await menuPage.goto(encoded);
    await expect(menuPage.getByTestId('public-menu-title')).toHaveText('Branded Lunch');
    const branded = await menuPage.content();
    expect(branded).toContain('--menu-bg: #0e1a14');
    expect(branded).toContain('--menu-accent: #ff0000');
    expect(branded).toContain('Iowan Old Style');
    expect(branded).toContain('https://sites.quickqr.app/x/logo.png');
    expect(branded).not.toContain('quickqr menu');
    expect(branded).not.toContain('Hosted on quickqr');
  } finally {
    await guest.close();
  }

  // A menu saved without touching Brand keeps the original quickqr page.
  await page.goto('/dashboard/menus/new');
  await editor.getByTestId('menu-title').fill('Plain Lunch');
  await editor.getByTestId('menu-item-name').nth(0).fill('Soup');
  await editor.getByTestId('menu-item-price').nth(0).fill('6.00');
  await editor.getByTestId('menu-item-name').nth(1).fill('Tea');
  await editor.getByTestId('menu-item-price').nth(1).fill('3.00');
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/menus') && res.request().method() === 'POST' && res.ok()),
    editor.getByTestId('create-menu').click(),
  ]);
  await expect(editor.getByTestId('menu-success')).toBeVisible();
  const plainUrl = ((await editor.getByTestId('qr-encoded-value').textContent()) ?? '').trim();
  const plain = await page.request.get(plainUrl);
  const plainBody = await plain.text();
  expect(plainBody).toContain('quickqr menu');
  expect(plainBody).toContain('Hosted on quickqr');

  // Clear the brand and save: the quickqr chrome returns.
  await page.goto(`/dashboard/menus/${code}`);
  await expect(editor.getByTestId('menu-brand')).toBeVisible();
  await editor.getByTestId('menu-brand-clear').click();
  await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/menus') && res.request().method() === 'PUT' && res.ok()),
    editor.getByTestId('save-menu').click(),
  ]);
  const cleared = await page.request.get(encoded);
  const clearedBody = await cleared.text();
  expect(clearedBody).toContain('quickqr menu');
  expect(clearedBody).toContain('Hosted on quickqr');
  expect(clearedBody).not.toContain('--menu-bg');

  // A javascript: logo is rejected in the field and blocks the save.
  await page.goto(`/dashboard/menus/${code}`);
  await editor.getByTestId('menu-brand-logo').fill('javascript:alert(1)');
  await expect(editor.getByTestId('menu-brand-logo-error')).toBeVisible();
  await editor.getByTestId('save-menu').click();
  await expect(editor.getByTestId('menu-error')).toContainText('https://');
});
