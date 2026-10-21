import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Connect, Plugin } from 'vite'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { dynamicCodeFromQrPayload } from './src/lib/dynamicQr'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** Send compressed dynamic QR paths to the short link on the API. */
function compressedShortLinkPlugin(): Plugin {
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const requestUrl = req.url ?? '/'
    const pathOnly = requestUrl.split('?')[0] ?? '/'
    if (pathOnly === '/' || pathOnly === '/qr' || pathOnly.startsWith('/qr.') || /^\/r\//i.test(pathOnly) || pathOnly.startsWith('/api') || pathOnly.startsWith('/@') || pathOnly.startsWith('/src/') || pathOnly.startsWith('/node_modules') || pathOnly.startsWith('/__')) {
      next()
      return
    }
    const code = dynamicCodeFromQrPayload(`http://qr.local${pathOnly}`)
    if (!code) {
      next()
      return
    }
    const query = requestUrl.includes('?') ? `?${requestUrl.split('?')[1]}` : ''
    const headers = { ...req.headers, host: '127.0.0.1:8080' }
    const target = http.request(
      {
        hostname: '127.0.0.1',
        port: 8080,
        method: req.method,
        path: `/r/${code}${query}`,
        headers,
      },
      (proxied) => {
        res.writeHead(proxied.statusCode ?? 502, proxied.headers)
        proxied.pipe(res)
      },
    )
    target.on('error', () => {
      if (!res.headersSent) res.statusCode = 502
      res.end()
    })
    req.pipe(target)
  }
  return {
    name: 'compressed-short-link',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

const apiProxy = {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/r': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/R': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/qr.png': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
  '/qr.svg': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
}

const docsProxy = {
  target: 'http://127.0.0.1:5190',
  changeOrigin: true,
  ws: true,
}

export default defineConfig({
  plugins: [svelte(), tailwindcss(), compressedShortLinkPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      ...apiProxy,
      '/docs': docsProxy,
      '/_next': docsProxy,
      '/docs-search': docsProxy,
      '/og': docsProxy,
      '/llms.txt': docsProxy,
      '/llms-full.txt': docsProxy,
      '/llms.mdx': docsProxy,
    },
  },
  preview: {
    proxy: {
      ...apiProxy,
      '/docs': docsProxy,
      '/_next': docsProxy,
      '/docs-search': docsProxy,
      '/og': docsProxy,
      '/llms.txt': docsProxy,
      '/llms-full.txt': docsProxy,
      '/llms.mdx': docsProxy,
    },
  },
})
