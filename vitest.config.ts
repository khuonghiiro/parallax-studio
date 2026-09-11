import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@parallax/contracts': path.resolve(__dirname, 'packages/contracts/src/index.ts'),
      '@parallax/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
      '@parallax/application': path.resolve(__dirname, 'packages/application/src/index.ts'),
      '@parallax/runtime': path.resolve(__dirname, 'packages/runtime/src/index.ts'),
    },
  },
  test: {
    exclude: ['**/node_modules/**', 'scripts/**', 'dist/**'],
    include: ['packages/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
