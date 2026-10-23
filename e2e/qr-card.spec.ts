import { expect, test, type Locator } from '@playwright/test';
import { PRO_USER, contrastOf, decodedCode, generator, signInToken, signInViaOAuth } from './helpers';

/** How far from grey the most colourful pixel on a canvas is: 0 for black and white, over 100 for a blue code. */
async function strongestTint(canvas: Locator): Promise<number> {
  return canvas.evaluate((el) => {
    const target = el as HTMLCanvasElement;
    const ctx = target.getContext('2d');
    if (!ctx) throw new Error('2d canvas is unavailable');
    const { data } = ctx.getImageData(0, 0, target.width, target.height);
    let strongest = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r = 0, g = 0, b = 0] = [data[i], data[i + 1], data[i + 2]];
      strongest = Math.max(strongest, Math.max(r, g, b) - Math.min(r, g, b));
    }
    return strongest;
  });
}

test('the studio card downloads PNG and SVG and copies its link', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  await gen.getByRole('tab', { name: 'Static', exact: true }).click();
  await expect(gen.getByTestId('static-compressed-url')).not.toHaveText('Not generated yet', { timeout: 8_000 });

  const card = gen.getByTestId('qr-card');
  const [png] = await Promise.all([
    page.waitForEvent('download'),
    card.getByRole('button', { name: 'Download PNG' }).click(),
  ]);
  expect(png.suggestedFilename()).toMatch(/^quickqr-.+\.png$/);

  const [svg] = await Promise.all([
    page.waitForEvent('download'),
    card.getByRole('button', { name: 'Download SVG' }).click(),
  ]);
  expect(svg.suggestedFilename()).toMatch(/^quickqr-.+\.svg$/);

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await card.getByRole('button', { name: 'Copy link' }).click();
  const shown = (await card.getByTestId('qr-encoded-value').innerText()).trim();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shown);
});

test('the first code on the page is plain black on white, with no tint, and it scans', async ({ page }) => {
  await page.goto('/');
  const card = generator(page).getByTestId('qr-card');

  // Drawn and readable first: a canvas that has not been painted yet has no colour in it either.
  await expect.poll(() => decodedCode(card)).not.toBeNull();
  expect(await strongestTint(card.getByTestId('qr-canvas'))).toBeLessThan(16);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`the studio card stays readable in the ${scheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/');
    const gen = generator(page);
    await gen.getByRole('tab', { name: 'Static', exact: true }).click();
    await expect(gen.getByTestId('static-compressed-url')).not.toHaveText('Not generated yet', { timeout: 8_000 });

    const card = gen.getByTestId('qr-card');
    const labelled = [
      card.getByRole('button', { name: 'Download PNG' }),
      card.getByRole('button', { name: 'Download SVG' }),
      card.getByTestId('qr-encoded-value'),
    ];
    for (const control of labelled) {
      await expect(control).toBeVisible();
      expect(await contrastOf(control), `${scheme}: text contrast`).toBeGreaterThanOrEqual(4.5);
    }

    const icons = [
      card.getByRole('button', { name: 'Copy link' }),
      card.getByRole('button', { name: 'Copy share link' }),
    ];
    for (const control of icons) {
      await expect(control).toBeVisible();
      expect(await contrastOf(control), `${scheme}: icon contrast`).toBeGreaterThanOrEqual(3);
    }
  });
}

test('a saved menu shows its link once, with copy, share, and open in one row', async ({ page }) => {
  const token = await signInToken(PRO_USER);
  const created = await page.request.post('/api/menus', {
    headers: { Authorization: `Bearer ${token}` },
    data: { title: 'Card check', items: [{ name: 'Soup', price: '6.00' }] },
  });
  expect(created.status()).toBe(201);
  const { code } = (await created.json()) as { code: string };

  await signInViaOAuth(page, '/', PRO_USER);
  await page.goto(`/dashboard/menus/${code}`);
  const editor = page.getByTestId('menu-editor');
  const card = editor.getByTestId('qr-card');

  const address = card.getByTestId('qr-encoded-value');
  await expect(address).toHaveText(new RegExp(`/r/${code}$`));
  await expect(address).toHaveAttribute('href', new RegExp(`/r/${code}$`));
  await expect(address).toHaveAttribute('target', '_blank');
  expect(
    await address.evaluate((el) => el.scrollWidth - el.clientWidth),
    'the short link is cut off by the buttons next to it',
  ).toBeLessThanOrEqual(0);
  await expect(card.getByRole('button', { name: 'Download PNG' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Download SVG' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Copy link' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Copy share link' })).toBeVisible();

  // The editor adds no second copy of what the card already offers.
  await expect(editor.getByRole('button', { name: 'Copy link' })).toHaveCount(1);
  await expect(editor.getByRole('button', { name: 'Open page' })).toHaveCount(0);
  await expect(editor.getByText('Test link')).toHaveCount(0);

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await card.getByRole('button', { name: 'Copy link' }).click();
  const shown = (await card.getByTestId('qr-encoded-value').innerText()).trim();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shown);
});

test('a new dynamic code shows its link once in the create panel', async ({ page }) => {
  await signInViaOAuth(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: '+ Create code' }).click();
  const panel = page.getByTestId('create-code-panel');

  await panel.getByLabel('Destination URL').fill('https://example.com/card-check');
  await panel.getByLabel('Title').fill(`Card check ${Date.now()}`);
  await panel.getByTestId('create-code-submit').click();
  await expect(panel.getByTestId('create-code-success')).toBeVisible({ timeout: 15_000 });

  const card = panel.getByTestId('qr-card');
  const shown = (await card.getByTestId('qr-encoded-value').innerText()).trim();
  expect(shown).toMatch(/\/r\/[a-z0-9]+$/i);

  await expect(panel.getByText(shown, { exact: true })).toHaveCount(1);
  await expect(panel.getByRole('button', { name: 'Copy link' })).toHaveCount(1);
  await expect(card.getByTestId('qr-encoded-value')).toHaveAttribute('href', shown);
});
