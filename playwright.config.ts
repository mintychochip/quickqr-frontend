import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(frontendRoot, '..', 'backend');

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5186';

/** Set PLAYWRIGHT_MANAGED_SERVERS=1 in CI to start backend + Vite before tests. */
const managedServers = process.env.PLAYWRIGHT_MANAGED_SERVERS === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI === 'true' ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : [['list']],
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'go run ./cmd/server',
      cwd: backendRoot,
      url: 'http://127.0.0.1:8080/healthz',
      reuseExistingServer: !managedServers,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: '8080',
        // Keep E2E deterministic: no external Jev/LLM calls required.
        TYPESAFE_JEV_STYLE: '0',
      },
    },
    {
      command: 'bun run dev',
      cwd: frontendRoot,
      url: baseURL,
      reuseExistingServer: !managedServers,
      timeout: 120_000,
    },
  ],
});
