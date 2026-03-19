import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    proxy: {
      // OpenAI proxy
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('[Vite Proxy] OpenAI path:', req.url, '→ target: https://api.openai.com' + req.url);
          });
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            console.log('[Vite Proxy] OpenAI response status:', proxyRes.statusCode);
          });
        },
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        secure: true,
      },
      // Anthropic proxy
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('[Vite Proxy] Anthropic path:', req.url, '→ target: https://api.anthropic.com' + req.url);
          });
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            console.log('[Vite Proxy] Anthropic response status:', proxyRes.statusCode);
          });
        },
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
        secure: true,
      },
      // z.ai proxy - endpoint is https://api.z.ai/api/paas/v4
      '/api/zai': {
        target: 'https://api.z.ai/api/paas/v4',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('[Vite Proxy] z.ai path:', req.url, '→ target: https://api.z.ai/api/paas/v4' + req.url);
          });
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            console.log('[Vite Proxy] z.ai response status:', proxyRes.statusCode);
          });
        },
        rewrite: (path) => path.replace(/^\/api\/zai/, ''),
        secure: true,
      },
    },
  },
})
