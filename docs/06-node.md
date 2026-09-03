# 6. Node (Express, Fastify, workers, scripts)

The `@webteamuxco/glitchtip-sdk/node` subpath targets any Node process that is **not** NestJS or Next.js: an Express or Fastify API, a queue worker, a cron script, a lambda. It wraps `@sentry/node` with the UXCO defaults (DSN/env/release resolution, PII scrubbing, sample rates) and re-exports the Node-specific pieces of the Sentry SDK so you only import from one place.

```bash
pnpm add @webteamuxco/glitchtip-sdk @sentry/node
```

It exposes:

- `initNode(opts?)` — global init, returns `true` when tracking is active
- `createClient(opts?)` — isolated client bound to its own DSN
- `log` — structured logs (`trace` → `fatal`) shipped to GlitchTip
- the core helpers: `captureWithContext`, `captureMessage`, `setUser`, `addBreadcrumb`, `flush`
- from `@sentry/node`: `captureException`, `setTag`, `setContext`, `withScope`, `startSpan`, `close`, `httpIntegration`, `expressIntegration` / `setupExpressErrorHandler`, `fastifyIntegration` / `setupFastifyErrorHandler`, `koaIntegration` / `setupKoaErrorHandler`, `hapiIntegration` / `setupHapiErrorHandler`, `cron`, `withMonitor`, `captureCheckIn`, `captureConsoleIntegration`

## 6.1 Minimal setup

Sentry hooks `http`, Express, Fastify, `pg`, `mysql`, Redis, Prisma… by patching them **when they are first imported**. `initNode()` must therefore run before any of those modules is loaded.

### ESM — dedicated instrument file

```ts
// src/instrument.ts
import { initNode } from '@webteamuxco/glitchtip-sdk/node';

initNode();
```

```jsonc
// package.json
{
  "scripts": {
    "start": "node --import ./dist/instrument.js ./dist/main.js"
  }
}
```

`--import` guarantees the instrument file is fully evaluated before `main.js` and its imports.

### CommonJS — first line of the entry point

```ts
// src/main.ts
import { initNode } from '@webteamuxco/glitchtip-sdk/node';
initNode();

// eslint-disable-next-line import/first
import express from 'express';
// ...
```

### `.env`

```bash
GLITCHTIP_DSN=http://xxx@localhost:8000/1
APP_ENV=development
APP_RELEASE=0.1.0
```

Without a DSN `initNode()` returns `false` and does nothing (a warning is printed when `debug` is on, i.e. outside production).

## 6.2 Use case — Express API

```ts
// src/main.ts (loaded after instrument.ts, see 6.1)
import express from 'express';
import { setupExpressErrorHandler, captureWithContext } from '@webteamuxco/glitchtip-sdk/node';

const app = express();

app.get('/orders/:id', async (req, res, next) => {
  try {
    res.json(await orders.find(req.params.id));
  } catch (err) {
    captureWithContext(err, {
      transaction: 'GET /orders/:id',
      tags: { feature: 'orders' },
      extra: { orderId: req.params.id },
    });
    next(err);
  }
});

// Must come AFTER every route and BEFORE your own error middleware.
setupExpressErrorHandler(app);

app.use((err, req, res, _next) => {
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(3000);
```

`setupExpressErrorHandler` captures every error that reaches Express' error pipeline (5xx by default) and attaches the request (method, URL, headers — scrubbed). The `try/catch` above is only needed when you want to add business context.

## 6.3 Use case — Fastify API

```ts
import Fastify from 'fastify';
import { setupFastifyErrorHandler } from '@webteamuxco/glitchtip-sdk/node';

const app = Fastify();
setupFastifyErrorHandler(app);

app.get('/health', async () => ({ ok: true }));
app.get('/boom', async () => {
  throw new Error('Test GlitchTip — Fastify');
});

await app.listen({ port: 3000 });
```

## 6.4 Use case — worker / cron job

```ts
// src/worker.ts
import { initNode, withMonitor, captureWithContext, flush, close } from '@webteamuxco/glitchtip-sdk/node';

initNode({ serverName: 'billing-worker' });

async function run() {
  await withMonitor(
    'billing-nightly',                            // monitor slug in GlitchTip
    () => billing.settleAll(),
    { schedule: { type: 'crontab', value: '0 2 * * *' }, maxRuntime: 30 },
  );
}

run()
  .catch((err) => {
    captureWithContext(err, { transaction: 'billing-nightly', level: 'fatal' });
    process.exitCode = 1;
  })
  .finally(async () => {
    await flush(2000);   // push pending events before the process exits
    await close(1000);   // release Sentry's timers so the event loop can drain
  });
```

