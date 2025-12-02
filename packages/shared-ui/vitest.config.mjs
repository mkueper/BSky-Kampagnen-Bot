import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic'
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.js',
    include: ['__tests__/**/*.test.{js,jsx,ts,tsx}'],
    css: true,
    pool: 'threads'
  }
})
