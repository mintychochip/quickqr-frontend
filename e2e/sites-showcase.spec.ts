import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('the site carousel keeps cycling by itself, and a tap does not stop it', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('sites-showcase').scrollIntoViewIfNeeded();
  const active = () => page.locator('[data-testid="sites-carousel"] [aria-current="true"]').getAttribute('data-site');

  const first = await active();
  // The old effect read `active` only inside the timer, so it advanced once and stopped.
  await expect.poll(active, { timeout: 9000 }).not.toBe(first);

  const afterAuto = await active();
  // A tap must advance and then let the six-second cycle continue; focus alone must not pause it.
  await page.getByRole('button', { name: 'Next site' }).tap();
  const afterTap = await active();
  expect(afterTap).not.toBe(afterAuto);
  await expect.poll(active, { timeout: 9000 }).not.toBe(afterTap);

  const beforeWrap = await active();
  for (let i = 0; i < 3; i += 1) await page.getByRole('button', { name: 'Next site' }).tap();
  expect(await active()).toBe(beforeWrap);
});
