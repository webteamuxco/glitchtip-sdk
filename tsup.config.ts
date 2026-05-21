import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'core/index': 'src/core/index.ts',
    'core/index.browser': 'src/core/index.browser.ts',
    'nest/index': 'src/nest/index.ts',
    'next/index': 'src/next/index.ts',
    'next/client': 'src/next/client.ts',
    'next/server': 'src/next/server.ts',
    'react/index': 'src/react/index.ts',
    'cli/index': 'src/cli/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: 'node20',
  external: [
    '@sentry/core',
    '@sentry/node',
    '@sentry/nextjs',
    '@sentry/react',
    '@nestjs/common',
    '@nestjs/core',
    'next',
    'react',
    'rxjs',
  ],
});
