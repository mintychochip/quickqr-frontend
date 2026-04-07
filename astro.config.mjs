import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    functionPerRoute: false
  }),
  outDir: './dist',
  integrations: [react()],
  vite: {
    optimizeDeps: {
      include: ['qr-code-styling', 'qrcode.react', 'chart.js'],
    },
  },
});
