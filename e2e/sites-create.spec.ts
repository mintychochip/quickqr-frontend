import { expect, test } from '@playwright/test';

const USER = {
  id: 'user-pro',
  email: 'pro@example.com',
  created_at: '2026-10-01T00:00:00Z',
  plan: 'pro',
  plan_until: '2026-11-01T00:00:00Z',
  is_admin: false,
};

test('a Pro owner creates a site and uploads its index from the Sites page', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('quickqr2_auth_token', 'test-token');
  });

  const createBodies: unknown[] = [];
  const uploads: { path: string | null; method: string }[] = [];

  await page.route((url) => url.pathname === '/api/auth/me', (route) =>
    route.fulfill({ json: { user: USER } }),
  );
  await page.route((url) => url.pathname === '/api/links', (route) =>
    route.fulfill({ json: { links: [] } }),
  );
  await page.route((url) => url.pathname === '/api/sites', (route) => {
    createBodies.push(route.request().postDataJSON());
    return route.fulfill({
      status: 201,
      json: { code: 'siteabc', title: 'My site', kind: 'site' },
    });
  });
  await page.route((url) => url.pathname === '/api/sites/siteabc/files', (route) => {
    uploads.push({ path: new URL(route.request().url()).searchParams.get('path'), method: route.request().method() });
    return route.fulfill({
      json: { path: 'index.html', size: 25, content_type: 'text/html' },
    });
  });

  await page.goto('/dashboard/sites');
  await expect(page.getByTestId('sites-section')).toBeVisible();

  await page.getByTestId('site-create').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Site name').fill('My site');
  await page.getByTestId('site-create-files').setInputFiles({
    name: 'index.html',
    mimeType: 'text/html',
    buffer: Buffer.from('<!doctype html><title>Hi</title>'),
  });
  await page.getByTestId('site-create-submit').click();

  await expect(page.getByTestId('site-row')).toHaveCount(1);
  await expect(page.getByTestId('site-row')).toContainText('My site');
  await expect(page.getByTestId('site-row')).toContainText('/siteabc');
  expect(createBodies).toEqual([{ title: 'My site' }]);
  expect(uploads).toEqual([{ path: 'index.html', method: 'PUT' }]);
});

test('an existing site lists, adds, and deletes files from its panel', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('quickqr2_auth_token', 'test-token');
  });

  let files = [
    { path: 'index.html', size: 25, content_type: 'text/html', uploaded_at: '2026-10-24T00:00:00Z' },
  ];
  const site = {
    id: 'site-id',
    code: 'siteabc',
    title: 'My site',
    destination_url: 's',
    created_at: '2026-10-24T00:00:00Z',
    updated_at: '2026-10-24T00:00:00Z',
    total_scans: 0,
    ad_style: 'site',
    is_active: true,
    kind: 'site',
  };

  await page.route((url) => url.pathname === '/api/auth/me', (route) =>
    route.fulfill({ json: { user: USER } }),
  );
  await page.route((url) => url.pathname === '/api/links', (route) =>
    route.fulfill({ json: { links: [site] } }),
  );
  await page.route((url) => url.pathname === '/api/sites/siteabc', (route) =>
    route.fulfill({ json: { site, files } }),
  );
  await page.route((url) => url.pathname === '/api/sites/siteabc/files', (route) => {
    const request = route.request();
    if (request.method() === 'DELETE') {
      files = files.filter((file) => file.path !== new URL(request.url()).searchParams.get('path'));
      return route.fulfill({ status: 204 });
    }
    files = [
      ...files,
      { path: 'about.html', size: 8, content_type: 'text/html', uploaded_at: '2026-10-24T00:00:00Z' },
    ];
    return route.fulfill({
      json: { path: 'about.html', size: 8, content_type: 'text/html' },
    });
  });

  await page.goto('/dashboard/sites');
  await page.getByTestId('site-files-toggle').click();
  const panel = page.getByTestId('site-files-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('index.html');

  await panel.getByTestId('site-files-input').setInputFiles({
    name: 'about.html',
    mimeType: 'text/html',
    buffer: Buffer.from('<p>about</p>'),
  });
  await panel.getByTestId('site-files-upload').click();
  await expect(panel).toContainText('about.html');
  await expect(panel).toContainText('2 of 64 files');

  page.once('dialog', (dialog) => void dialog.accept());
  await panel.getByRole('button', { name: 'Delete about.html' }).click();
  await expect(panel).not.toContainText('about.html');
  await expect(panel).toContainText('1 of 64 files');
});

test('the create dialog refuses a selection without a root index', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('quickqr2_auth_token', 'test-token');
  });
  await page.route((url) => url.pathname === '/api/auth/me', (route) =>
    route.fulfill({ json: { user: USER } }),
  );
  await page.route((url) => url.pathname === '/api/links', (route) =>
    route.fulfill({ json: { links: [] } }),
  );

  await page.goto('/dashboard/sites');
  await page.getByTestId('site-create').click();
  await page.getByLabel('Site name').fill('My site');
  await page.getByTestId('site-create-files').setInputFiles({
    name: 'about.html',
    mimeType: 'text/html',
    buffer: Buffer.from('<p>about</p>'),
  });
  await page.getByTestId('site-create-submit').click();

  await expect(page.getByTestId('site-create-error')).toContainText('index.html');
  await expect(page.getByTestId('site-row')).toHaveCount(0);
});

