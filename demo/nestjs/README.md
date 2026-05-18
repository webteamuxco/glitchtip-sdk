# Demo — NestJS

```bash
cp .env.example .env             # then paste GLITCHTIP_DSN
pnpm install
pnpm start
```

Then hit the demo endpoints:

| Route             | What it shows                                            |
| ----------------- | -------------------------------------------------------- |
| `GET /`           | Index / route list                                       |
| `GET /boom`       | Uncaught `Error` → reported by the global filter         |
| `GET /http-error` | `HttpException` 400 → ignored (4xx are not forwarded)    |
| `GET /captured`   | Manual `captureWithContext` with tags                    |
| `GET /user`       | `setUser` attaches user identity to the next events      |

The SDK is linked locally via `file:../..` — rebuild the SDK
(`pnpm build` at the repo root) after changing `src/`.
