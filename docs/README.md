# `@uxco/glitchtip` documentation

Concrete, copy-paste-ready use cases for integrating and testing the `@uxco/glitchtip` SDK in a real project.

Each page contains snippets you can drop into a project, intentionally-broken routes/handlers you can use to verify that errors reach GlitchTip, and the env vars required.

## Table of contents

| # | File | For who? |
| - | ---- | -------- |
| 1 | [01-installation.md](./01-installation.md) | Everyone — install the package, configure the GitHub Packages registry |
| 2 | [02-local-dev.md](./02-local-dev.md) | Everyone — spin up a local GlitchTip instance with Docker |
| 3 | [03-nestjs.md](./03-nestjs.md) | NestJS projects (API / backend) |
| 4 | [04-nextjs.md](./04-nextjs.md) | Next.js projects (App Router & Pages Router) |
| 5 | [05-react.md](./05-react.md) | React SPAs (Vite, CRA — anything non-Next) |
| 6 | [06-core-api.md](./06-core-api.md) | Manual usage (Node scripts, workers, lambdas) |
| 7 | [07-testing.md](./07-testing.md) | How to trigger errors to verify everything is wired |
| 8 | [08-troubleshooting.md](./08-troubleshooting.md) | When nothing shows up |

## TL;DR

```bash
# 1. Configure the registry (.npmrc in the consuming project)
echo "@uxco:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=\${GITHUB_TOKEN}" >> .npmrc

# 2. Install the SDK + the matching Sentry peer
pnpm add @uxco/glitchtip @sentry/node          # NestJS / Node
pnpm add @uxco/glitchtip @sentry/nextjs        # Next.js
pnpm add @uxco/glitchtip @sentry/react         # React SPA

# 3. Start GlitchTip locally (writes the DSN into .env)
pnpm dlx @uxco/glitchtip dev:up

# 4. Scaffold the integration (env.example + bootstrap file)
pnpm dlx @uxco/glitchtip init
```

Once the DSN is in `.env`, follow the page matching your stack to wire the SDK in and test it.
