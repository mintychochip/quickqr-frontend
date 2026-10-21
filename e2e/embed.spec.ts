import { expect, test } from '@playwright/test';

const target = 'https://example.com/embed-test?table=4';

test('share page renders a QR for any link', async ({ page }) => {
  await page.goto(`/qr?url=${encodeURIComponent(target)}`);

  await expect(page).toHaveTitle(/QR code for example\.com/i);
  await expect(page.getByRole('heading', { name: /QR code for example\.com/i })).toBeVisible();
  await expect(page.getByTestId('embed-target')).toContainText(target);
  await expect(page.getByTestId('embed-qr').locator('svg')).toBeVisible();
  await expect(page.getByTestId('embed-copy-iframe')).toBeVisible();
  await expect(page.getByTestId('embed-copy-image')).toBeVisible();
});

test('share page draws its code in plain black on white, with no logo', async ({ page }) => {
  await page.goto(`/qr?url=${encodeURIComponent(target)}`);
  const svg = page.getByTestId('embed-qr').locator('svg');
  await expect(svg).toBeVisible();

  const fills = await svg.evaluate((root) =>
    Array.from(root.querySelectorAll('[fill]'), (el) => el.getAttribute('fill') ?? ''),
  );
  expect(fills.length).toBeGreaterThan(0);
  for (const fill of fills) {
    expect(fill, 'a hex colour').toMatch(/^#[0-9a-f]{6}$/i);
    const [r = 0, g = 0, b = 0] = [1, 3, 5].map((at) => parseInt(fill.slice(at, at + 2), 16));
    expect(Math.max(r, g, b) - Math.min(r, g, b), `${fill} is grey`).toBeLessThan(16);
  }
  await expect(svg.locator('image')).toHaveCount(0);
});

test('share page turns a pasted link into a QR', async ({ page }) => {
  await page.goto('/qr');
  await page.getByLabel('Link').fill('example.com/menu');
  await page.getByRole('button', { name: 'Show QR' }).click();

  await expect(page).toHaveURL(/\/qr\?url=https%3A%2F%2Fexample\.com%2Fmenu/);
  await expect(page.getByTestId('embed-qr').locator('svg')).toBeVisible();
  await expect(page.getByTestId('embed-target')).toContainText('https://example.com/menu');
});

test('share page rejects unsafe links', async ({ page }) => {
  await page.goto(`/qr?url=${encodeURIComponent('javascript:alert(1)')}`);

  await expect(page.getByTestId('embed-error')).toBeVisible();
  await expect(page.getByTestId('embed-qr')).toHaveCount(0);
});

test('embed mode is QR-only and edge-to-edge', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 360 });
  await page.goto(`/qr?url=${encodeURIComponent(target)}&embed=1`);

  await expect(page.getByTestId('embed-qr').locator('svg')).toBeVisible();
  await expect(page.getByTestId('embed-form')).toHaveCount(0);
  await expect(page.getByTestId('embed-copy-iframe')).toHaveCount(0);
  await expect(page.getByTestId('embed-copy-image')).toHaveCount(0);

  const box = await page.getByTestId('embed-qr').boundingBox();
  expect(box).toEqual({ x: 0, y: 0, width: 360, height: 360 });
});

test('copy actions provide embed snippets', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`/qr?url=${encodeURIComponent(target)}`);

  await page.getByTestId('embed-copy-iframe').click();
  const iframe = await page.evaluate(() => navigator.clipboard.readText());
  expect(iframe).toContain('<iframe');
  expect(iframe).toContain('embed=1');
  expect(iframe).toContain('height="360"');

  await page.getByTestId('embed-copy-image').click();
  const image = await page.evaluate(() => navigator.clipboard.readText());
  expect(image).toContain('<img');
  expect(image).toContain('/qr.png?url=');
  expect(image).toContain('width="320"');

  await page.getByRole('button', { name: 'Copy SVG URL' }).click();
  const svg = await page.evaluate(() => navigator.clipboard.readText());
  expect(svg).toContain('/qr.svg?url=');
});

test('image endpoints are proxied', async ({ request }) => {
  const png = await request.get(`/qr.png?url=${encodeURIComponent(target)}`);
  expect(png.ok()).toBeTruthy();
  expect(png.headers()['content-type']).toContain('image/png');

  const svg = await request.get(`/qr.svg?url=${encodeURIComponent(target)}`);
  expect(svg.ok()).toBeTruthy();
  expect(svg.headers()['content-type']).toContain('image/svg+xml');
  expect(await svg.text()).toContain('<svg');
});
