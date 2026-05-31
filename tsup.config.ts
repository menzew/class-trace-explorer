import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { 'cli/bin': 'src/cli/bin.ts' },
  outDir: 'dist',
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  clean: false, // keep dist/web from the vite build
});
