# 3. NestJS

The `@webteamuxco/glitchtip-sdk/nest` subpath exposes:

- `GlitchtipModule.forRoot()` — initializes Sentry and registers filter & interceptor globally
- `GlitchtipExceptionFilter` — captures unhandled exceptions and 5xx
- `GlitchtipBreadcrumbInterceptor` — adds an HTTP breadcrumb per request
- `UxcoLogger` — `LoggerService` injectable that mirrors `console` output to GlitchTip logs

## 3.1 Minimal setup

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { GlitchtipModule } from '@webteamuxco/glitchtip-sdk/nest';

@Module({
  imports: [GlitchtipModule.forRoot()],
})
export class AppModule {}
```

That's it. With `GLITCHTIP_DSN` set in `.env`, every non-`HttpException` or any 5xx is sent to GlitchTip with:

- URL and HTTP method as tags
- Request headers as `extra` (sensitive keys like `authorization`, `cookie` are scrubbed)
- An `http` breadcrumb shaped `METHOD URL`

## 3.2 Advanced setup — options

```ts
GlitchtipModule.forRoot({
  // skip the global filter (you handle your own)
  registerGlobalFilter: false,

  // skip the global interceptor
  registerGlobalInterceptor: false,

  // override defaults
  environment: 'staging',
  tracesSampleRate: 0.5,
  ignoreErrors: [/HealthCheck/i, 'CanceledError'],

  // tag every event with a service name via a custom beforeSend
  beforeSend: (event) => {
    if (event && typeof event === 'object') {
      (event as any).tags = { ...(event as any).tags, service: 'orders-api' };
    }
    return event;
  },
})
```

## 3.3 Use case — capture a business error

```ts
// src/orders/orders.service.ts
import { Injectable } from '@nestjs/common';
import { captureWithContext, addBreadcrumb } from '@webteamuxco/glitchtip-sdk';

@Injectable()
export class OrdersService {
  async confirm(orderId: string, userId: string) {
    addBreadcrumb('confirm.start', { orderId, userId }, 'orders');
    try {
      // ... logic ...
    } catch (err) {
      captureWithContext(err, {
        tags: { feature: 'orders.confirm' },
        extra: { orderId },
        user: { id: userId },
      });
      throw err;
    }
  }
}
```

## 3.4 Use case — identify the user (auth guard / middleware)

Best done in a guard or middleware that resolves the authenticated user:

```ts
// src/auth/auth.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { setUser } from '@webteamuxco/glitchtip-sdk';

@Injectable()
export class IdentifyUserMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    if (req.user) {
      setUser({ id: req.user.id, email: req.user.email });
    }
    next();
  }
}
```

> ⚠️ `setUser` mutates Sentry's global scope. Prefer `captureWithContext({ user: ... })` when capturing explicitly, or make sure the scope is isolated per request via `Sentry.runWithAsyncContext` if needed.

## 3.5 Use case — custom filter inheriting ours

```ts
// src/common/all-exceptions.filter.ts
import { ArgumentsHost, Catch } from '@nestjs/common';
import { GlitchtipExceptionFilter } from '@webteamuxco/glitchtip-sdk/nest';

@Catch()
export class AllExceptionsFilter extends GlitchtipExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // custom logic before
    super.catch(exception, host);
    // custom logic after
  }
}
```

Then in `AppModule`:

```ts
GlitchtipModule.forRoot({ registerGlobalFilter: false }),
// + APP_FILTER → AllExceptionsFilter
```

## 3.6 Use case — background job (Bull, Cron)

The interceptor only covers HTTP. For jobs:

```ts
// src/jobs/email.processor.ts
import { Process, Processor } from '@nestjs/bull';
import { captureWithContext, addBreadcrumb } from '@webteamuxco/glitchtip-sdk';

@Processor('email')
export class EmailProcessor {
  @Process('send')
  async send(job: { data: { to: string; templateId: string } }) {
    addBreadcrumb('email.send.start', job.data, 'jobs');
    try {
      // ... send ...
    } catch (err) {
      captureWithContext(err, {
        tags: { job: 'email.send', templateId: job.data.templateId },
        extra: { jobData: job.data },
      });
      throw err;
    }
  }
}
```

## 3.7 Use case — graceful shutdown

Ensure buffered events leave the process before `process.exit`:

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { flush } from '@webteamuxco/glitchtip-sdk';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  process.on('SIGTERM', async () => {
    await flush(2000);
  });

  await app.listen(3000);
}
bootstrap();
```

## 3.8 Test the integration

Add an intentionally broken route:

```ts
// src/health/sentry-test.controller.ts
import { Controller, Get } from '@nestjs/common';

@Controller('debug')
export class SentryTestController {
  @Get('throw')
  throw() {
    throw new Error('Test GlitchTip — should appear in dashboard');
  }

  @Get('async-throw')
  async asyncThrow() {
    await new Promise((r) => setTimeout(r, 10));
    throw new Error('Async test GlitchTip');
  }
}
```

```bash
curl http://localhost:3000/debug/throw
# → the error should appear on http://localhost:8000 within ~10s
```

See [07-testing.md](./07-testing.md) for more scenarios.

## 3.9 Use case — send logs to GlitchTip

Activate the logs feature via the `enableLogs` option (or the `GLITCHTIP_ENABLE_LOGS=true` env var):

```ts
GlitchtipModule.forRoot({ enableLogs: true })
```

### 3.9.1 Manual log API

```ts
import { Injectable } from '@nestjs/common';
import { log } from '@webteamuxco/glitchtip-sdk';

@Injectable()
export class OrdersService {
  async confirm(orderId: string) {
    log.info('order confirmed', { orderId });
    log.warn('low stock detected', { orderId, remaining: 2 });
    log.error('payment failed', { orderId, reason: 'card_declined' });
  }
}
```

Available levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.

### 3.9.2 Replace Nest's logger

`UxcoLogger` extends `ConsoleLogger` and also forwards every log to GlitchTip:

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { UxcoLogger } from '@webteamuxco/glitchtip-sdk/nest';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(UxcoLogger));
  await app.listen(3000);
}
bootstrap();
```

Or inject it inside a service:

```ts
@Injectable()
export class OrdersService {
  constructor(private readonly logger: UxcoLogger) {
    this.logger.setContext(OrdersService.name);
  }

  confirm(orderId: string) {
    this.logger.log(`order confirmed ${orderId}`);
  }
}
```

PII scrubbing (`password`, `token`, `secret`, `authorization`, `cookie`, `apikey`) is applied to log attributes by default via `beforeSendLog`. Override it on `forRoot` if you need custom redaction.

## 3.10 Default filter behaviour

The filter at [src/nest/filter.ts](../src/nest/filter.ts):

- **Does not capture** `HttpException` < 500 (404, 401, 403, 422…) — noise removed
- **Captures** `HttpException` ≥ 500 and anything that isn't an `HttpException`
- Auto-tags with `url` + `method`
- Returns the normal JSON response to the client (transparent)
