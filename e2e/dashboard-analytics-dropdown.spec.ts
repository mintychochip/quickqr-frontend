import { expect, test, type Locator, type Page } from '@playwright/test';
import { signInViaOAuth } from './helpers';

async function openCafeAnalytics(page: Page) {
  const row = page.getByRole('row', { name: /Autumn Cafe Menu/ });
  await row.getByRole('button', { name: 'Show analytics' }).click();
  const dropdown = page.getByTestId('analytics-dropdown');
  await expect(dropdown).toBeVisible();
  await expect(dropdown.getByTestId('device-mix-chart')).toBeVisible();
  return { row, dropdown };
}

/** Each hour under the scan chart is read on its own, so the six labels must not run together. */
async function expectHourLabelsApart(chart: Locator) {
  const labels = chart.getByTestId('scan-volume-hour');
  await expect(labels).toHaveCount(6);
  const edges = await labels.evaluateAll((els) =>
    els.map((el) => {
      const { left, right } = el.getBoundingClientRect();
      return { left, right };
    }),
  );
  const gaps = edges.slice(1).map((edge, i) => edge.left - (edges[i]?.right ?? 0));
  expect(Math.min(...gaps)).toBeGreaterThanOrEqual(4);
}

test('dashboard analytics drops open under the whole row', async ({ page }) => {
  await signInViaOAuth(page);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dynamic links' })).toBeVisible();

  const { row, dropdown } = await openCafeAnalytics(page);
  await expect(dropdown.getByText('Device mix')).toBeVisible();
  await expect(dropdown.getByText('Referrers')).toBeVisible();
  await expect(dropdown.getByText('Scan volume')).toBeVisible();
  await expect(dropdown.getByText('Recent scans')).toBeVisible();
  await expectHourLabelsApart(dropdown.getByTestId('scan-volume-chart'));
  await expect(page.locator('.fixed.inset-0')).toHaveCount(0);

  const rowDropdown = page.getByTestId('row-dropdown');
  await expect(rowDropdown.getByRole('button', { name: 'Settings' })).toHaveCount(0);
  await expect(rowDropdown.getByRole('button', { name: 'QR code' })).toHaveCount(0);
  await expect(row.getByTestId('qr-canvas')).toBeVisible();
  const rowBox = await row.boundingBox();
  const dropBox = await rowDropdown.boundingBox();
  const tableBox = await page.locator('table').boundingBox();
  expect(rowBox).not.toBeNull();
  expect(dropBox).not.toBeNull();
  expect(tableBox).not.toBeNull();
  expect(dropBox!.width).toBeGreaterThan(tableBox!.width * 0.9);
  expect(Math.abs(dropBox!.x - tableBox!.x)).toBeLessThan(3);
  expect(dropBox!.y).toBeGreaterThanOrEqual(rowBox!.y + rowBox!.height - 2);

  await page.keyboard.press('Escape');
  await expect(dropdown).toHaveCount(0);

  await row.getByRole('button', { name: 'Show analytics' }).click();
  await expect(dropdown.getByTestId('device-mix-chart')).toBeVisible();
  await page.getByRole('heading', { name: 'Dynamic links' }).click();
  await expect(dropdown.getByTestId('device-mix-chart')).toBeVisible();
  await row.getByRole('button', { name: 'Show analytics' }).click();
  await expect(dropdown.getByTestId('device-mix-chart')).toHaveCount(0);
  await expect(page.getByRole('row', { name: /Autumn Cafe Menu/ }).getByTestId('qr-canvas')).toBeVisible();
});

test('opening another row closes the expanded analytics', async ({ page }) => {
  await signInViaOAuth(page);
  await page.goto('/dashboard');
  await openCafeAnalytics(page);
  const techRow = page.getByRole('row', { name: /TechCon/ });
  await techRow.getByRole('button', { name: 'Show analytics' }).click();
  await expect(page.getByTestId('analytics-dropdown')).toHaveCount(1);
  await expect(techRow.locator('xpath=following-sibling::tr[1]').getByTestId('analytics-dropdown')).toBeVisible();
});

test('dashboard analytics row stays on a phone screen', async ({ page }) => {
  await signInViaOAuth(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');
  const { dropdown } = await openCafeAnalytics(page);
  const rowDropdown = page.getByTestId('row-dropdown');
  const box = await rowDropdown.boundingBox();
  const mix = await dropdown.getByTestId('device-mix-chart').boundingBox();
  const chart = await dropdown.getByTestId('scan-volume-chart').boundingBox();
  await expectHourLabelsApart(dropdown.getByTestId('scan-volume-chart'));
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(mix).not.toBeNull();
  expect(chart).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(mix!.x).toBeGreaterThanOrEqual(-1);
  expect(mix!.x + mix!.width).toBeLessThanOrEqual(viewport!.width + 1);
  expect(chart!.x).toBeGreaterThanOrEqual(-1);
  expect(chart!.x + chart!.width).toBeLessThanOrEqual(viewport!.width + 1);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('analytics-dropdown')).toHaveCount(0);
});
