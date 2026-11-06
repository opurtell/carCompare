import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

// The Cloudflare plugin runs worker/index.ts inside workerd during `npm run dev`, so
// /api/research behaves exactly as in production (secrets come from .dev.vars).
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  server: {
    host: '127.0.0.1',
  },
})
