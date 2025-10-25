import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import path from "node:path";

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
    },
  },
  optimizeDeps: {
    include: ["emoji-mart", "@emoji-mart/data"],
  },
  server: {
    fs: {
      // allow serving files from one directory up (monorepo workspace)
      allow: [workspaceRoot],
    },
  },
});
