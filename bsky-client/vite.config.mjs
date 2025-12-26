import process from 'node:process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendPort = env.BACKEND_PORT || env.BACKEND_INTERNAL_PORT || env.APP_PORT || '35123'
  const backendHost = env.BACKEND_HOST || '127.0.0.1'
  const backendTarget = env.BACKEND_URL || `http://${backendHost}:${backendPort}`
  const frontendPort = Number(env.FRONTEND_PORT) || 5174
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const workspaceRoot = path.resolve(currentDir, '..')
  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@bsky-kampagnen-bot/shared-logic': path.resolve(workspaceRoot, 'packages/shared-logic/src')
      }
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('/@atproto/api/dist/client/lexicons')) return 'atproto-lexicons'
              if (id.includes('/@atproto/api/dist/client/')) return 'atproto-client'
              if (id.includes('/@atproto/')) return 'atproto'
              if (id.includes('/@emoji-mart/data/')) return 'emoji-data'
              if (id.includes('/emoji-mart/')) return 'emoji'
              if (id.includes('/@emoji-mart/')) return 'emoji'
              if (id.includes('/react/')) return 'react'
              if (id.includes('/react-dom/')) return 'react'
              if (id.includes('/react-router/')) return 'router'
              if (id.includes('/react-router-dom/')) return 'router'
              if (id.includes('/@radix-ui/')) return 'radix'
              if (id.includes('/zod/')) return 'zod'
              if (id.includes('/swr/')) return 'swr'
              return undefined
            }
            if (id.includes('/src/modules/timeline/SkeetItem')) return 'skeet-item'
            if (id.includes('/src/i18n/messages')) return 'i18n'
            if (id.includes('/modules/notifications/')) return 'notifications'
            if (id.includes('/modules/profile/')) return 'profile'
            return undefined
          }
        }
      }
    },
    server: {
      port: frontendPort,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          secure: false
        },
        '/sse': {
          target: backendTarget,
          changeOrigin: true,
          secure: false
        },
        '/health': {
          target: backendTarget,
          changeOrigin: true,
          secure: false
        }
      }
    },
    preview: {
      port: frontendPort,
      strictPort: true
    }
  }
})
