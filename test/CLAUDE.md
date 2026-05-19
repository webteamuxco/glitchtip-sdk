# CLAUDE.md — Test suite guide

Instructions for working on this SDK's test suite. For general docs, see [README.md](./README.md).

## Stack

- **Runner**: Vitest (config in [../vitest.config.ts](../vitest.config.ts))
- **Mocking**: Vitest's native `vi.mock` — never bring in an external library
- **Target**: code under [../src/](../src/) except [../src/cli/](../src/cli/) (tooling, not business logic)

## Rules to follow

### 1. Mirror the `src/` structure

Every module at `src/<area>/<file>.ts` gets a matching `test/<area>/<file>.test.ts`. Don't bundle multiple modules into one test file.

### 2. Mock the Sentry SDKs, not the logic under test

SDK source files import `@sentry/node`, `@sentry/nextjs`, `@sentry/react`. **Always** mock them:

```ts
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  // ... whatever the test needs
}));
```

**Never**:
- let the real Sentry initialize (pollutes env, may hit the network)
- mock `resolveDefaults`, `scrubPII`, or any function from [../src/core/](../src/core/) — that's the thing we want to test
- test Sentry's internal behavior (sampling, transport, etc.)

### 3. `.js` imports in source code

The source code uses `.js` imports (NodeNext style) that resolve to TS files:

```ts
// in src/core/init.ts
import { resolveDefaults } from './defaults.js';
```

In tests, import **with the same `.js` extension** — the Vitest alias handles the rest:

```ts
// in test/core/init.test.ts
import { initErrorTracking } from '../../src/core/init.js';
```

### 4. Environment variables

Several tests depend on `process.env` (DSN, NODE_ENV, etc.). Required pattern:

```ts
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  // Delete the keys relevant to this file
  for (const key of ['SENTRY_DSN', 'GLITCHTIP_DSN', 'NODE_ENV']) {
    delete process.env[key];
  }
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});
```

Without this snapshot/restore, test execution order can leak values across files.

### 5. Nest tests

- Import `import 'reflect-metadata';` on the **very first line** of the file (decorators `@Catch`, `@Injectable`, `@Module` need it)
- **Don't** boot a full Nest module with `Test.createTestingModule` — too heavy for unit tests
- Instantiate the classes directly (`new GlitchtipExceptionFilter()`) and hand-build minimal `ArgumentsHost`/`ExecutionContext`:

```ts
function buildHost(req: { url?: string }) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => req,
    }),
  } as unknown as ArgumentsHost;
}
```

### 6. Idempotency and module-level state

For modules with module-level state (e.g. `let initialized = false` in [../src/core/init.ts](../src/core/init.ts)), use `vi.resetModules()` + `await import(...)` to start from a fresh state in each test:

```ts
async function loadInit() {
  vi.resetModules();
  return await import('../../src/core/init.js');
}

it('is idempotent', async () => {
  const { initErrorTracking } = await loadInit();
  // ...
});
```

### 7. What we test, what we don't

**We test**:
- option resolution (precedence opts > env > defaults)
- conditional branches (`if (status >= 500)`, `if (!isHttp)`, etc.)
- data serialization/transformation (`toLogMessage`, `scrubPII`, `buildAttributes`)
- the arguments actually passed to the Sentry SDKs
- idempotency when it applies

**We don't test**:
- TypeScript types (the typecheck handles that)
- pure re-exports (each folder's `index.ts`)
- the CLI (`src/cli/` — tooling)
- internal behavior of Sentry/NestJS/React

### 8. Naming

- Describe the **expected behavior**, not the implementation:
  - ✅ `it('falls back to GLITCHTIP_DSN when SENTRY_DSN is unset')`
  - ❌ `it('uses ?? operator on env vars')`
- Group by function/class with `describe('functionName', ...)`

### 9. Pre-commit hook

The suite runs on pre-commit via Husky ([.husky/pre-commit](../.husky/pre-commit) → `pnpm test`). A broken test blocks the commit. **Never** suggest `--no-verify` to bypass it — if the suite fails, fix the cause.

## Anti-patterns to avoid

- **Partially mocking Sentry without an accessible `__mocks` handle**: if a test needs to assert calls on the `scope` (`setTag`, `setExtra`), expose those mocks via a `__mocks` property on the `vi.mock` factory instead of recreating them in each test.
- **Forgetting `vi.mocked(fn).mockClear()`**: between tests within the same `describe`, call counts persist. `clearMocks: true` in the config covers the global case, but if you re-import a module via `vi.resetModules()`, remember to re-mock.
- **Asserting on call order** instead of contents: `expect(fn).toHaveBeenCalledWith(...)` is more robust than `expect(fn.mock.calls[2][0]).toBe(...)`.
