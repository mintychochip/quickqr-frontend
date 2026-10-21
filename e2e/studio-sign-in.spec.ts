import { expect, test, type Locator, type Page } from '@playwright/test';
import { chooseType, generator } from './helpers';

/** The modal Create opens while nobody is signed in. The dialog is named by the title it shows. */
function signInModal(page: Page): Locator {
  return page.getByRole('dialog', { name: 'Sign in to save this link' });
}

test('signed out, the card keeps its Create button and holds no sign-in controls', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);

  await expect(gen.getByTestId('create-dynamic-link')).toBeEnabled();
  await expect(gen.getByRole('button', { name: /^(Continue with )?(Google|GitHub)$/ })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Create QR code opens a sign-in modal and saves nothing', async ({ page }) => {
  const saves: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/links') saves.push(request.url());
  });
  await page.goto('/');
  const gen = generator(page);

  await gen.getByTestId('create-dynamic-link').click();

  const modal = signInModal(page);
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
  await expect(modal.getByText("Sign-in isn't available on this server.")).toHaveCount(0);
  await expect(gen.getByTestId('qr-card').getByTestId('qr-encoded-value')).toHaveText('Not saved yet');
  expect(saves).toEqual([]);
});

test('pressing Enter in the bar opens the same modal', async ({ page }) => {
  await page.goto('/');
  await generator(page).locator('#destination-url').press('Enter');

  await expect(signInModal(page)).toBeVisible();
});

test('the modal takes keyboard focus, keeps Tab inside it, and hands focus back on Escape', async ({ page }) => {
  await page.goto('/');
  const create = generator(page).getByTestId('create-dynamic-link');
  await create.focus();
  await page.keyboard.press('Enter');

  const modal = signInModal(page);
  await expect(modal.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
  await expect(modal.locator(':focus')).toHaveCount(1);

  // Forward from the dialog itself, round the three controls, and back to the first.
  const focused = page.locator(':focus');
  for (const name of ['Close', 'Continue with Google', 'Continue with GitHub', 'Close']) {
    await page.keyboard.press('Tab');
    await expect(focused).toHaveAccessibleName(name);
  }
  await page.keyboard.press('Shift+Tab');
  await expect(focused).toHaveAccessibleName('Continue with GitHub');

  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(create).toBeFocused();
});

test('closing the modal, with its X or by clicking away, leaves the link as typed', async ({ page }) => {
  await page.goto('/');
  const gen = generator(page);
  const box = gen.locator('#destination-url');
  const modal = signInModal(page);
  await box.fill('example.com/keep-me');

  await gen.getByTestId('create-dynamic-link').click();
  await modal.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(box).toHaveValue('example.com/keep-me');

  await gen.getByTestId('create-dynamic-link').click();
  await expect(modal).toBeVisible();
  await page.getByRole('button', { name: 'Close dialog' }).click({ position: { x: 8, y: 8 } });
  await expect(modal).toHaveCount(0);
  await expect(box).toHaveValue('example.com/keep-me');
  await expect(gen.getByTestId('detected-kind')).toContainText('https://example.com/keep-me');
});

test('continuing with a provider signs in and creates the link that was typed, with its slug and chosen type', async ({
  page,
}) => {
  const slug = `modal-flow-${Date.now()}`;
  await page.goto('/');
  const gen = generator(page);

  // Link is chosen first so that the address does not depend on what auto-detect makes of it.
  await chooseType(gen, 'Link');
  await gen.locator('#destination-url').fill('example.com/@jane.doe');
  await gen.getByRole('button', { name: 'Slug and ads' }).click();
  await gen.locator('#slug').fill(slug);
  await gen.getByTestId('create-dynamic-link').click();
  await signInModal(page).getByRole('button', { name: 'Continue with Google' }).click();

  await page.getByRole('textbox', { name: 'Email' }).fill('ada@example.com');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  // Nobody clicks Create again: the link that was waiting is saved as soon as the studio knows who is signed in.
  await expect(gen.getByTestId('dynamic-link-success')).toContainText(`/r/${slug}`, { timeout: 15_000 });
  const saved = await page.evaluate(async (code) => {
    const token = localStorage.getItem('quickqr2_auth_token');
    const response = await fetch('/api/links', { headers: { Authorization: `Bearer ${token}` } });
    const { links } = (await response.json()) as { links: Array<{ code: string; destination_url: string }> };
    return links.find((link) => link.code === code)?.destination_url ?? null;
  }, slug);
  expect(saved).toBe('https://example.com/@jane.doe');
});

test('the header Log in opens the same modal under its plain title and hands focus back', async ({ page }) => {
  await page.goto('/');
  const login = page.getByRole('button', { name: 'Log in' });
  await login.click();

  const modal = page.getByRole('dialog', { name: 'Sign in', exact: true });
  await expect(modal.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(modal.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await expect(login).toBeFocused();
});

test('a sign-in that comes back with an error opens the modal with that message, and cleans the address', async ({ page }) => {
  await page.goto(`/?auth_error=${encodeURIComponent('Google sign-in was cancelled.')}`);

  const modal = page.getByRole('dialog', { name: 'Sign in', exact: true });
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('alert')).toHaveText('Google sign-in was cancelled.');
  await expect(page).not.toHaveURL(/auth_error/);
  // The studio underneath has no second copy of the message.
  await expect(generator(page).getByText('Google sign-in was cancelled.')).toHaveCount(0);
});

test('a server with no sign-in providers says so in the modal instead of showing an empty window', async ({ page }) => {
  await page.route('**/api/auth/oauth/providers', (route) =>
    route.fulfill({ json: { providers: { google: false, github: false, dev: false } } }),
  );
  await page.goto('/');
  await generator(page).getByTestId('create-dynamic-link').click();

  const modal = signInModal(page);
  await expect(modal).toBeVisible();
  await expect(modal.getByText("Sign-in isn't available on this server.")).toBeVisible();
  await expect(modal.getByRole('button', { name: /^Continue with/ })).toHaveCount(0);
});

test('the modal does not say sign-in is unavailable while it is still asking the server', async ({ page }) => {
  const { promise: held, resolve: answer } = Promise.withResolvers<void>();
  await page.route('**/api/auth/oauth/providers', async (route) => {
    await held;
    await route.fulfill({ json: { providers: { google: false, github: false, dev: false } } });
  });
  await page.goto('/');
  await generator(page).getByTestId('create-dynamic-link').click();

  const modal = signInModal(page);
  const unavailable = modal.getByText("Sign-in isn't available on this server.");
  await expect(modal).toBeVisible();
  await expect(unavailable).toHaveCount(0);

  answer();
  await expect(unavailable).toBeVisible();
});
