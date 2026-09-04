# 7. React Native / Expo

The `@webteamuxco/glitchtip-sdk/react-native` subpath targets React Native and Expo apps. It wraps `@sentry/react-native` with the UXCO defaults (PII scrubbing, noise filters, DSN/env resolution) and exposes the **same helpers as the server entries** — `captureWithContext`, `captureMessage`, `setUser`, `addBreadcrumb`, `log` — implemented on top of `@sentry/react-native`, so the app imports one package and the bundle carries a single copy of the Sentry runtime.

```bash
# bare React Native
pnpm add @webteamuxco/glitchtip-sdk @sentry/react-native
# Expo (pins the version matching your SDK)
npx expo install @sentry/react-native
```

`@sentry/react-native` needs its native side: follow the [Sentry RN install steps](https://docs.sentry.io/platforms/react-native/manual-setup/) (`pod install`, or the Expo config plugin). Supported range: `>=7 <9`.

It exposes:

- `initReactNative(opts?)` — global init, returns `true` when tracking is active
- `captureWithContext`, `captureMessage`, `setUser`, `addBreadcrumb` — UXCO helpers (see [README](../README.md#making-an-issue-readable-in-the-list) for `tags` / `transaction` / `fingerprint` / `extra`)
- `log` — structured logs (`trace` → `fatal`) shipped to GlitchTip
- from `@sentry/react-native`: `ErrorBoundary`, `withErrorBoundary`, `wrap`, `reactNavigationIntegration`, `captureException`, `withScope`, `setTag`, `setTags`, `setContext`, `setExtra`, `flush`, `close`, `nativeCrash`, plus the raw `sentryCaptureMessage`, `sentrySetUser`, `sentryAddBreadcrumb`

## 7.1 Minimal setup

Initialise **before** the root component is registered, in the app entry file.

```tsx
// App.tsx (or index.js / app/_layout.tsx with expo-router)
import { initReactNative, wrap } from '@webteamuxco/glitchtip-sdk/react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';

initReactNative({
  dsn: process.env.EXPO_PUBLIC_GLITCHTIP_DSN,
  environment: Constants.expoConfig?.extra?.appEnv ?? 'development',
  release: `${Application.applicationId}@${Application.nativeApplicationVersion}`,
  dist: Application.nativeBuildVersion ?? undefined,
});

function App() {
  // ...
}

export default wrap(App);
```

`wrap` installs Sentry's touch-event breadcrumbs and the root error boundary. On bare RN without Expo, read the version from `react-native-device-info` instead.

### DSN and environment

There is no `.env` at runtime on mobile. Pass the DSN explicitly:

- Expo: `EXPO_PUBLIC_GLITCHTIP_DSN=…` in `.env`, inlined at build time as `process.env.EXPO_PUBLIC_GLITCHTIP_DSN`;
- bare RN: `react-native-config`, `babel-plugin-transform-inline-environment-variables`, or a generated `config.ts`.

Without a DSN `initReactNative()` returns `false` and does nothing (a warning is printed when `debug: true`).

### Mobile defaults

Different from the server entries, on purpose:

| Option | Default | Why |
| ------ | ------- | --- |
| `release` / `dist` | **not guessed** | GlitchTip groups by them; `npm_package_version` is meaningless on device — pass the app version and build number |
| `tracesSampleRate` | `0` | opt-in performance tracing |
| `profilesSampleRate` | `0` | opt-in profiling |
| `debug` | `false` | the Metro console is noisy enough |
| `enableAutoSessionTracking` | `false` | GlitchTip has no release-health UI |

`sentryOptions` is spread last and takes raw `@sentry/react-native` options (`enableNative`, `enableStallTracking`, `integrations`, …).

## 7.2 Use case — capture a caught error with context

The typical app-side wrapper (skip cancelled requests, dev logging, toast) stays in the app; the Sentry part collapses to one call:

```ts
import { captureWithContext, type CaptureLevel } from '@webteamuxco/glitchtip-sdk/react-native';
import { isAxiosError, isCancel } from 'axios';

interface ErrorContext {
  userId?: string;
  action?: string;
  screen?: string;
  apiEndpoint?: string;
  requestId?: string;
  additionalData?: Record<string, unknown>;
}

export function reportError(error: unknown, ctx: ErrorContext = {}, level: CaptureLevel = 'error') {
  if (isCancel(error)) return;

  const requestId = ctx.requestId ?? (isAxiosError(error) ? error.config?.headers?.['x-request-id'] : undefined);
  const httpStatus = isAxiosError(error) ? error.response?.status : undefined;

  const tags: Record<string, string> = {};
  if (typeof requestId === 'string') tags.request_id = requestId;
  if (httpStatus) tags.http_status = String(httpStatus);
  if (ctx.action) tags.action = ctx.action;
  if (ctx.screen) tags.screen = ctx.screen;
  if (ctx.apiEndpoint) tags.api_endpoint = ctx.apiEndpoint;

  captureWithContext(error, {
    level,
    tags,
    user: ctx.userId ? { id: ctx.userId } : undefined,
    transaction: ctx.action ?? ctx.screen,             // culprit, shown under the title
    extra: { timestamp: new Date().toISOString(), requestId, ...ctx.additionalData },
  });
}
```

`tags` must be strings — filter `undefined` out before passing them. `transaction` makes the issue row self-describing in GlitchTip; `extra` is visible in the issue detail.

Need a named context block rather than `extra`? Use the raw scope:

```ts
import { withScope, setContext, captureException } from '@webteamuxco/glitchtip-sdk/react-native';

withScope((scope) => {
  scope.setContext('error_context', { requestId, ...additionalData });
  captureException(error);
});
```

## 7.3 Use case — identify the user after login

```ts
import { setUser } from '@webteamuxco/glitchtip-sdk/react-native';

export function useSyncTrackingUser(user: User | null) {
  useEffect(() => {
    setUser(user ? { id: user.id, email: user.email } : null);
  }, [user]);
}
```

## 7.4 Use case — breadcrumbs (navigation, key taps, API calls)

```ts
import { addBreadcrumb } from '@webteamuxco/glitchtip-sdk/react-native';

addBreadcrumb('cart.add', { itemId }, 'cart');
addBreadcrumb(`GET ${url} → ${status}`, undefined, 'http');
```

Screen changes come for free with React Navigation:

```tsx
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { initReactNative, reactNavigationIntegration } from '@webteamuxco/glitchtip-sdk/react-native';

const navigationIntegration = reactNavigationIntegration();

initReactNative({
  dsn: '…',
  sentryOptions: { integrations: [navigationIntegration] },
});

export function Root() {
  const navigationRef = useNavigationContainerRef();
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => navigationIntegration.registerNavigationContainer(navigationRef)}
    >
      {/* … */}
    </NavigationContainer>
  );
}
```

## 7.5 Use case — feature-level ErrorBoundary

```tsx
import { ErrorBoundary } from '@webteamuxco/glitchtip-sdk/react-native';

<ErrorBoundary
  fallback={({ resetError }) => <RetryScreen onRetry={resetError} />}
  beforeCapture={(scope) => scope.setTag('feature', 'checkout')}
>
  <Checkout />
</ErrorBoundary>
```

## 7.6 Use case — structured logs

```ts
initReactNative({ dsn: '…', enableLogs: true });
```

```ts
import { log } from '@webteamuxco/glitchtip-sdk/react-native';

log.info('checkout.step', { step: 'payment' });
log.warn('offline.queue', { pending: queue.length });
```

Levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`. PII keys in attributes are scrubbed by `beforeSendLog` — override it on `initReactNative` for custom redaction.

## 7.7 Use case — flush before the app goes to background

Events are sent asynchronously; iOS may suspend the app before the queue drains.

```ts
import { AppState } from 'react-native';
import { flush } from '@webteamuxco/glitchtip-sdk/react-native';

AppState.addEventListener('change', (state) => {
  if (state === 'background') void flush();
});
```

`flush()` takes no timeout on React Native — it drains the JS queue and asks the native layer to send.

## 7.8 Test the integration

```tsx
import { captureMessage, nativeCrash } from '@webteamuxco/glitchtip-sdk/react-native';

<Button title="JS message" onPress={() => captureMessage('Test GlitchTip — RN', { level: 'info' })} />
<Button title="JS error" onPress={() => { throw new Error('Test GlitchTip — RN render'); }} />
<Button title="Native crash" onPress={() => nativeCrash()} />
```

- The JS message shows up immediately.
- The JS error is caught by `wrap`'s root boundary (or yours) and reported.
- `nativeCrash()` kills the app; the native report is sent **on the next launch** — reopen the app and wait a few seconds. Native crashes are not reported from a debug build attached to the debugger.
