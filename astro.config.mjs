import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  vite: {
    ssr: {
      external: ['qr-code-styling'],
    },
    optimizeDeps: {
      include: ['qr-code-styling'],
    },
  },
});
