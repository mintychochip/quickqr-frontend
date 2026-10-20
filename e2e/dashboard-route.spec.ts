import { expect, test } from '@playwright/test';
import { signInViaOAuth } from './helpers';

test('dashboard is its own page', async ({ page }) => {
  await signInViaOAuth(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Dynamic QR codes/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dynamic links' })).toHaveCount(0);

  await page.getByTestId('dashboard-link').click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dynamic links' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Dynamic QR codes/i })).toHaveCount(0);

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dynamic links' })).toBeVisible();

  await page.getByRole('button', { name: '+ Create code' }).click();
  await expect(page.getByTestId('create-code-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Back to navigation' }).click();
  await expect(page.getByTestId('create-code-panel')).toHaveCount(0);
});
