import { expect, test } from '@playwright/test';
import { contrastOf, signInToken, signInViaOAuth } from './helpers';

const PRO_ONLY = 'Menus are a Pro feature.';

test('Free sees a Pro gate on menus, and the API refuses menu writes', async ({ page }) => {
  const token = await signInToken();
  const meRes = await page.request.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  // The Go reference server sends no plan and keeps menus open for everyone; only a plan-aware server gates them.
  const meBody = (await meRes.json()) as { user: { plan?: string } };
  test.skip(meBody.user.plan === undefined, 'This server has no plans, so menus are open to everyone.');

  await signInViaOAuth(page);
  const chip = page.locator('[data-testid="nav-menus"] .dsh-nav-pro');

  // On another dashboard page the Menus link is idle; on the gate page it is active (ink, white text).
  await page.goto('/dashboard');
  await expect(chip).toBeVisible();
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    expect(await contrastOf(chip), `${scheme}: idle Pro chip`).toBeGreaterThanOrEqual(4.5);
  }

  await page.goto('/dashboard/menus');
  await expect(page.getByTestId('menus-gate')).toBeVisible();
  await expect(page.getByTestId('menus-section')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Menus are a Pro feature' })).toBeVisible();
  await expect(page.getByTestId('nav-menus')).toContainText('Pro');
  await expect(page.getByRole('link', { name: 'See the plans' })).toHaveAttribute('href', '/#pricing');
  await expect(chip).toBeVisible();
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    expect(await contrastOf(chip), `${scheme}: active Pro chip`).toBeGreaterThanOrEqual(4.5);
  }

  // A direct path cannot get the editor either.
  await page.goto('/dashboard/menus/new');
  await expect(page.getByTestId('menus-gate')).toBeVisible();
  await expect(page.getByTestId('menu-editor')).toHaveCount(0);

  // And the gate is not only the UI.
  const res = await page.request.post('/api/menus', {
    headers: { Authorization: `Bearer ${token}` },
    data: { title: 'Locked', items: [{ name: 'Soup', price: '6.00' }] },
  });
  expect(res.status()).toBe(403);
  expect(await res.json()).toEqual({ error: PRO_ONLY });
});
