import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname, 'src/web'),
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: resolve(__dirname, 'dist/web'),
    emptyOutDir: true,
  },
});
