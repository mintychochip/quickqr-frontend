import { expect, test } from '@playwright/test';
import { signInViaOAuth } from './helpers';

test('scanning the menu QR opens that menu', async ({ page }) => {
  await page.goto('/');
  await signInViaOAuth(page);
  const editor = page.getByTestId('menu-editor');
  await page.goto('/dashboard/menus/new');

  await editor.getByTestId('menu-title').fill('Harbor Lunch');
  await editor.getByTestId('menu-item-name').nth(0).fill('Tomato Soup');
  await editor.getByTestId('menu-item-price').nth(0).fill('6.00');
  await editor.getByTestId('menu-item-name').nth(1).fill('Grilled Cheese');
  await editor.getByTestId('menu-item-price').nth(1).fill('9.50');

  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/api/menus') && res.request().method() === 'POST' && res.ok(),
    ),
    editor.getByTestId('create-menu').click(),
  ]);
  await expect(editor.getByTestId('qr-encoded-value')).toContainText('/r/', { ignoreCase: true });

  await editor.getByTestId('scan-menu').click();

  await expect(page.getByTestId('public-menu-title')).toHaveText('Harbor Lunch');
  await expect(page.getByText('Tomato Soup')).toBeVisible();
  await expect(page.getByText('6.00')).toBeVisible();
  await expect(page.getByText('Grilled Cheese')).toBeVisible();
  await expect(page.getByText('9.50')).toBeVisible();
  await expect(page).toHaveURL(/\/r\/[a-z0-9]+$/);
});
