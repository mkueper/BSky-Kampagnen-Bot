import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Suche nach Testdateien im 'src' Verzeichnis,
    // die auf .test.js enden.
    include: ['src/**/*.test.js'],

    // Die Testumgebung für das Backend ist 'node'.
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup.alias.js'],
  },
  resolve: {
    alias: {
      '@api': new URL('./src/api', import.meta.url).pathname,
      '@core': new URL('./src/core', import.meta.url).pathname,
      '@data': new URL('./src/data', import.meta.url).pathname,
      '@platforms': new URL('./src/platforms', import.meta.url).pathname,
      '@utils': new URL('./src/utils', import.meta.url).pathname,
      '@config': new URL('./src/config.js', import.meta.url).pathname,
      '@env': new URL('./src/env.js', import.meta.url).pathname,
    },
  },
});
