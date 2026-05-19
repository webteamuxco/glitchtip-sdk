# Test suite — `@webteamuxco/glitchtip-sdk`

Unit tests for the SDK's business logic. Run with **Vitest** + mocks of the Sentry SDKs (`@sentry/node`, `@sentry/nextjs`, `@sentry/react`).

## Commands

```bash
pnpm test               # one-shot run
pnpm test:watch         # watch mode
pnpm test:coverage      # with coverage report (text + HTML in coverage/)
```

The suite runs automatically as a **pre-commit hook** via Husky ([.husky/pre-commit](../.husky/pre-commit)). The commit is rejected if any test fails.

## Layout

The `test/` folder is a **1:1 mirror of `src/`** (the CLI is excluded — it's tooling, not business logic):

```text
test/
├── core/
│   ├── defaults.test.ts      # resolveDefaults + scrubPII
│   ├── helpers.test.ts       # setUser, addBreadcrumb, captureWithContext, flush
│   ├── init.test.ts          # initErrorTracking (DSN, idempotency, enabled)
│   └── log.test.ts           # level forwarding to Sentry.logger
├── nest/
│   ├── filter.test.ts        # GlitchtipExceptionFilter
│   ├── interceptor.test.ts   # GlitchtipBreadcrumbInterceptor
│   ├── logger.test.ts        # UxcoLogger (serialization + params parsing)
│   └── module.test.ts        # GlitchtipModule.forRoot
├── next/
│   ├── client.test.ts        # DSN precedence on the Next.js client
│   └── server.test.ts        # DSN precedence on the Next.js server
└── react/
    └── init.test.ts          # initClient + browserTracingIntegration
```

## Mocking strategy

All Sentry SDKs are **mocked** with `vi.mock` at the top of each test file. We verify:

- the **arguments passed** to `Sentry.init`, `Sentry.captureException`, `Sentry.logger.*`
- the **surrounding business logic** (default resolution, env var precedence, message serialization, capture conditions, etc.)

We **never** test Sentry's own behavior — that's Sentry's responsibility.

### Typical example

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/node', () => ({
  setUser: vi.fn(),
  captureException: vi.fn(() => 'event-id'),
  withScope: vi.fn((cb) => cb({ setTag: vi.fn(), setExtra: vi.fn(), setUser: vi.fn() })),
}));

import * as Sentry from '@sentry/node';
import { setUser } from '../../src/core/helpers.js';

it('forwards user to Sentry', () => {
  setUser({ id: 1 });
  expect(Sentry.setUser).toHaveBeenCalledWith({ id: 1 });
});
```

## NestJS tests

Tests for Nest decorators (`@Catch`, `@Injectable`, `@Module`) require `reflect-metadata` — imported at the top of every `test/nest/*.test.ts` file. We avoid booting a full Nest module: we instantiate the classes directly and hand them a minimal hand-built `ArgumentsHost` or `ExecutionContext`.

## Env var tests

`resolveDefaults`, `initServer`, and `initClient` read from `process.env`. Every test that touches env:

1. Snapshots the original `process.env` in `beforeEach`
2. Deletes the relevant keys (`SENTRY_DSN`, `GLITCHTIP_DSN`, `NEXT_PUBLIC_*`, `NODE_ENV`, etc.)
3. Restores the full env in `afterEach`

This guarantees that execution order does not influence results.

## Vitest config

See [vitest.config.ts](../vitest.config.ts). Key points:

- `clearMocks: true` + `restoreMocks: true` — reset all mocks between tests
- `\.js$ → \.ts` alias — lets tests import source code that uses `.js` imports (NodeNext ESM style)
- Coverage excludes `src/cli/**` and `index.ts` files (pure re-exports)

## Adding a test

1. Create `test/<module>/<feature>.test.ts`
2. Mock the Sentry SDKs if needed (at the top of the file, **before** importing the code under test)
3. Target the logic: option precedence, conditional branches, data transformations
4. Run `pnpm test:watch` while developing

For more detailed conventions (especially when working with Claude), see [CLAUDE.md](./CLAUDE.md).
