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
      include: ['qr-code-styling', 'qrcode.react', 'chart.js', 'html5-qrcode'],
    },
    define: {
      'process.env.MESSAGE_CHANNEL': 'undefined',
    },
    resolve: {
      alias: {
        'react-dom/server': 'react-dom/server.browser',
      },
    },
  },
  server: {
    port: 4321,
    host: true
  }
});