test('a Free owner can read site files but not create or change them', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('quickqr2_auth_token', 'test-token');
  });
  const site = {
    id: 'site-id',
    code: 'siteabc',
    title: 'My site',
    destination_url: 's',
    created_at: '2026-10-24T00:00:00Z',
    updated_at: '2026-10-24T00:00:00Z',
    total_scans: 0,
    ad_style: 'site',
    is_active: true,
    kind: 'site',
  };
  await page.route((url) => url.pathname === '/api/auth/me', (route) =>
    route.fulfill({ json: { user: { ...USER, plan: 'free' } } }),
  );
  await page.route((url) => url.pathname === '/api/links', (route) =>
    route.fulfill({ json: { links: [site] } }),
  );
  await page.route((url) => url.pathname === '/api/sites/siteabc', (route) =>
    route.fulfill({
      json: {
        site,
        files: [{ path: 'index.html', size: 25, content_type: 'text/html', uploaded_at: '2026-10-24T00:00:00Z' }],
      },
    }),
  );

  await page.goto('/dashboard/sites');
  await expect(page.getByTestId('site-create')).toHaveCount(0);
  await page.getByTestId('site-files-toggle').click();
  const panel = page.getByTestId('site-files-panel');
  await expect(panel).toContainText('index.html');
  await expect(panel).toContainText('read-only');
  await expect(panel.getByRole('button', { name: 'Add files' })).toHaveCount(0);
});

test('a failed upload keeps the site and retries without creating another', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('quickqr2_auth_token', 'test-token');
  });

  let creates = 0;
  let uploads = 0;
  await page.route((url) => url.pathname === '/api/auth/me', (route) =>
    route.fulfill({ json: { user: USER } }),
  );
  await page.route((url) => url.pathname === '/api/links', (route) =>
    route.fulfill({ json: { links: [] } }),
  );
  await page.route((url) => url.pathname === '/api/sites', (route) => {
    creates += 1;
    return route.fulfill({ status: 201, json: { code: 'siteabc', title: 'My site', kind: 'site' } });
  });
  await page.route((url) => url.pathname === '/api/sites/siteabc/files', (route) => {
    uploads += 1;
    if (uploads === 1) {
      return route.fulfill({ status: 413, json: { error: 'A file may be at most 1 MiB' } });
    }
    return route.fulfill({ json: { path: 'index.html', size: 8, content_type: 'text/html' } });
  });

  await page.goto('/dashboard/sites');
  await page.getByTestId('site-create').click();
  await page.getByLabel('Site name').fill('My site');
  await page.getByTestId('site-create-files').setInputFiles({
    name: 'index.html',
    mimeType: 'text/html',
    buffer: Buffer.from('<!doctype html><p>too big</p>'),
  });
  await page.getByTestId('site-create-submit').click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('site-create-error')).toContainText('1 MiB');
  await expect(page.getByTestId('site-row')).toHaveCount(1);
  expect(creates).toBe(1);

  await page.getByTestId('site-create-files').setInputFiles({
    name: 'index.html',
    mimeType: 'text/html',
    buffer: Buffer.from('<!doctype html><p>fixed</p>'),
  });
  await page.getByTestId('site-create-submit').click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('site-row')).toHaveCount(1);
  expect(creates).toBe(1);
  expect(uploads).toBe(2);
});

test('site authoring fits a phone width with the panel and the dialog open', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    localStorage.setItem('quickqr2_auth_token', 'test-token');
  });
  const site = {
    id: 'site-id',
    code: 'siteabc',
    title: 'My site',
    destination_url: 's',
    created_at: '2026-10-24T00:00:00Z',
    updated_at: '2026-10-24T00:00:00Z',
    total_scans: 0,
    ad_style: 'site',
    is_active: true,
    kind: 'site',
  };
  await page.route((url) => url.pathname === '/api/auth/me', (route) =>
    route.fulfill({ json: { user: USER } }),
  );
  await page.route((url) => url.pathname === '/api/links', (route) =>
    route.fulfill({ json: { links: [site] } }),
  );
  await page.route((url) => url.pathname === '/api/sites/siteabc', (route) =>
    route.fulfill({
      json: {
        site,
        files: [{ path: 'index.html', size: 25, content_type: 'text/html', uploaded_at: '2026-10-24T00:00:00Z' }],
      },
    }),
  );

  const scrollWidth = () => page.evaluate(() => document.documentElement.scrollWidth);
  await page.goto('/dashboard/sites');
  await expect(page.getByTestId('sites-section')).toBeVisible();
  expect(await scrollWidth()).toBeLessThanOrEqual(390);

  await page.getByTestId('site-files-toggle').click();
  await expect(page.getByTestId('site-files-panel')).toContainText('index.html');
  expect(await scrollWidth()).toBeLessThanOrEqual(390);

  await page.getByTestId('site-create').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await scrollWidth()).toBeLessThanOrEqual(390);
});

test('a template creates a site and uploads its index', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('quickqr2_auth_token', 'test-token');
  });
  let creates = 0;
  let body = '';
  await page.route((url) => url.pathname === '/api/auth/me', (route) =>
    route.fulfill({ json: { user: USER } }),
  );
  await page.route((url) => url.pathname === '/api/links', (route) =>
    route.fulfill({ json: { links: [] } }),
  );
  await page.route((url) => url.pathname === '/api/sites', (route) => {
    creates += 1;
    return route.fulfill({ status: 201, json: { code: 'siteabc', title: 'Morning menu', kind: 'site' } });
  });
  await page.route((url) => url.pathname === '/api/sites/siteabc/files', (route) => {
    body = route.request().postData() ?? '';
    return route.fulfill({ json: { path: 'index.html', size: body.length, content_type: 'text/html' } });
  });

  await page.goto('/dashboard/sites');
  await page.getByTestId('site-create').click();
  await page.getByTestId('site-template-cafe').click();
  await page.getByLabel('Site name').fill('Morning menu');
  await page.getByTestId('site-create-submit').click();

  await expect(page.getByTestId('site-row')).toContainText('Morning menu');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(creates).toBe(1);
  expect(body.includes('Morning')).toBe(true);
});
