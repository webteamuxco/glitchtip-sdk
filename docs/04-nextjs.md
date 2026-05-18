# 4. Next.js

The SDK exposes two entry points:

- `@webteamuxco/glitchtip-sdk/next/server` — for `instrumentation.ts` (Node runtime; Edge wherever Sentry supports it)
- `@webteamuxco/glitchtip-sdk/next/client` — for `instrumentation-client.ts` (browser bundle)

Compatible with **App Router** and **Pages Router** (Next 14 & 15).

## 4.1 Minimal setup

### `instrumentation.ts` (project root)

```ts
import { initServer } from '@webteamuxco/glitchtip-sdk/next/server';

export async function register(): Promise<void> {
  initServer();
}
```

### `instrumentation-client.ts` (root, Next 15+)

```ts
import { initClient } from '@webteamuxco/glitchtip-sdk/next/client';
initClient();
```

> On **Next 14** there is no `instrumentation-client.ts`. Import `initClient` from a Client Component mounted in `app/layout.tsx`, or from `_app.tsx`. See 4.7.

### `next.config.js`

If you also use `@sentry/nextjs` to upload sourcemaps, follow the [Sentry/Next docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/) to wrap your config with `withSentryConfig`. The SDK does not require this.

### `.env.local`

```bash
GLITCHTIP_DSN=http://xxx@localhost:8000/1               # server side
NEXT_PUBLIC_GLITCHTIP_DSN=http://xxx@localhost:8000/1   # browser side
APP_ENV=development
```

> ⚠️ Without `NEXT_PUBLIC_*` the client bundle won't see the DSN and `initClient` becomes a silent no-op.

## 4.2 Use case — capture an error in a Server Action

```ts
// app/(checkout)/actions.ts
'use server';
import { captureWithContext } from '@webteamuxco/glitchtip-sdk';

export async function placeOrder(formData: FormData) {
  try {
    // ... API / DB calls ...
  } catch (err) {
    captureWithContext(err, {
      tags: { action: 'placeOrder' },
      extra: { itemCount: formData.getAll('item').length },
    });
    throw err;
  }
}
```

## 4.3 Use case — Route Handler (App Router)

```ts
// app/api/orders/route.ts
import { NextResponse } from 'next/server';
import { captureWithContext } from '@webteamuxco/glitchtip-sdk';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // ... logic ...
    return NextResponse.json({ ok: true });
  } catch (err) {
    captureWithContext(err, { tags: { route: 'POST /api/orders' } });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## 4.4 Use case — API Route (Pages Router)

```ts
// pages/api/orders.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { captureWithContext } from '@webteamuxco/glitchtip-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // ...
    res.json({ ok: true });
  } catch (err) {
    captureWithContext(err, { tags: { route: 'POST /api/orders' } });
    res.status(500).json({ error: 'Internal error' });
  }
}
```

## 4.5 Use case — identify the user server-side

In a middleware or Server Component that resolves the session:

```ts
// lib/auth.ts
import { setUser } from '@webteamuxco/glitchtip-sdk';
import { getServerSession } from 'next-auth';

export async function loadUser() {
  const session = await getServerSession();
  if (session?.user) {
    setUser({ id: session.user.id, email: session.user.email });
  }
  return session;
}
```

## 4.6 Use case — client ErrorBoundary (App Router)

Next ships `app/error.tsx` to catch client-side render errors. Wire capture in:

```tsx
// app/error.tsx
'use client';
import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div>
      <h2>Something broke</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

> `Sentry.captureException` (from `@sentry/nextjs`) is used directly here because `instrumentation-client.ts` already initialized the client. Our `captureWithContext` helper is wired to the Node runtime — for the Next browser bundle, use `@sentry/nextjs` directly.

## 4.7 Use case — Next 14 without `instrumentation-client.ts`

```tsx
// app/glitchtip-init.tsx
'use client';
import { useEffect } from 'react';
import { initClient } from '@webteamuxco/glitchtip-sdk/next/client';

export function GlitchtipInit() {
  useEffect(() => {
    initClient();
  }, []);
  return null;
}
```

```tsx
// app/layout.tsx
import { GlitchtipInit } from './glitchtip-init';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <GlitchtipInit />
        {children}
      </body>
    </html>
  );
}
```

## 4.8 Use case — build / release stamping

So events are tied to the build version:

```bash
APP_RELEASE=$(git rev-parse --short HEAD) pnpm build
```

Or via a CI-injected variable:

```ts
// instrumentation.ts
import { initServer } from '@webteamuxco/glitchtip-sdk/next/server';

export async function register(): Promise<void> {
  initServer({
    release: process.env.NEXT_PUBLIC_BUILD_ID,
  });
}
```

## 4.9 Test the integration

### Server error (route handler)

```ts
// app/api/debug-throw/route.ts
export async function GET() {
  throw new Error('Test GlitchTip — server side');
}
```

```bash
curl http://localhost:3000/api/debug-throw
```

### Client error

```tsx
// app/debug-throw/page.tsx
'use client';
export default function Page() {
  return (
    <button onClick={() => { throw new Error('Test GlitchTip — client side'); }}>
      Throw
    </button>
  );
}
```

See [07-testing.md](./07-testing.md) for more.
