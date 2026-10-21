import { expect, test } from '@playwright/test';
import { signInToken, signInViaOAuth } from './helpers';

test('dashboard edits settings for one QR code', async ({ page }) => {
  const token = await signInToken();
  const headers = { Authorization: `Bearer ${token}` };
  const reset = await page.request.patch('/api/qr/menu-cafe/settings', {
    headers,
    data: { title: 'Autumn Cafe Menu 2026' },
  });
  expect(reset.ok()).toBeTruthy();

  await signInViaOAuth(page);
  await page.goto('/dashboard');
  const row = page.getByRole('row', { name: /Autumn Cafe Menu 2026/ });
  await row.getByRole('button', { name: 'Show QR Code' }).click();

  const panel = page.getByTestId('qr-settings');
  await expect(page.getByTestId('qr-dropdown')).toContainText('PATCH /api/qr/menu-cafe/settings');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('PATCH /api/qr/menu-cafe/settings');
  await expect(panel.getByRole('button', { name: 'Knobs' })).toHaveCount(0);

  await panel.getByTestId('settings-query').fill('title Autumn Cafe Tonight');
  await panel.getByRole('button', { name: 'Apply' }).click();
  await expect(panel.getByText('Saved on this code.')).toBeVisible();
  await expect(page.getByRole('row', { name: /Autumn Cafe Tonight\s+\/r\/menu-cafe/ })).toBeVisible();

  const saved = await page.request.get('/api/qr/menu-cafe/settings', { headers });
  expect(saved.ok()).toBeTruthy();
  const body = (await saved.json()) as { settings: { title: string; destination_url: string } };
  expect(body.settings.title).toBe('Autumn Cafe Tonight');
  expect(body.settings.destination_url).toBe('https://example.com/menu/fall-season');

  const restore = await page.request.patch('/api/qr/menu-cafe/settings', {
    headers,
    data: { title: 'Autumn Cafe Menu 2026' },
  });
  expect(restore.ok()).toBeTruthy();
});

test('settings query uses the studio style prompt', async ({ page }) => {
  const token = await signInToken();
  const headers = { Authorization: `Bearer ${token}` };
  const before = await page.request.get('/api/qr/menu-cafe/settings', { headers });
  expect(before.ok()).toBeTruthy();
  const previous = (await before.json()) as { settings: { style: unknown } };

  await signInViaOAuth(page);
  await page.goto('/dashboard');
  const row = page.getByRole('row', { name: /\/r\/menu-cafe/ });
  await row.getByRole('button', { name: 'Show QR Code' }).click();
  const panel = page.getByTestId('qr-settings');
  await panel.getByRole('button', { name: 'Navy on cream' }).click();
  await expect(panel.getByText('Saved on this code.')).toContainText('Navy on cream');

  const saved = await page.request.get('/api/qr/menu-cafe/settings', { headers });
  expect(saved.ok()).toBeTruthy();
  const body = (await saved.json()) as { settings: { style: { fgColor: string; bgColor: string } } };
  expect(body.settings.style.fgColor).toBe('#1e3a5f');
  expect(body.settings.style.bgColor).toBe('#faf7f0');

  const restore = await page.request.patch('/api/qr/menu-cafe/settings', {
    headers,
    data: { style: previous.settings.style },
  });
  expect(restore.ok()).toBeTruthy();
});

test('settings context doc and photo style the code', async ({ page }) => {
  const token = await signInToken();
  const headers = { Authorization: `Bearer ${token}` };
  const before = await page.request.get('/api/qr/menu-cafe/settings', { headers });
  expect(before.ok()).toBeTruthy();
  const previous = (await before.json()) as { settings: { style: unknown } };

  await signInViaOAuth(page);
  await page.goto('/dashboard');
  const row = page.getByRole('row', { name: /\/r\/menu-cafe/ });
  await row.getByRole('button', { name: 'Show QR Code' }).click();
  const panel = page.getByTestId('qr-settings');
  await panel.getByTestId('settings-context-file').setInputFiles({
    name: 'campaign.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('navy on cream for the dinner menu'),
  });
  await expect(panel.getByTestId('settings-context-list')).toContainText('campaign.txt');
  await panel.getByRole('button', { name: 'Apply' }).click();
  await expect(panel.getByText('Saved on this code.')).toContainText('From notes');

  let saved = await page.request.get('/api/qr/menu-cafe/settings', { headers });
  let body = (await saved.json()) as { settings: { style: { fgColor: string; bgColor: string } } };
  expect(body.settings.style.fgColor).toBe('#1e3a5f');
  expect(body.settings.style.bgColor).toBe('#faf7f0');

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGO4I6KBFTEMLQkAh11GAWmISxcAAAAASUVORK5CYII=',
    'base64',
  );
  await panel.getByTestId('settings-context-file').setInputFiles({
    name: 'swatch.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await expect(panel.getByTestId('settings-context-list')).toContainText('swatch.png');
  await panel.getByRole('button', { name: 'Apply' }).click();
  await expect(panel.getByText('Saved on this code.')).toContainText('swatch.png');

  const restore = await page.request.patch('/api/qr/menu-cafe/settings', {
    headers,
    data: { style: previous.settings.style },
  });
  expect(restore.ok()).toBeTruthy();
});
