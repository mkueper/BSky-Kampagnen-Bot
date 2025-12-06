import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import path from "node:path";
import process from "node:process";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(currentDir, "..");

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Link the workspace package as source so Vite transpiles JSX
      "bsky-client": path.resolve(workspaceRoot, "bsky-client/src"),
      "@bsky-kampagnen-bot/shared-logic": path.resolve(workspaceRoot, "packages/shared-logic/src"),
    },
  },
  optimizeDeps: {
    include: ["emoji-mart", "@emoji-mart/data"],
  },
  server: {
    host: '0.0.0.0',
    fs: {
      // allow serving files from one directory up (monorepo workspace)
      allow: [workspaceRoot],
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_UPLOAD_BASE || 'http://localhost:3000',
        changeOrigin: true,
      },
      '/temp': {
        target: process.env.VITE_UPLOAD_BASE || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    globals: true,
    pool: 'threads',
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/__tests__/**', 'src/main.jsx']
    }
  }
});
