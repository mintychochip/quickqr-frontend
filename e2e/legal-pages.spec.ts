import { expect, test } from '@playwright/test';

test('the footer opens Privacy and Terms as full pages', async ({ page }) => {
  await page.goto('/');
  await page.locator('footer').getByRole('link', { name: 'Privacy', exact: true }).first().click();
  await expect(page).toHaveURL(/\/privacy$/);

  const privacy = page.getByTestId('legal-page');
  await expect(privacy.getByRole('heading', { level: 1 })).toHaveText('Privacy Policy');
  await expect(page).toHaveTitle('Privacy Policy · quickqr.app');
  await expect(privacy.getByRole('heading', { name: 'What a scan records' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goto('/');
  await page.locator('footer').getByRole('link', { name: 'Terms', exact: true }).first().click();
  await expect(page).toHaveURL(/\/terms$/);

  const terms = page.getByTestId('legal-page');
  await expect(terms.getByRole('heading', { level: 1 })).toHaveText('Terms of Service');
  await expect(page).toHaveTitle('Terms of Service · quickqr.app');
  await expect(terms.getByRole('heading', { name: 'No subscription expiration' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the legal pages open directly and fit a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const [path, title] of [
    ['/privacy', 'Privacy Policy'],
    ['/terms', 'Terms of Service'],
  ] as const) {
    await page.goto(path);
    const legal = page.getByTestId('legal-page');
    await expect(legal.getByRole('heading', { level: 1 })).toHaveText(title);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
});

test('the ads disclosure stays a footer dialog', async ({ page }) => {
  await page.goto('/');
  await page.locator('footer').getByRole('button', { name: 'Ads', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Ad-subsidy disclosure' })).toBeVisible();
});
