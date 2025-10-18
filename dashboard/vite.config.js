import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Link the workspace package as source so Vite transpiles JSX
      "bsky-client": path.resolve(__dirname, "../bsky-client/src"),
    },
  },
  optimizeDeps: {
    include: ["emoji-mart", "@emoji-mart/data"],
  },
  server: {
    fs: {
      // allow serving files from one directory up (monorepo workspace)
      allow: [path.resolve(__dirname, "..")],
    },
  },
});
