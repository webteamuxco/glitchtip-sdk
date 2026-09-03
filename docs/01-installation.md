# 1. Installation

The package is published **publicly on [npm](https://www.npmjs.com/package/@webteamuxco/glitchtip-sdk)** under the `@webteamuxco` scope. No registry configuration or auth token is required — install it like any public package.

## 1.1 Install the package

The SDK declares all Sentry peers as **optional** — install only the one you need.

### NestJS

```bash
pnpm add @webteamuxco/glitchtip-sdk @sentry/node
```

### Next.js

```bash
pnpm add @webteamuxco/glitchtip-sdk @sentry/nextjs
```

### React (Vite / CRA / SPA)

```bash
pnpm add @webteamuxco/glitchtip-sdk @sentry/react
```

### Plain Node (Express, Fastify, worker, script)

```bash
pnpm add @webteamuxco/glitchtip-sdk @sentry/node
```

Then import from `@webteamuxco/glitchtip-sdk/node` — see [06-node.md](./06-node.md).

## 1.2 Scaffold the integration (optional)

The `init` command detects the framework from `package.json` and writes:

- `.env.example` with `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` (plus `NEXT_PUBLIC_SENTRY_DSN` for Next)
- `src/glitchtip.bootstrap.ts` for NestJS
- `instrumentation.ts` + `instrumentation-client.ts` for Next.js

```bash
pnpm dlx @webteamuxco/glitchtip-sdk init
```

> `init` does not touch `AppModule.ts` or `layout.tsx` — you still need to wire the bootstrap by hand (see framework-specific pages).

## 1.3 Environment variables

| Variable | Side | Purpose |
| -------- | ---- | ------- |
| `GLITCHTIP_DSN` | Server | Main DSN (legacy alias of `SENTRY_DSN`) |
| `SENTRY_DSN` | Server | DSN — used if `GLITCHTIP_DSN` is missing |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser (Next) | DSN exposed to the client bundle |
| `NEXT_PUBLIC_GLITCHTIP_DSN` | Browser (Next) | Alias of the above |
| `APP_ENV` | Server | `development` / `staging` / `production` |
| `SENTRY_ENVIRONMENT` | Server | Same — wins over `APP_ENV` if both are set |
| `APP_RELEASE` / `SENTRY_RELEASE` | Server | Release tag (defaults to `npm_package_version`) |
| `GLITCHTIP_ENABLE_LOGS` / `SENTRY_ENABLE_LOGS` | Server | Set to `true` to enable the GlitchTip logs feature |

Resolution order lives in [src/core/defaults.ts:33-41](../src/core/defaults.ts#L33-L41).
