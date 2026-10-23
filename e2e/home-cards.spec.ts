import { expect, test, type Page } from '@playwright/test';

/**
 * Svelte renames a component's keyframes (`s-<hash>-qq-pop`), so the cards' animations are the
 * `qq-` ones; the name list is how a spec can tell the build-up ran rather than a plain swap.
 */
const qqAnimationNames = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .map((animation) => (animation as CSSAnimation).animationName)
      .filter((name) => name.includes('qq-')),
  );

test('the cards build themselves once, the first time they come into view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');

  const section = page.getByTestId('home-cards');
  const cards = section.locator('[data-slot="card"]');

  // Below the fold and not painted yet, so the settled art never shows before it builds.
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveCSS('opacity', '0');
  expect(await qqAnimationNames(page)).toEqual([]);

  await section.scrollIntoViewIfNeeded();

  // The build-up is CSS animations, and every part of it lands where the static art was.
  await expect(cards.first()).toHaveCSS('opacity', '1');
  await expect(page.getByTestId('home-scans')).toHaveText('128');
  const names = await qqAnimationNames(page);
  expect(names.some((name) => name.endsWith('qq-pop'))).toBe(true);
  await expect(section.locator('.qq-mod').first()).toHaveCSS('opacity', '1');
  await expect(section.locator('.qq-copy').first()).toHaveCSS('opacity', '1');
});

test('reduced motion gets the finished cards, with nothing animating', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const cards = page.getByTestId('home-cards').locator('[data-slot="card"]');

  // No scroll: the cards are simply there, painted, from the first frame.
  await expect(cards.first()).toHaveCSS('opacity', '1');
  await expect(page.getByTestId('home-scans')).toHaveText('128');
  expect(await qqAnimationNames(page)).toEqual([]);
});
