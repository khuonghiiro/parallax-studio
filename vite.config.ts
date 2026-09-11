import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:4783', '/media': 'http://127.0.0.1:4783', '/renders': 'http://127.0.0.1:4783' } },
  build: { chunkSizeWarningLimit: 800, rollupOptions: { output: { manualChunks: { three: ['three'], react: ['react', 'react-dom'] } } } },
});
