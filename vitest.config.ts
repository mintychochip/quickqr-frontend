import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-key',
    },
    // Exclude menu-ocr React component tests - they have their own vitest.config.ts with jsdom
    exclude: [
      '**/menu-ocr/**/*.{test,spec}.{ts,tsx}',
      '**/node_modules/**',
    ],
  },
});
