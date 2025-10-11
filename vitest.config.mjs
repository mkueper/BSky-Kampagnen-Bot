import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Suche nach Testdateien im 'src' Verzeichnis,
    // die auf .test.js enden.
    include: ['src/**/*.test.js'],

    // Die Testumgebung für das Backend ist 'node'.
    environment: 'node',
  },
});
