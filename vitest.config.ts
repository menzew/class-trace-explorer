import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          include: [
            'src/cli/**/*.test.ts',
            'src/core/**/*.test.ts',
            'tests/**/*.test.ts',
          ],
        },
      },
      {
        test: {
          name: 'web',
          globals: true,
          environment: 'jsdom',
          include: ['src/web/**/*.test.ts', 'src/web/**/*.test.tsx'],
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
});
