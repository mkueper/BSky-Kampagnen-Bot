// Simple stub for Vite browser dev: provides an appWindow.close that
// falls back to window.close(). In Tauri builds, this file is not used.
export const appWindow = {
  async close() {
    try { window.close() } catch {}
  }
}

