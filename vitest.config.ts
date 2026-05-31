import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    environmentMatchGlobs: [
      ['src/web/**', 'jsdom'],
    ],
    setupFiles: ['./vitest.setup.ts'],
  },
});
