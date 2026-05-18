# Demo — Next.js (App Router)

```bash
cp .env.example .env.local   # then paste GLITCHTIP_DSN + NEXT_PUBLIC_GLITCHTIP_DSN
pnpm install
pnpm dev
```

Open http://localhost:3000 and trigger:

- Client errors via the buttons (init runs from `instrumentation-client.ts`)
- A server action error (init runs from `instrumentation.ts`)
- A route handler error at `/api/boom`

The SDK is linked locally via `file:../..` — rebuild the SDK
(`pnpm build` at the repo root) after changing `src/`.
