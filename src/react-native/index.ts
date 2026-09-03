import * as Sentry from '@sentry/react-native';
import { resolveDefaults, UxcoTrackingOptions } from '../core/index.js';

let initialized = false;

export interface ReactNativeInitOptions extends UxcoTrackingOptions {
  dist?: string;
  enableAutoSessionTracking?: boolean;    // false par défaut, GlitchTip n'a pas de sessions
  sentryOptions?: Partial<Sentry.ReactNativeOptions>;  // enableStallTracking, integrations… appliquées en dernier
}

export function initReactNative(opts = {} as ReactNativeInitOptions) {
  if (initialized) return;
  const config = resolveDefaults(opts);
  if (!config.enabled || !config.dsn) return;
  Sentry.init({
    dsn: config.dsn, environment: config.environment,
    release: opts.release, dist: opts.dist,            // pas de fallback 'dev'/npm_package_version
    tracesSampleRate: opts.tracesSampleRate ?? 0, profilesSampleRate: opts.profilesSampleRate ?? 0,
    debug: opts.debug ?? false, ignoreErrors: config.ignoreErrors,
    beforeSend: config.beforeSend as any,
    enableLogs: config.enableLogs,
    beforeSendLog: config.beforeSendLog as any,
    enableAutoSessionTracking: opts.enableAutoSessionTracking ?? false,
    ...opts.sentryOptions,
  });
  initialized = true;
}
// captureWithContext / captureMessage via Sentry.withScope + applyCaptureContext ; setUser, addBreadcrumb, flush, nativeCrash, log (Sentry.logger)
export { ErrorBoundary, wrap, withErrorBoundary, withScope, setTag, setContext, captureException, reactNavigationIntegration } from '@sentry/react-native';
