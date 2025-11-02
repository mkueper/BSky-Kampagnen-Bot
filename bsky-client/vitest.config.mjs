import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config.mjs';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './vitest.setup.js',
      include: ['src/**/*.test.{js,jsx,ts,tsx}'],
      css: true,
    },
  }),
);
