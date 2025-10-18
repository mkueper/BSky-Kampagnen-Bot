import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
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
