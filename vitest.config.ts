import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-key',
    },
  },
});
