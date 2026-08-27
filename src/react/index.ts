import * as Sentry from '@sentry/react';

import {
  BrowserClient,
  Scope,
  defaultStackParser,
  getDefaultIntegrations,
  makeFetchTransport,
} from '@sentry/browser';

import {
  resolveDefaults,
  type UxcoTrackingOptions,
} from '../core/defaults.js';

import {
  captureMessage,
  captureWithContext,
  type CaptureContext,
  type UxcoUser,
} from '../core/helpers.js';

export interface ReactInitOptions extends UxcoTrackingOptions {
  tracePropagationTargets?: (string | RegExp)[];
}

function resolveClientConfig(opts: ReactInitOptions = {}) {
  return resolveDefaults(opts);
}

export function initClient(opts: ReactInitOptions = {}): void {
  const config = resolveClientConfig(opts);

  if (!config.enabled || !config.dsn) return;

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
    debug: config.debug,
    ignoreErrors: config.ignoreErrors,

    beforeSend: config.beforeSend as NonNullable<
      Parameters<typeof Sentry.init>[0]
    >['beforeSend'],

    enableLogs: config.enableLogs,

    beforeSendLog: config.beforeSendLog as NonNullable<
      Parameters<typeof Sentry.init>[0]
    >['beforeSendLog'],

    integrations: [Sentry.browserTracingIntegration()],

    tracePropagationTargets:
      opts.tracePropagationTargets ?? ['localhost', /^\//],
  });
}

export function createClient(opts: ReactInitOptions = {}) {
  const config = resolveClientConfig(opts);

  if (!config.enabled || !config.dsn) {
    return null;
  }

  const client = new BrowserClient({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,

    integrations: getDefaultIntegrations({}),
    transport: makeFetchTransport,
    stackParser: defaultStackParser,

    tracesSampleRate: config.tracesSampleRate,
    debug: config.debug,
    ignoreErrors: config.ignoreErrors,

    beforeSend: config.beforeSend as NonNullable<
      Parameters<typeof Sentry.init>[0]
    >['beforeSend'],
  });

  const scope = new Scope();

  scope.setClient(client);

  client.init();

  return {
    captureMessage: (
      message: string,
      context?: CaptureContext,
    ) => captureMessage(message, context, scope),

    captureWithContext: (
      error: unknown,
      context?: CaptureContext,
    ) => captureWithContext(error, context, scope),

    setUser: (user: UxcoUser | null) => {
      scope.setUser(user as Parameters<typeof scope.setUser>[0]);
    },

    addBreadcrumb: (
      message: string,
      data?: Record<string, unknown>,
      category = 'app',
    ) => {
      scope.addBreadcrumb({
        message,
        data,
        category,
        level: 'info',
      });
    },

    flush: (timeoutMs = 2000) => client.flush(timeoutMs),
  };
}

type LogAttributes = Record<string, unknown>;

export interface UxcoLog {
  trace(message: string, attributes?: LogAttributes): void;
  debug(message: string, attributes?: LogAttributes): void;
  info(message: string, attributes?: LogAttributes): void;
  warn(message: string, attributes?: LogAttributes): void;
  error(message: string, attributes?: LogAttributes): void;
  fatal(message: string, attributes?: LogAttributes): void;
}

export const log: UxcoLog = {
  trace: (message, attributes) => Sentry.logger.trace(message, attributes),
  debug: (message, attributes) => Sentry.logger.debug(message, attributes),
  info: (message, attributes) => Sentry.logger.info(message, attributes),
  warn: (message, attributes) => Sentry.logger.warn(message, attributes),
  error: (message, attributes) => Sentry.logger.error(message, attributes),
  fatal: (message, attributes) => Sentry.logger.fatal(message, attributes),
};

export {
  ErrorBoundary,
  withErrorBoundary,
  withProfiler,
  captureException,
  captureMessage as sentryCaptureMessage,
  setUser as sentrySetUser,
  setTag,
  addBreadcrumb as sentryAddBreadcrumb,
} from '@sentry/react';

export type { UxcoTrackingOptions } from '../core/defaults.js';