import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globals: false,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/cli/**', 'src/**/index.ts'],
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: [
      { find: /^(\.{1,2}\/.*)\.js$/, replacement: '$1.ts' },
    ],
  },
});
