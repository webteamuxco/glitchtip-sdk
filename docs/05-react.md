# 5. React (Vite / CRA SPA)

The `@webteamuxco/glitchtip-sdk/react` subpath targets React SPAs **outside of Next.js** (Vite, Create React App, etc.). It builds on `@sentry/react` and also re-exports `ErrorBoundary`, `withErrorBoundary`, `withProfiler`, and helpers.

## 5.1 Minimal setup (Vite)

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initClient } from '@webteamuxco/glitchtip-sdk/react';
import App from './App';

initClient({
  dsn: import.meta.env.VITE_GLITCHTIP_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

### `.env`

```bash
VITE_GLITCHTIP_DSN=http://xxx@localhost:8000/1
VITE_APP_VERSION=0.1.0
```

> Vite requires the `VITE_` prefix to expose a variable to the bundle. CRA uses `REACT_APP_`.

## 5.2 CRA setup

```tsx
// src/index.tsx
import { initClient } from '@webteamuxco/glitchtip-sdk/react';

initClient({
  dsn: process.env.REACT_APP_GLITCHTIP_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.REACT_APP_VERSION,
});
```

## 5.3 Use case — global ErrorBoundary

```tsx
// src/App.tsx
import { ErrorBoundary } from '@webteamuxco/glitchtip-sdk/react';

export default function App() {
  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <div>
          <h1>Oops…</h1>
          <button onClick={resetError}>Try again</button>
        </div>
      )}
    >
      <Routes />
    </ErrorBoundary>
  );
}
```

## 5.4 Use case — per-feature ErrorBoundary (HOC)

```tsx
import { withErrorBoundary } from '@webteamuxco/glitchtip-sdk/react';

function CheckoutFormInner() {
  // ...
}

export const CheckoutForm = withErrorBoundary(CheckoutFormInner, {
  fallback: <p>The checkout form is unavailable.</p>,
  beforeCapture: (scope) => {
    scope.setTag('feature', 'checkout');
  },
});
```

## 5.5 Use case — identify the user after login

```tsx
import { setUser } from '@webteamuxco/glitchtip-sdk/react';

export function useSyncSentryUser(user: User | null) {
  useEffect(() => {
    if (user) {
      setUser({ id: user.id, email: user.email });
    } else {
      setUser(null);
    }
  }, [user]);
}
```

## 5.6 Use case — capture a caught error (try/catch)

```tsx
import { captureException, setTag } from '@webteamuxco/glitchtip-sdk/react';

async function pay() {
  try {
    await api.pay();
  } catch (err) {
    captureException(err, { tags: { feature: 'checkout.pay' } });
    throw err;
  }
}
```

## 5.7 Use case — manual breadcrumb (navigation, key click)

```tsx
import { addBreadcrumb } from '@webteamuxco/glitchtip-sdk/react';

function onAddToCart(itemId: string) {
  addBreadcrumb({
    category: 'cart',
    message: `added ${itemId}`,
    level: 'info',
  });
  // ...
}
```

## 5.8 Use case — trace propagation to an instrumented backend

If your API also reports traces to GlitchTip and you want to **link** front + back traces:

```ts
initClient({
  dsn: import.meta.env.VITE_GLITCHTIP_DSN,
  tracePropagationTargets: [
    'localhost',
    /^\/api\//,
    /^https:\/\/api\.uxco\.example\.com/,
  ],
});
```

Sentry will add `sentry-trace` / `baggage` headers to matching `fetch` requests.

## 5.9 Test the integration

```tsx
function DebugThrow() {
  return (
    <button onClick={() => { throw new Error('Test GlitchTip — React'); }}>
      Throw
    </button>
  );
}
```

> An error thrown in an event handler is caught by the parent `ErrorBoundary` **only if it happens during render**. To test an event handler use `captureException(new Error('test'))` or wrap with `try/catch`.

For a real unhandled render error:

```tsx
function DebugRenderThrow() {
  throw new Error('Test GlitchTip — render');
  return null;
}
```