`withMonitor` reports a check-in when the job starts and another when it finishes (or throws), so GlitchTip can flag a missed or overrunning run. Always `flush()` before exiting a short-lived process: Sentry sends events asynchronously.

## 6.5 Use case — capture with business context

```ts
import { captureWithContext, captureMessage, addBreadcrumb, setUser } from '@webteamuxco/glitchtip-sdk/node';

setUser({ id: user.id, email: user.email });
addBreadcrumb('payment.start', { orderId }, 'payments');

try {
  await psp.charge(orderId);
} catch (err) {
  captureWithContext(err, {
    transaction: 'payments/charge',          // culprit, shown under the title
    tags: { psp: 'stripe' },                 // filter with `psp:stripe`
    extra: { orderId },                      // visible in the issue detail
  });
  throw err;
}

captureMessage(`Rate limited, retry in ${retryAfter}s`, {
  level: 'warning',
  fingerprint: ['psp', 'rate-limit'],        // one issue, whatever the delay
});
```

See the root [README](../README.md#making-an-issue-readable-in-the-list) for how `tags`, `transaction`, `fingerprint` and `extra` show up in GlitchTip.

## 6.6 Use case — isolated client with a dedicated DSN

Route one stream of events (an AI agent, a tenant, a payment worker) to a **separate GlitchTip project** without touching the global client:

```ts
import { createClient } from '@webteamuxco/glitchtip-sdk/node';

export const agentTracking = createClient({
  dsn: process.env.AGENT_GLITCHTIP_DSN,
  serverName: 'ai-agent',
});

// later
agentTracking?.setUser({ id: conversation.userId });
agentTracking?.addBreadcrumb('tool.call', { name: 'search' }, 'agent');
agentTracking?.captureWithContext(err, { transaction: 'agent/run' });

// on shutdown
await agentTracking?.close();
```

`createClient` returns `null` when no DSN is available, hence the `?.`. The isolated client:

- has its own scope — `setUser`, breadcrumbs and tags never leak to the global client;
- keeps only the process-safe default integrations (filters, linked errors, dedupe, context lines, modules). It does **not** hook `uncaughtException` / `unhandledRejection` nor `http`, so a crash is reported once by the global client instead of once per DSN;
- exposes `captureWithContext`, `captureMessage`, `setUser`, `addBreadcrumb`, `flush` and `close`. Call `close()` before the process exits — a `NodeClient` left open keeps the event loop alive.

## 6.7 Use case — structured logs

```ts
initNode({ enableLogs: true });   // or GLITCHTIP_ENABLE_LOGS=true
```

```ts
import { log } from '@webteamuxco/glitchtip-sdk/node';

log.info('order.confirmed', { orderId, total });
log.warn('stock.low', { sku, remaining });
```

Levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`. PII keys in attributes are scrubbed by `beforeSendLog` — override it on `initNode` for custom redaction.

## 6.8 Options

`initNode` accepts every [`UxcoTrackingOptions`](../src/core/defaults.ts) field plus:

| Option | Default | Purpose |
| ------ | ------- | ------- |
| `integrations` | Sentry defaults | Extra integrations appended to the defaults (`expressIntegration()`, `captureConsoleIntegration()`, …) |
| `includeLocalVariables` | `false` | Attach local variable values to stack frames (uses the Node inspector, adds overhead) |
| `tracePropagationTargets` | all outgoing requests | URLs that receive `sentry-trace` / `baggage` headers |
| `sentryOptions` | — | Raw `@sentry/node` options, spread last (escape hatch: `spotlight`, `maxSpanWaitDuration`, …) |

```ts
initNode({
  tracesSampleRate: 0.2,
  serverName: 'orders-api',
  integrations: [captureConsoleIntegration({ levels: ['error'] })],
  tracePropagationTargets: ['localhost', /^https:\/\/api\.uxco\.example\.com/],
  sentryOptions: { spotlight: process.env.NODE_ENV === 'development' },
});
```

> `initNode` is idempotent, and it also steps aside when Sentry was already initialised by another entry point (`initErrorTracking` from the root package, `GlitchtipModule.forRoot()`). Pick one init per process.

## 6.9 Test the integration

```ts
app.get('/debug-glitchtip', () => {
  throw new Error('Test GlitchTip — Node');
});
```

Or from a one-off script:

```ts
import { initNode, captureMessage, flush } from '@webteamuxco/glitchtip-sdk/node';

initNode({ debug: true });
captureMessage('Hello from Node', { level: 'info', tags: { smoke: 'true' } });
await flush();
```

With `debug: true` (the default outside production) Sentry logs the outgoing envelope to the console, which is the fastest way to confirm the DSN is right.
