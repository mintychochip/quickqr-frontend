import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test('the site carousel cycles, wraps, and swipes on a phone', async ({ page }) => {
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

  // A horizontal touch swipe moves one place; the stage keeps vertical scrolling for the page.
  const beforeSwipe = await active();
  await page.evaluate(() => {
    const stage = document.querySelector('[data-testid="sites-carousel"]');
    if (!(stage instanceof HTMLElement)) throw new Error('no carousel stage');
    const rect = stage.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    const event = (type: string, x: number) =>
      new PointerEvent(type, { bubbles: true, pointerType: 'touch', pointerId: 7, clientX: x, clientY: y });
    stage.dispatchEvent(event('pointerdown', rect.left + rect.width * 0.75));
    stage.dispatchEvent(event('pointerup', rect.left + rect.width * 0.25));
  });
  expect(await active()).not.toBe(beforeSwipe);
});
