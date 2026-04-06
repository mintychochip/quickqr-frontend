import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  base: '/quickqr-frontend/',
  vite: {
    optimizeDeps: {
      include: ['qr-code-styling'],
    },
  },
});
