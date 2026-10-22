import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';
import { generator } from './helpers';

test('attached photo is sent to the style agent', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGO4I6KBFTEMLQkAh11GAWmISxcAAAAASUVORK5CYII=',
    'base64',
  );

  await gen.getByTestId('style-context-file').setInputFiles({
    name: 'swatch.png',
    mimeType: 'image/png',
    buffer: png,
  });
  await expect(gen.getByTestId('style-context-list')).toContainText('swatch.png');

  await gen.getByRole('button', { name: 'Apply' }).click();
  await expect(gen.getByText(/Applied \(decision model\)/)).toBeVisible({ timeout: 20_000 });
});

test('a large photo is shrunk to fit before it is sent, and keeps its proportions', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const photo = new PNG({ width: 600, height: 400 });
  for (let y = 0; y < photo.height; y++) {
    for (let x = 0; x < photo.width; x++) {
      const at = (y * photo.width + x) * 4;
      photo.data.set([x % 256, y % 256, 160, 255], at);
    }
  }

  let sent: { images: { name: string; media_type: string; data: string }[] } | undefined;
  await page.route('**/api/qr/style-agent', async (route) => {
    sent = route.request().postDataJSON();
    await route.continue();
  });
  await gen.getByTestId('style-context-file').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: PNG.sync.write(photo) });
  await gen.getByRole('button', { name: 'Apply' }).click();
  await expect(gen.getByText(/Applied \(decision model\)/)).toBeVisible({ timeout: 20_000 });

  const image = sent?.images[0];
  expect([image?.name, image?.media_type]).toEqual(['big.png', 'image/png']);
  const decoded = PNG.sync.read(Buffer.from(image?.data ?? '', 'base64'));
  expect([decoded.width, decoded.height]).toEqual([96, 64]);
});
