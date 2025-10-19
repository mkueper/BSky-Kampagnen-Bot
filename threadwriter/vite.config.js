import { defineConfig, splitVendorChunkPlugin } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const r = (p) => path.resolve(__dirname, p)
import react from '@vitejs/plugin-react'
const isTauri = process.env.TAURI_PLATFORM !== undefined

export default defineConfig({
  plugins: [
    react(),
    // helps auto-split large vendor chunks
    splitVendorChunkPlugin(),
  ],
  build: {
    // relax warning threshold a bit for modern libs
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // explicit chunking for heavy deps
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react'
            if (id.includes('@atproto')) return 'vendor-atproto'
          }
        },
      },
    },
  },
  resolve: {
    alias: [
      // Ensure Rollup resolves the ESM entry for emoji-mart react when statically imported
      { find: '@emoji-mart/react', replacement: r('node_modules/@emoji-mart/react/dist/module.js') },
      // In Browser/Vite Dev (ohne Tauri) auf Stubs verweisen, damit Import-Analyse nicht fehlschlägt
      ...(!isTauri ? [
        { find: '@tauri-apps/api/window', replacement: r('src/tauriWindowStub.js') },
        { find: '@tauri-apps/api/event', replacement: r('src/tauriEventStub.js') },
      ] : [])
    ],
  },
  optimizeDeps: {
    include: ['@emoji-mart/react', '@emoji-mart/data'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: r('src/test/setup.js'),
  },
})
