# 0. Onboarding — Consume `@webteamuxco/glitchtip-sdk` in a project

End-to-end guide to authenticate, install, configure and verify the SDK in **any** consumer project (NestJS, Next.js, React, plain Node).

This guide uses placeholder variables. Replace them with your real values:

| Placeholder | Meaning | Example |
| ----------- | ------- | ------- |
| `<GH_USERNAME>` | Your personal GitHub username | `jdoe` |
| `<GH_EMAIL>` | The email tied to your GitHub account | `j.doe@uxco-group.com` |
| `<GH_PAT>` | Your Personal Access Token (classic) | `ghp_AbCdEf123…` |
| `<GH_ORG>` | GitHub organization that owns the package | `webteamuxco` |
| `<PKG_NAME>` | Full package name (scope + name) | `@webteamuxco/glitchtip-sdk` |
| `<PROJECT_DIR>` | Absolute path of the consumer project | `/home/<user>/www/uxco-tunnel-reservation` |
| `<PROJECT_NAME>` | Short project identifier | `uxco-tunnel-reservation` |
| `<DSN>` | DSN issued by your GlitchTip instance | `http://abc123@localhost:8000/1` |

---

## Step 1 — Personal Access Token (one-time, per developer)

GitHub Packages requires authentication even for **public** packages.

1. Sign in as `<GH_USERNAME>` on https://github.com
2. Go to **Settings → Developer settings → Personal access tokens → Tokens (classic)**
3. Click **Generate new token (classic)**
4. Configure:
   - **Note**: `glitchtip-sdk read`
   - **Expiration**: 90 days (or custom)
   - **Scopes**: `read:packages` (mandatory). Add `write:packages` only if you will publish.
5. Click **Generate token** and copy the value — this is `<GH_PAT>`.

> ⚠️ The token is shown **once**. If you lose it, regenerate a new one.

### 1.1 — Confirm SSO / org access

If `<GH_ORG>` enforces SSO, click **Configure SSO** next to the new token and authorize the organization. Without this step `npm` will return `401 Unauthorized`.

---

## Step 2 — Expose the token to your shell (per developer)

Append to `~/.bashrc` (or `~/.zshrc`):

```bash
export GITHUB_TOKEN=<GH_PAT>
```

Reload:

```bash
source ~/.bashrc       # or: source ~/.zshrc
```

Sanity check:

```bash
echo $GITHUB_TOKEN     # must print your token
```

> **Never commit the raw token**. The `.npmrc` we create below references `${GITHUB_TOKEN}` so the variable is resolved at install time.

---

## Step 3 — Configure the registry in the consumer project (one-time, per project)

From `<PROJECT_DIR>`:

```bash
cd <PROJECT_DIR>
```

Create a `.npmrc` at the project root:

```ini
@<GH_ORG>:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
always-auth=true
```

Concrete example with `<GH_ORG>` = `webteamuxco`:

```ini
@webteamuxco:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
always-auth=true
```

### 3.1 — Make sure `.npmrc` is safe to commit

Because we use `${GITHUB_TOKEN}` (not the raw token), the file **is** safe to commit. Other developers and CI need it to install the package. Verify it does not contain a literal `ghp_…` value before pushing.

If you ever paste the raw token by accident, add `.npmrc` to `.gitignore` and rotate the token.

---

## Step 4 — Install the SDK

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

### 4.1 — Verify the install

```bash
pnpm list @webteamuxco/glitchtip-sdk
# → @webteamuxco/glitchtip-sdk x.y.z
```

If you get `401 Unauthorized`:
- `$GITHUB_TOKEN` is not exported in the current shell — re-run `source ~/.bashrc`
- The token lacks `read:packages` — recreate it
- SSO is not authorized for `<GH_ORG>` — see step 1.1

---

## Step 5 — Get a DSN

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

Ask your team (or your ops contact) for the DSN of the `<PROJECT_NAME>` project on the shared GlitchTip instance, then paste it into your environment file (see Step 6).

---

## Step 6 — Environment variables (per environment)

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

## Step 7 — Scaffold the integration (optional)

The CLI generates an `.env.example` and a bootstrap file matching your framework:

```bash
pnpm dlx <PKG_NAME> init
```

It detects NestJS, Next.js or React from your `package.json`. It does **not** edit your `AppModule.ts` / `layout.tsx` — you wire the bootstrap manually using the framework guide below.

---

## Step 8 — Wire the SDK (framework-specific)

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

## Step 9 — Verify the integration

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

## Step 10 — CI / CD

In CI, expose `GITHUB_TOKEN` so `pnpm install` can fetch the package.

### GitHub Actions (same org as the package)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    registry-url: https://npm.pkg.github.com
    scope: '@<GH_ORG>'

- run: pnpm install --frozen-lockfile
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`secrets.GITHUB_TOKEN` works out of the box if the workflow repo lives in the same org as the package. Otherwise create a fine-grained PAT with `read:packages` and store it as `secrets.GH_PACKAGES_TOKEN`, then map it to `NODE_AUTH_TOKEN`.

### Bitbucket / GitLab / other

Define `GITHUB_TOKEN` as a masked variable on the runner, then `pnpm install` works identically to local dev because `.npmrc` references `${GITHUB_TOKEN}`.

---

## Variables recap

| Scope | Variable | Set where |
| ----- | -------- | --------- |
| Per developer | `GITHUB_TOKEN` (= `<GH_PAT>`) | `~/.bashrc` / `~/.zshrc` |
| Per developer | SSO authorization for `<GH_ORG>` | GitHub token page |
| Per project | `.npmrc` (scope + registry) | `<PROJECT_DIR>/.npmrc` (committed) |
| Per environment | `GLITCHTIP_DSN` | `.env` / `.env.local` |
| Per environment | `NEXT_PUBLIC_GLITCHTIP_DSN` | `.env` / `.env.local` (Next only) |
| Per environment | `APP_ENV`, `APP_RELEASE` | `.env` / `.env.local` |
| Per CI job | `NODE_AUTH_TOKEN` (mapped from `GITHUB_TOKEN`) | CI secrets |

---

## Quick reference — full flow

```bash
# 1. Token in shell (once per developer)
export GITHUB_TOKEN=<GH_PAT>

# 2. Registry in project (once per project)
cd <PROJECT_DIR>
cat > .npmrc <<EOF
@<GH_ORG>:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}
always-auth=true
EOF

# 3. Install
pnpm add <PKG_NAME> @sentry/nextjs    # adapt to your stack

# 4. Local DSN
pnpm dlx <PKG_NAME> dev:up

# 5. Scaffold (optional)
pnpm dlx <PKG_NAME> init

# 6. Wire the SDK (see framework guide)

# 7. Verify
curl http://localhost:3000/api/debug-throw
```
