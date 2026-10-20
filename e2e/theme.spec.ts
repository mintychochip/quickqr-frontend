import { expect, test } from '@playwright/test';

test('follows the system color scheme by default', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(true);

  const dark = await page.evaluate(() => ({
    scheme: getComputedStyle(document.documentElement).colorScheme,
    background: getComputedStyle(document.body).backgroundColor,
  }));
  expect(dark.scheme).toBe('dark');
  expect(dark.background).toBe('rgb(11, 11, 13)');

  await page.emulateMedia({ colorScheme: 'light' });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(false);
});

test('lets the visitor override the system theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');

  await page.getByRole('button', { name: 'Theme: System' }).click();
  await page.getByRole('menuitem', { name: 'Dark' }).click();

  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(true);
  await expect(page.getByRole('button', { name: 'Theme: Dark' })).toBeVisible();

  await page.reload();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(true);

  await page.getByRole('button', { name: 'Theme: Dark' }).click();
  await page.getByRole('menuitem', { name: 'System' }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(false);
  await expect(page.getByRole('button', { name: 'Theme: System' })).toBeVisible();
});

test('applies a theme deep link and remembers it', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/?theme=dark');

  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(true);
  expect(new URL(page.url()).searchParams.has('theme')).toBe(false);
  await expect(page.getByRole('button', { name: 'Theme: Dark' })).toBeVisible();

  await page.reload();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(true);
});
