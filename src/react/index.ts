import * as Sentry from '@sentry/react';
import { resolveDefaults, type UxcoTrackingOptions } from '../core/defaults.js';

export interface ReactInitOptions extends UxcoTrackingOptions {
  tracePropagationTargets?: (string | RegExp)[];
}

export function initClient(opts: ReactInitOptions = {}): void {
  const config = resolveDefaults(opts);
  if (!config.enabled || !config.dsn) return;

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
    debug: config.debug,
    ignoreErrors: config.ignoreErrors,
    beforeSend: config.beforeSend as NonNullable<Parameters<typeof Sentry.init>[0]>['beforeSend'],
    integrations: [Sentry.browserTracingIntegration()],
    tracePropagationTargets: opts.tracePropagationTargets ?? ['localhost', /^\//],
  });
}

export {
  ErrorBoundary,
  withErrorBoundary,
  withProfiler,
  captureException,
  captureMessage,
  setUser,
  setTag,
  addBreadcrumb,
} from '@sentry/react';

export type { UxcoTrackingOptions } from '../core/defaults.js';
