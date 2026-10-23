import { expect, test } from '@playwright/test';

test('the dashboard demo plays by itself when it is scrolled to, and repeats', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  // Nothing is drawn before it is on screen: no pointer, no link.
  await expect(page.locator('.demo-pointer')).toHaveCount(0);
  await expect(page.getByTestId('demo-row')).toHaveCount(0);

  await page.getByTestId('dashboard-preview').scrollIntoViewIfNeeded();
  await expect(page.locator('.demo-pointer')).toHaveCount(1);

  // The pointer travels, then drives a real create: the row lands, the scans climb, the destination is edited.
  const parked = await page.locator('.demo-pointer').evaluate((el) => el.style.transform);
  await expect.poll(() => page.locator('.demo-pointer').evaluate((el) => el.style.transform), { timeout: 6_000 }).not.toBe(parked);
  await expect(page.getByTestId('demo-row')).toHaveCount(1, { timeout: 10_000 });
  await expect(page.getByTestId('demo-scans')).toHaveText('128', { timeout: 10_000 });
  await expect(page.getByTestId('demo-destination')).toHaveText('cafe.example.com/summer-menu', { timeout: 16_000 });

  // Then it starts over: the pass clears the row and runs again.
  await expect(page.getByTestId('demo-row')).toHaveCount(0, { timeout: 20_000 });
});

test('a visitor can drive the demo by hand', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const section = page.getByTestId('dashboard-preview');
  await section.scrollIntoViewIfNeeded();

  // Typing takes the wheel: the pointer and its script stop.
  await page.getByLabel('Destination URL in the demo').fill('cafe.example.com/autumn-menu');
  await expect(page.locator('.demo-pointer')).toHaveCount(0);

  await section.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByTestId('demo-row')).toHaveCount(1);
  await expect(page.getByTestId('demo-destination')).toHaveText('cafe.example.com/autumn-menu');
  await expect(page.getByTestId('demo-scans')).toHaveText('0');

  // The printed code keeps its slug while the destination changes under it.
  await page.getByLabel('Edit destination URL').click();
  await page.getByLabel('Edit destination URL').fill('cafe.example.com/winter-menu');
  await page.getByLabel('Save destination').click();
  await expect(page.getByTestId('demo-destination')).toHaveText('cafe.example.com/winter-menu');
  await expect(section.getByText('/r/autumn-menu')).toBeVisible();

  // The code it makes is real, and the row can be thrown away.
  await page.getByTestId('demo-show-qr').click();
  await expect(page.getByTestId('demo-qr-panel')).toBeVisible();
  await expect(page.getByTestId('demo-qr-panel').locator('canvas')).toBeVisible();
  await page.getByLabel('More actions').click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByTestId('demo-row')).toHaveCount(0);
  await expect(page.getByText('No dynamic links found.')).toBeVisible();
});

test('reduced motion shows one finished link and no pointer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  await expect(page.getByTestId('demo-row')).toHaveCount(1);
  await expect(page.getByTestId('demo-scans')).toHaveText('128');
  await expect(page.getByTestId('demo-destination')).toHaveText('cafe.example.com/summer-menu');
  await expect(page.getByTestId('demo-total-scans')).toHaveText('128');
  await expect(page.locator('.demo-pointer')).toHaveCount(0);
});

test('the demo fits a phone width without a sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const section = page.getByTestId('dashboard-preview');
  await expect(section.locator('aside')).toBeHidden();

  // The mono destination and the scans column stay inside the card, and nothing widens the page.
  const card = await section.locator('[data-slot="card"]').first().boundingBox();
  const row = await page.getByTestId('demo-row').boundingBox();
  expect(card).not.toBeNull();
  expect(row).not.toBeNull();
  expect(row!.x + row!.width).toBeLessThanOrEqual(card!.x + card!.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
