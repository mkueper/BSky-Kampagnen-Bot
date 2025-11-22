import { mergeConfig, defineConfig } from 'vitest/config'
import baseConfig from './vite.config.mjs'

export default defineConfig((configEnv) => {
  const resolvedBase = typeof baseConfig === 'function' ? baseConfig(configEnv) : baseConfig
  return mergeConfig(resolvedBase, {
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './vitest.setup.js',
      include: ['src/**/*.test.{js,jsx,ts,tsx}'],
      css: true,
      pool: 'threads'
    }
  })
})
