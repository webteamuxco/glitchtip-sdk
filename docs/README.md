# `@webteamuxco/glitchtip-sdk` documentation

Concrete, copy-paste-ready use cases for integrating and testing the `@webteamuxco/glitchtip-sdk` SDK in a real project.

Each page contains snippets you can drop into a project, intentionally-broken routes/handlers you can use to verify that errors reach GlitchTip, and the env vars required.

## Table of contents

| # | File | For who? |
| - | ---- | -------- |
| 0 | [00-onboarding.md](./00-onboarding.md) | Everyone — full step-by-step (install, DSN, wiring, CI) with placeholder variables |
| 1 | [01-installation.md](./01-installation.md) | Everyone — install the package from npm |
| 2 | [02-local-dev.md](./02-local-dev.md) | Everyone — spin up a local GlitchTip instance with Docker |
| 3 | [03-nestjs.md](./03-nestjs.md) | NestJS projects (API / backend) |
| 4 | [04-nextjs.md](./04-nextjs.md) | Next.js projects (App Router & Pages Router) |
| 5 | [05-react.md](./05-react.md) | React SPAs (Vite, CRA — anything non-Next) |
| 6 | [06-core-api.md](./06-core-api.md) | Manual usage (Node scripts, workers, lambdas) |
| 7 | [07-testing.md](./07-testing.md) | How to trigger errors to verify everything is wired |
| 8 | [08-troubleshooting.md](./08-troubleshooting.md) | When nothing shows up |

## TL;DR

```bash
# 1. Install the SDK + the matching Sentry peer (public package, no auth needed)
pnpm add @webteamuxco/glitchtip-sdk @sentry/node          # NestJS / Node
pnpm add @webteamuxco/glitchtip-sdk @sentry/nextjs        # Next.js
pnpm add @webteamuxco/glitchtip-sdk @sentry/react         # React SPA

# 2. Start GlitchTip locally (writes the DSN into .env)
pnpm dlx @webteamuxco/glitchtip-sdk dev:up

# 3. Scaffold the integration (env.example + bootstrap file)
pnpm dlx @webteamuxco/glitchtip-sdk init
```

Once the DSN is in `.env`, follow the page matching your stack to wire the SDK in and test it.
