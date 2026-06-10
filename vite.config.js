import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  test: {
    environment: 'node',
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
