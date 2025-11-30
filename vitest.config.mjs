import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Suche nach Testdateien in src und im dedizierten tests/-Ordner
    include: [
      'backend/src/**/*.test.{js,ts,jsx,tsx}',
      'backend/tests/**/*.test.{js,ts,jsx,tsx}',
      'bsky-client/src/**/*.test.{js,ts,jsx,tsx}',
      'dashboard/src/**/*.test.{js,ts,jsx,tsx}'
      //'tests/**/*.test.{js,ts,jsx,tsx}',
    ],
    watchExclude: ['dashboard/dist/**', 'dist/**', 'node_modules/**'],
    // Standard: Backend-Tests laufen in der Node-Umgebung.
    environment: 'jsdom',
    // Frontend-Tests (bsky-client, dashboard) nutzen jsdom mit window, document etc.
    environmentMatchGlobs: [
      ['backend/src/**', 'node'],
      ['backend/tests/**', 'node']
    ],
    globals: true,
    setupFiles: [
      new URL('./tests/setup.alias.js', import.meta.url).pathname,
      new URL('./backend/tests/setupTestDb.mjs', import.meta.url).pathname
    ]
  },
  resolve: {
    alias: {
      '@api': new URL('./backend/src/api', import.meta.url).pathname,
      '@core': new URL('./backend/src/core', import.meta.url).pathname,
      '@data': new URL('./backend/src/data', import.meta.url).pathname,
      '@platforms': new URL('./backend/src/platforms', import.meta.url)
        .pathname,
      '@utils': new URL('./backend/src/utils', import.meta.url).pathname,
      '@config': new URL('./backend/src/config.js', import.meta.url).pathname,
      '@env': new URL('./backend/src/env.js', import.meta.url).pathname
    }
  }
})
