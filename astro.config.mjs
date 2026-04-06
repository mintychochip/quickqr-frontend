import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server',
  adapter: netlify(),
  vite: {
    optimizeDeps: {
      include: ['qr-code-styling'],
    },
  },
});
