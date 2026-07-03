# @webteamuxco/glitchtip-sdk

Pre-configured error tracking wrapper for UXCO projects. Wraps the Sentry SDK
(GlitchTip is wire-compatible with Sentry) with UXCO defaults: DSN/env/release
resolution, PII scrubbing, sensible sample rates, and ready-to-mount NestJS &
Next.js integrations.

## Install

This package is published publicly on
[npm](https://www.npmjs.com/package/@webteamuxco/glitchtip-sdk) — no registry
configuration or auth token required.

FIRST: see [Onboarding](./docs/00-onboarding.md)

Then:

```bash
# NestJS
pnpm add @webteamuxco/glitchtip-sdk @sentry/node

# Next.js
pnpm add @webteamuxco/glitchtip-sdk @sentry/nextjs
```

Or run the installer in any project:

```bash
pnpm dlx @webteamuxco/glitchtip-sdk init
```

## Local dev server (Docker)

The package ships a Docker Compose stack so you can run GlitchTip locally
without touching shared infra. Commands operate on the compose file inside
`node_modules/@webteamuxco/glitchtip-sdk/templates/` — nothing is copied into your repo.

```bash
pnpm dlx @webteamuxco/glitchtip-sdk dev:up      # start stack + auto-create project + write DSN to .env
pnpm dlx @webteamuxco/glitchtip-sdk dev:logs    # tail web + worker logs
pnpm dlx @webteamuxco/glitchtip-sdk dev:down    # stop (keeps data)
pnpm dlx @webteamuxco/glitchtip-sdk dev:reset   # destroy volumes (events, users, projects)
```

What `dev:up` does:

1. Checks that `docker compose` is available
2. Runs migrations (one-shot container)
3. Starts `postgres`, `redis`, `mailpit`, `web`, `worker`
4. Waits for `http://localhost:8000` to be healthy (up to 2 min)
5. Prompts for admin email/password, org name, project name
6. Calls the GlitchTip API to register the user, create org/team/project, fetch the DSN
7. Writes `GLITCHTIP_DSN=` into your `.env.local` (or `.env`)

Alert notification emails (and any other mail GlitchTip sends) are captured by a
local **Mailpit** inbox at `http://localhost:8025` — nothing is delivered
externally. See [docs/02-local-dev.md §2.6](./docs/02-local-dev.md) to test an
alert end-to-end. Override the port with `MAILPIT_PORT=8125`.

Override the port with `GLITCHTIP_PORT=8100 pnpm dlx @webteamuxco/glitchtip-sdk dev:up`.

If the API provisioning fails (network, GlitchTip version mismatch, etc.) the
CLI prints a clear fallback: open the UI, create a project manually, paste the
DSN into `.env`.

> Requires Docker Desktop (or `docker-compose-plugin`). The stack uses ~600MB RAM idle.

## Environment variables

| Var                           | Purpose                                         |
| ----------------------------- | ----------------------------------------------- |
| `GLITCHTIP_DSN`               | Server DSN (also fallback for client)           |
| `NEXT_PUBLIC_GLITCHTIP_DSN`   | Public DSN for the browser bundle (Next.js)     |
| `APP_ENV`                     | `development` / `staging` / `production`        |
| `APP_RELEASE`                 | Release tag (defaults to `npm_package_version`) |

## NestJS

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { GlitchtipModule } from '@webteamuxco/glitchtip-sdk/nest';

@Module({
  imports: [GlitchtipModule.forRoot()],
})
export class AppModule {}
```

`forRoot()` registers a global exception filter (only forwards 5xx and
non-HttpException errors) and a global interceptor that adds request
breadcrumbs. Pass `{ registerGlobalFilter: false }` or
`{ registerGlobalInterceptor: false }` to opt out.

## Next.js

```ts
// instrumentation.ts
import { initServer } from '@webteamuxco/glitchtip-sdk/next/server';
export const register = async () => initServer();

// instrumentation-client.ts (or app/layout client component)
import { initClient } from '@webteamuxco/glitchtip-sdk/next/client';
initClient();
```

## Manual usage

```ts
import {
  initErrorTracking,
  captureWithContext,
  captureMessage,
  setUser,
  log,
} from '@webteamuxco/glitchtip-sdk';

initErrorTracking();
setUser({ id: user.id, email: user.email });

// Exception with a stack trace, classified as an "error" issue by default.
captureWithContext(err, { tags: { feature: 'checkout' } });

// Same exception, but classified as a "warning" issue (non-blocking).
captureWithContext(err, { level: 'warning', tags: { feature: 'checkout' } });

// Text-only event (no stack trace) — surfaces a warning/info/fatal "issue".
captureMessage('Stock low for SKU 42', { level: 'warning', extra: { sku: 42 } });

log.info('checkout completed', { orderId: '123' });
```

`captureMessage` and the `level` option on `captureWithContext` accept any of
`'fatal' | 'error' | 'warning' | 'info' | 'debug'` (exported as the
`CaptureLevel` type). Use them to distinguish actionable errors from softer
signals (warnings, info notices) in the GlitchTip issues list, separately from
the `log` stream.

### Isomorphic helpers

The root entry (`@webteamuxco/glitchtip-sdk`) exposes `captureWithContext`,
`captureMessage`, `setUser`, `addBreadcrumb`, `flush` and `log` on top of
`@sentry/core`, so it can be imported from both server and browser code
(Next.js Client Components, React apps bundled for the browser, etc.) without
pulling `@sentry/node`.

Bundlers select the right build via the `browser` export condition:

- Node (server) → `dist/core/index.js` (includes `initErrorTracking`).
- Browser bundle → `dist/core/index.browser.js` (no `@sentry/node`; calling
  `initErrorTracking()` throws — use `initClient` from `./next/client` or
  `./react` instead).

## Defaults applied

- `tracesSampleRate`: 1.0 in dev, 0.1 in prod
- `beforeSend`: scrubs `password`, `token`, `secret`, `authorization`, `cookie`, `apikey`
- `ignoreErrors`: common noisy browser errors
- `debug`: enabled outside production

All overridable via `initErrorTracking(opts)` or `GlitchtipModule.forRoot(opts)`.

## Releasing

Tag with `v*` and push — the GitHub Action publishes publicly to npm.

```bash
pnpm version patch
git push --follow-tags
```

## DOCUMENTATIONS

### SDK

- [Global](./docs/README.md)
- [Onboarding](./docs/00-onboarding.md)
- [Installation](./docs/01-installation.md)
- [Local Dev](./docs/02-local-dev.md)
- [NestJS](./docs/03-nestjs.md)
- [NextJS](./docs/04-nextjs.md)
- [React](./docs/05-react.md)

## Tests

- [Unit Tests](./test/README.md)


### Demos

- [Global](./demo/README.md)
- [NestJS](./demo/nestjs/README.md)
- [NextJS](./demo/nextjs/README.md)
- [React - Vite](./demo/react-vite/README.md)