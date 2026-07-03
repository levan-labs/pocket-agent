import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During dev the Vite server (5173) proxies /api to the backend (5174).
// In production the backend serves the built files, so no proxy is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on 0.0.0.0 so Acode / another device can reach it
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5174',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    // Keep the bundle small and avoid inlining large assets on mobile.
    chunkSizeWarningLimit: 800
  }
});
