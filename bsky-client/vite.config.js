import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('/@atproto/api/dist/client/lexicons')) return 'atproto-lexicons';
            if (id.includes('/@atproto/api/dist/client/')) return 'atproto-client';
            if (id.includes('/@atproto/')) return 'atproto';
            if (id.includes('/@emoji-mart/data/')) return 'emoji-data';
            if (id.includes('/emoji-mart/')) return 'emoji';
            if (id.includes('/@emoji-mart/')) return 'emoji';
            if (id.includes('/react/')) return 'react';
            if (id.includes('/react-dom/')) return 'react';
            if (id.includes('/react-router/')) return 'router';
            if (id.includes('/react-router-dom/')) return 'router';
            if (id.includes('/@radix-ui/')) return 'radix';
            if (id.includes('/zod/')) return 'zod';
            if (id.includes('/swr/')) return 'swr';
            return undefined;
          }
          if (id.includes('/src/modules/timeline/SkeetItem')) return 'skeet-item';
          if (id.includes('/src/i18n/messages')) return 'i18n';
          if (id.includes('/modules/notifications/')) return 'notifications';
          if (id.includes('/modules/profile/')) return 'profile';
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
  },
});
