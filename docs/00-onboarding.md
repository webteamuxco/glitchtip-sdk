# 0. Onboarding — Consume `@webteamuxco/glitchtip-sdk` in a project

End-to-end guide to install, configure and verify the SDK in **any** consumer project (NestJS, Next.js, React, plain Node).

The package is published **publicly on [npm](https://www.npmjs.com/package/@webteamuxco/glitchtip-sdk)** — there is no registry setup, token or authentication step. Install it like any public package.

This guide uses placeholder variables. Replace them with your real values:

| Placeholder | Meaning | Example |
| ----------- | ------- | ------- |
| `<PKG_NAME>` | Full package name (scope + name) | `@webteamuxco/glitchtip-sdk` |
| `<PROJECT_DIR>` | Absolute path of the consumer project | `/home/<user>/www/uxco-tunnel-reservation` |
| `<PROJECT_NAME>` | Short project identifier | `uxco-tunnel-reservation` |
| `<DSN>` | DSN issued by your GlitchTip instance | `http://abc123@localhost:8000/1` |

---

## Step 1 — Install the SDK

The SDK declares all framework adapters as **optional peers**. Install only the matching Sentry peer for your stack.

```bash
# NestJS / plain Node
pnpm add <PKG_NAME> @sentry/node

# Next.js
pnpm add <PKG_NAME> @sentry/nextjs

# React SPA (Vite / CRA)
pnpm add <PKG_NAME> @sentry/react
```

Concrete example for a Next.js project:

```bash
pnpm add @webteamuxco/glitchtip-sdk @sentry/nextjs
```

### 1.1 — Verify the install

```bash
pnpm list @webteamuxco/glitchtip-sdk
# → @webteamuxco/glitchtip-sdk x.y.z
```

---

## Step 2 — Get a DSN

A DSN tells the SDK where to send events. Pick the option that fits your context.

### Option A — Local GlitchTip via Docker (development)

From `<PROJECT_DIR>`:

```bash
pnpm dlx <PKG_NAME> dev:up
```

The interactive wizard provisions an admin user, an org and a project, then writes `GLITCHTIP_DSN=<DSN>` into `.env.local` (or `.env`). UI: http://localhost:8000

Other lifecycle commands:

```bash
pnpm dlx <PKG_NAME> dev:logs    # tail web + worker
pnpm dlx <PKG_NAME> dev:down    # stop (data is kept)
pnpm dlx <PKG_NAME> dev:reset   # ⚠️ destroys all data
```

See [02-local-dev.md](./02-local-dev.md) for the full Docker workflow.

### Option B — Shared / staging / production GlitchTip

Ask your team (or your ops contact) for the DSN of the `<PROJECT_NAME>` project on the shared GlitchTip instance, then paste it into your environment file (see Step 3).

---

## Step 3 — Environment variables (per environment)

Add to `.env.local` (Next.js) or `.env` (NestJS / Node):

```bash
# Server-side DSN (mandatory)
GLITCHTIP_DSN=<DSN>

# Browser-side DSN (Next.js only — must be prefixed NEXT_PUBLIC_*)
NEXT_PUBLIC_GLITCHTIP_DSN=<DSN>

# Environment tag — drives sample rates & sourcemap stripping
APP_ENV=development            # development | staging | production

# Release tag — defaults to npm_package_version if omitted
APP_RELEASE=<PROJECT_NAME>@$(git rev-parse --short HEAD)
```

| Variable | Side | Required? |
| -------- | ---- | --------- |
| `GLITCHTIP_DSN` | Server | ✅ |
| `NEXT_PUBLIC_GLITCHTIP_DSN` | Browser (Next.js) | ✅ for client errors |
| `APP_ENV` | Server | recommended |
| `APP_RELEASE` | Server | recommended |
| `SENTRY_DSN` / `SENTRY_ENVIRONMENT` / `SENTRY_RELEASE` | Server | accepted aliases |

Resolution order: see [src/core/defaults.ts](../src/core/defaults.ts).

---

## Step 4 — Scaffold the integration (optional)

The CLI generates an `.env.example` and a bootstrap file matching your framework:

```bash
pnpm dlx <PKG_NAME> init
```

It detects NestJS, Next.js or React from your `package.json`. It does **not** edit your `AppModule.ts` / `layout.tsx` — you wire the bootstrap manually using the framework guide below.

---

## Step 5 — Wire the SDK (framework-specific)

Follow the page matching your stack:

| Stack | Guide |
| ----- | ----- |
| NestJS | [03-nestjs.md](./03-nestjs.md) |
| Next.js | [04-nextjs.md](./04-nextjs.md) |
| React SPA | [05-react.md](./05-react.md) |
| Plain Node / scripts / workers | [03-nestjs.md §3.6](./03-nestjs.md#36-use-case--background-job-bull-cron) (the `captureWithContext` pattern) |

Minimal wire-up snippets:

### Next.js

```ts
// instrumentation.ts
import { initServer } from '<PKG_NAME>/next/server';
export const register = async () => initServer();

// instrumentation-client.ts (Next 15+)
import { initClient } from '<PKG_NAME>/next/client';
initClient();
```

### NestJS

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { GlitchtipModule } from '<PKG_NAME>/nest';

@Module({ imports: [GlitchtipModule.forRoot()] })
export class AppModule {}
```

### React (Vite)

```tsx
// src/main.tsx
import { initClient } from '<PKG_NAME>/react';
initClient({ dsn: import.meta.env.VITE_GLITCHTIP_DSN });
```

---

## Step 6 — Verify the integration

Add a throw-away test endpoint or component, hit it, and confirm the event appears in your GlitchTip dashboard within ~10 seconds.

### NestJS

```ts
@Controller('debug')
export class DebugController {
  @Get('throw') throw() { throw new Error('Test GlitchTip — server'); }
}
```

```bash
curl http://localhost:3000/debug/throw
```

### Next.js (Route Handler)

```ts
// app/api/debug-throw/route.ts
export async function GET() { throw new Error('Test GlitchTip — server'); }
```

```bash
curl http://localhost:3000/api/debug-throw
```

### React

```tsx
function DebugThrow() { throw new Error('Test GlitchTip — render'); }
```

If nothing appears in the dashboard, see [08-troubleshooting.md](./08-troubleshooting.md).

---

## Step 7 — CI / CD

Because the package is public, `pnpm install` fetches it with no registry configuration or auth token — nothing special is required in CI.

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20

- run: pnpm install --frozen-lockfile
```

---

## Variables recap

| Scope | Variable | Set where |
| ----- | -------- | --------- |
| Per environment | `GLITCHTIP_DSN` | `.env` / `.env.local` |
| Per environment | `NEXT_PUBLIC_GLITCHTIP_DSN` | `.env` / `.env.local` (Next only) |
| Per environment | `APP_ENV`, `APP_RELEASE` | `.env` / `.env.local` |

---

## Quick reference — full flow

```bash
# 1. Install (public package — no auth needed)
cd <PROJECT_DIR>
pnpm add <PKG_NAME> @sentry/nextjs    # adapt to your stack

# 2. Local DSN
pnpm dlx <PKG_NAME> dev:up

# 3. Scaffold (optional)
pnpm dlx <PKG_NAME> init

# 4. Wire the SDK (see framework guide)

# 5. Verify
curl http://localhost:3000/api/debug-throw
```
