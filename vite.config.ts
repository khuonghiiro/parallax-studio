import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@parallax/contracts': path.resolve(
        __dirname, 'packages/contracts/src/index.ts',
      ),
      '@parallax/core': path.resolve(
        __dirname, 'packages/core/src/index.ts',
      ),
      '@parallax/application': path.resolve(
        __dirname, 'packages/application/src/index.ts',
      ),
      '@parallax/runtime': path.resolve(
        __dirname, 'packages/runtime/src/index.ts',
      ),
    },
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: true,
      },
    },
  },

  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
