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
          manualChunks: {
            react: ['react', 'react-dom'],
            radix: ['@radix-ui/react-icons']
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
