import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    functionPerRoute: false
  }),
  outDir: './dist',
  integrations: [react(), tailwind()],
  vite: {
    optimizeDeps: {
      include: ['qr-code-styling', 'qrcode.react', 'chart.js', 'html5-qrcode'],
    },
    define: {
      'process.env.MESSAGE_CHANNEL': 'undefined',
    },
    plugins: [{
      name: 'fix-react-dom-server',
      enforce: 'pre',
      resolveId(source) {
        if (source === 'react-dom/server' || source === 'react-dom/server.browser') {
          return this.resolve('react-dom/server', undefined, { skipSelf: true });
        }
      },
    }],
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
