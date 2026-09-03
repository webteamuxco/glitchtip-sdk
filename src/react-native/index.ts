import * as Sentry from '@sentry/react-native';
import { resolveDefaults, type UxcoTrackingOptions } from '../core/defaults.js';

let initialized = false;

export interface ReactNativeInitOptions extends UxcoTrackingOptions {
  dist?: string;
  enableAutoSessionTracking?: boolean;
  sentryOptions?: Partial<Sentry.ReactNativeOptions>;
}

export function initReactNative(opts = {} as ReactNativeInitOptions) {
  if (initialized) return;

  const config = resolveDefaults(opts);

  if (!config.enabled || !config.dsn) return;

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: opts.release,
    dist: opts.dist,
    tracesSampleRate: opts.tracesSampleRate ?? 0,
    profilesSampleRate: opts.profilesSampleRate ?? 0,
    debug: opts.debug ?? false,
    ignoreErrors: config.ignoreErrors,
    beforeSend: config.beforeSend as NonNullable<Parameters<typeof Sentry.init>[0]>['beforeSend'],
    enableLogs: config.enableLogs,
    beforeSendLog: config.beforeSendLog as NonNullable<Parameters<typeof Sentry.init>[0]>['beforeSendLog'],
    enableAutoSessionTracking: opts.enableAutoSessionTracking ?? false,
    ...opts.sentryOptions,
  });

  initialized = true;
}

export { ErrorBoundary, wrap, withErrorBoundary, withScope, setTag, setContext, captureException, reactNavigationIntegration } from '@sentry/react-native';
