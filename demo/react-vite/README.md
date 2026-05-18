# Demo — React (Vite)

```bash
cp .env.example .env.local   # then paste your VITE_GLITCHTIP_DSN
pnpm install
pnpm dev
```

Open http://localhost:5173 and click the buttons. Errors and messages
should appear in your GlitchTip project within a few seconds.

The SDK is linked locally via `file:../..` — rebuild the SDK
(`pnpm build` at the repo root) after changing `src/`.
