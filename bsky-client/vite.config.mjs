import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom']
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
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:35123',
        changeOrigin: true,
        secure: false
      },
      '/sse': {
        target: 'http://127.0.0.1:35123',
        changeOrigin: true,
        secure: false
      },
      '/health': {
        target: 'http://127.0.0.1:35123',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 5174,
    strictPort: true
  }
})
