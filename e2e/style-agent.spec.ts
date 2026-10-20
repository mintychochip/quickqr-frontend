import { expect, test } from '@playwright/test';
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
  await expect(gen.getByText(/Applied \(agent\)/)).toBeVisible({ timeout: 20_000 });
});
