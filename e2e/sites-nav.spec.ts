import { expect, test } from '@playwright/test';
import { signInToken, signInViaOAuth } from './helpers';

test('Sites is in the dashboard navigation', async ({ page }) => {
  const token = await signInToken();
  const meRes = await page.request.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  const meBody = (await meRes.json()) as { user: { plan?: string } };
  test.skip(meBody.user.plan === undefined, 'This server has no plans and no site routes.');

  await signInViaOAuth(page, '/dashboard');
  await page.getByTestId('nav-sites').click();
  await expect(page).toHaveURL(/\/dashboard\/sites$/);
  await expect(page.getByTestId('sites-section')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sites' })).toBeVisible();
  await expect(page.getByTestId('sites-empty')).toContainText('No sites yet');
});
