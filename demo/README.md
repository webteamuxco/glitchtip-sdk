# Demos

End-to-end sample apps that consume `@webteamuxco/glitchtip-sdk` via a local `file:../..`
link. These are **not published** to npm — the package's `files` whitelist in
[`/package.json`](../package.json) only ships `dist/`, `templates/` and the
top-level `README.md`.

| Demo                                       | Stack                       |
| ------------------------------------------ | --------------------------- |
| [`react-vite/`](./react-vite/README.md)    | React 19 + Vite             |
| [`nextjs/`](./nextjs/README.md)            | Next.js 15 (App Router)     |
| [`nestjs/`](./nestjs/README.md)            | NestJS 11 + Express         |

## Prerequisites

1. Build the SDK once from the repo root so `dist/` exists:

   ```bash
   pnpm install
   pnpm build
   ```

2. Have a GlitchTip DSN ready. You can spin up a local instance with:

   ```bash
   pnpm dlx @webteamuxco/glitchtip-sdk dev:up
   ```

3. `cd demo/<stack>`, copy `.env.example`, install, run.

Rebuild the SDK (`pnpm build` at the root) any time you change `src/` —
the demos read from `dist/` through the local file link.
