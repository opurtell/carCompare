import { defineConfig } from 'vitest/config'

// Separate from vite.config.ts so the Cloudflare plugin doesn't start a workerd dev server for unit tests.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
