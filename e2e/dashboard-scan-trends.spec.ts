import { expect, test } from '@playwright/test';
import { signInViaOAuth } from './helpers';

test('rows show inline scan rates and trend lines', async ({ page }) => {
  await signInViaOAuth(page);
  await page.goto('/dashboard');

  await expect(
    page.getByRole('img', { name: /Scan trend for all dynamic links/i }),
  ).toBeVisible();
  const row = page.getByRole('row', { name: /Autumn Cafe Menu/ });
  await expect(row.getByTestId('scan-rate')).toContainText(/(?:\d+% vs last hour|New this hour)/, {
    timeout: 15_000,
  });
  await expect(row.getByTestId('scan-sparkline')).toBeVisible();
});

test('mobile cards keep inline scan statistics', async ({ page }) => {
  await signInViaOAuth(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');

  const row = page.getByRole('row', { name: /Autumn Cafe Menu/ });
  await row.getByTestId('scan-rate').scrollIntoViewIfNeeded();
  await expect(row.getByTestId('scan-rate')).toContainText(/(?:\d+% vs last hour|New this hour)/, {
    timeout: 15_000,
  });
  await expect(row.getByTestId('scan-sparkline')).toBeVisible();
});

test('wide dashboard opens link details in the left sidebar', async ({ page }) => {
  await signInViaOAuth(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dynamic links' })).toBeVisible();

  const row = page.getByRole('row', { name: /Autumn Cafe Menu/ });
  await row.getByRole('button', { name: 'Show analytics' }).click();

  const detail = page.getByTestId('link-detail-sidebar');
  await expect(detail).toBeVisible();
  await expect(detail.getByText('Autumn Cafe Menu')).toBeVisible();
  await expect(detail.getByTestId('scan-rate')).toContainText(
    /(?:\d+% vs last hour|New this hour)/,
    { timeout: 15_000 },
  );
  await expect(detail.getByTestId('scan-sparkline')).toBeVisible();
  await expect(detail.getByTestId('qr-dropdown')).toBeVisible();
  await expect(detail.getByTestId('analytics-dropdown')).toBeVisible();
  await expect(detail.getByTestId('device-mix-chart')).toBeVisible();
  await expect(page.getByTestId('row-dropdown')).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Workspace overview' })).toBeVisible();

  // The pane width animates; measure once it has settled.
  await page.waitForTimeout(300);
  const detailBox = await detail.boundingBox();
  const mainBox = await page.locator('main').boundingBox();
  expect(detailBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  expect(detailBox!.x).toBeLessThan(mainBox!.x);
  expect(detailBox!.x + detailBox!.width).toBeLessThanOrEqual(mainBox!.x + 1);

  await detail.getByRole('button', { name: 'Close link details' }).click();
  await expect(detail).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Workspace overview' })).toBeVisible();
});

test("one request draws every row's trend, however many links there are", async ({ page }) => {
  // An analytics call per link reads every scan the link has ever had (on D1, billed per row read). One trends call
  // reads only the last six hours, so loading the dashboard must not scale with the number of links or their scans.
  const analytics: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith('/api/') && pathname.includes('analytics')) analytics.push(pathname);
  });
  await signInViaOAuth(page);
  await page.goto('/dashboard');

  const row = page.getByRole('row', { name: /Autumn Cafe Menu/ });
  await expect(row.getByTestId('scan-rate')).toContainText(/(?:\d+% vs last hour|New this hour)/, { timeout: 15_000 });
  await expect(row.getByTestId('scan-sparkline')).toBeVisible();
  expect(analytics).toEqual(['/api/analytics/trends']);
});

test('a person with no dynamic links makes no analytics request at all', async ({ page }) => {
  // With nothing to draw there is nothing to ask for. A trends call here would cost a Function request and a database
  // query on every dashboard load of every new account.
  const analytics: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (pathname.startsWith('/api/') && pathname.includes('analytics')) analytics.push(pathname);
  });
  await signInViaOAuth(page, '/', 'no-links@example.com');
  await page.goto('/dashboard');

  await expect(page.getByText('No dynamic links found.')).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  expect(analytics).toEqual([]);
});

test('selecting a link on a wide screen makes one full analytics call, not two', async ({ page }) => {
  // The sidebar's trend line needs only the last six hours; the analytics panel beside it is the one full per-link call.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInViaOAuth(page);
  await page.goto('/dashboard');
  const row = page.getByRole('row', { name: /Autumn Cafe Menu/ });
  await expect(row.getByTestId('scan-rate')).toContainText(/(?:\d+% vs last hour|New this hour)/, { timeout: 15_000 });

  const perLink: string[] = [];
  page.on('request', (request) => {
    const { pathname } = new URL(request.url());
    if (/^\/api\/links\/[^/]+\/analytics$/.test(pathname)) perLink.push(pathname);
  });
  await row.getByRole('button', { name: 'Show analytics' }).click();
  const detail = page.getByTestId('link-detail-sidebar');
  // The chart draws from the analytics answer, and everything a selection asks for is sent when it mounts, so by now
  // every per-link request has been made. (networkidle would not help: it has usually fired already and returns at once.)
  await expect(detail.getByTestId('device-mix-chart')).toBeVisible();
  await expect(detail.getByTestId('scan-rate')).toContainText(/(?:\d+% vs last hour|New this hour)/, { timeout: 15_000 });
  await expect(detail.getByTestId('scan-sparkline')).toBeVisible();
  expect(perLink).toHaveLength(1);
});
