import { expect, test } from '@playwright/test';
import { contrastOf, signInViaOAuth } from './helpers';

test('the Free plan button takes you to the studio', async ({ page }) => {
  await page.goto('/#pricing');
  await page.getByTestId('plan-free').getByRole('link', { name: 'Make a free code' }).click();
  await expect(page).toHaveURL(/#generator$/);
  await expect(page.locator('#generator')).toBeInViewport();
});

test('the billing toggle switches the plans between a month and a year', async ({ page }) => {
  await page.goto('/#pricing');
  const plus = page.getByTestId('plan-plus');
  const pro = page.getByTestId('plan-pro');
  const free = page.getByTestId('plan-free');

  // Monthly first, with the yearly price named underneath.
  await expect(page.getByTestId('period-monthly')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('period-yearly')).toHaveAttribute('aria-pressed', 'false');
  await expect(plus.getByTestId('plan-plus-price')).toHaveText('$5');
  await expect(plus.getByTestId('plan-plus-period')).toHaveText('or $50 a year (2 months free)');

  await page.getByTestId('period-yearly').click();
  await expect(page.getByTestId('period-yearly')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('period-monthly')).toHaveAttribute('aria-pressed', 'false');
  await expect(plus.getByTestId('plan-plus-price')).toHaveText('$50');
  await expect(plus.getByTestId('plan-plus-period')).toHaveText('$4.17 a month, billed yearly (2 months free)');
  await expect(pro.getByTestId('plan-pro-price')).toHaveText('$150');
  await expect(pro.getByTestId('plan-pro-period')).toHaveText('$12.50 a month, billed yearly (2 months free)');

  // Free costs the same either way, and says so.
  await expect(free.getByTestId('plan-free-price')).toHaveText('$0');
  await expect(free.getByTestId('plan-free-period')).toHaveText('No card, no trial clock.');

  await page.getByTestId('period-monthly').click();
  await expect(plus.getByTestId('plan-plus-price')).toHaveText('$5');
  await expect(pro.getByTestId('plan-pro-price')).toHaveText('$15');
});

test('the header Pricing link lands on the plans with the heading clear of the sticky header', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Pricing' }).click();
  await expect(page).toHaveURL(/#pricing$/);

  const heading = page.getByRole('heading', { name: 'Pricing', level: 2 });
  await expect(heading).toBeInViewport();
  const header = await page.locator('header').first().boundingBox();
  await expect.poll(async () => (await heading.boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(header?.height ?? Infinity);
});

test('paid plans say they are not open yet and offer nothing to click', async ({ page }) => {
  await page.goto('/#pricing');
  for (const id of ['plus', 'pro']) {
    const plan = page.getByTestId(`plan-${id}`);
    await expect(plan.getByText('Coming soon'), id).toBeVisible();
    await expect(plan.getByRole('link'), id).toHaveCount(0);
    await expect(plan.getByRole('button'), id).toHaveCount(0);
  }
});

test('on a phone the plans stack in order and the page does not scroll sideways', async ({ page }) => {
  await signInViaOAuth(page); // the signed-in header is the widest one
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#pricing');
  await expect(page.getByTestId('plan-free')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

  // One measurement for all three plans, so a late layout shift cannot land between them.
  const boxes = await page.evaluate(() =>
    ['free', 'plus', 'pro'].map((id) => {
      const plan = document.querySelector(`[data-testid="plan-${id}"]`);
      if (!plan) throw new Error(`plan-${id} is missing`);
      const { x, y, width, height } = plan.getBoundingClientRect();
      return { id, x, y, width, height };
    }),
  );
  boxes.forEach((box, i) => {
    expect(box.x, `${box.id} left edge`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${box.id} right edge`).toBeLessThanOrEqual(390);
    const before = boxes[i - 1];
    if (before) expect(box.y, `${box.id} starts below ${before.id}`).toBeGreaterThanOrEqual(before.y + before.height - 1);
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`every line of text in the plans is readable in the ${scheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/#pricing');

    const lines = page.locator('#pricing').locator('h2, h3, p, span, a, button');
    await expect(lines.first()).toBeVisible();
    for (const line of await lines.all()) {
      expect(await contrastOf(line), `${scheme}: "${(await line.innerText()).slice(0, 40)}"`).toBeGreaterThanOrEqual(4.5);
    }
  });
}
