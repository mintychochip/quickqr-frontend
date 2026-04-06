import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  integrations: [react()],
  vite: {
    optimizeDeps: {
      include: ['qr-code-styling', 'qrcode.react', 'chart.js'],
    },
  },
});
