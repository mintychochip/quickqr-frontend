import { expect, test } from '@playwright/test';
import { signInViaOAuth } from './helpers';

test('dashboard sidebar separates links, menus, and scan', async ({ page }) => {
  await signInViaOAuth(page);
  await page.goto('/');
  await page.getByTestId('dashboard-link').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dynamic links' })).toBeVisible();
  await expect(page.getByTestId('menu-editor')).toHaveCount(0);

  await page.getByTestId('nav-menus').click();
  await expect(page).toHaveURL(/\/dashboard\/menus$/);
  await expect(page.getByRole('heading', { name: 'Menus' })).toBeVisible();
  await expect(page.getByTestId('menus-section')).toBeVisible();

  await page.getByRole('link', { name: 'New menu' }).click();
  await expect(page).toHaveURL(/\/dashboard\/menus\/new$/);
  await expect(page.getByTestId('menu-editor')).toBeVisible();

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dynamic links' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Menus' })).toHaveCount(0);

  await page.getByTestId('nav-pages').click();
  await expect(page).toHaveURL(/\/dashboard\/pages$/);
  await expect(page.getByRole('heading', { name: 'Link pages' })).toBeVisible();

  await page.getByRole('link', { name: 'New link page' }).click();
  await expect(page.getByTestId('link-page-editor')).toBeVisible();

  // Scan lives in the dashboard, not the marketing navbar.
  await expect(page.getByTestId('open-menu-scanner')).toHaveCount(0);
  await page.getByTestId('scan-open').click();
  await expect(page.getByTestId('menu-scanner')).toBeVisible();
});
