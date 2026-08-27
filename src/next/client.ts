import * as Sentry from '@sentry/nextjs';
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

function resolveClientConfig(opts: UxcoTrackingOptions = {}) {
  const publicEnableLogs =
    process.env.NEXT_PUBLIC_GLITCHTIP_ENABLE_LOGS === 'true' ||
    process.env.NEXT_PUBLIC_SENTRY_ENABLE_LOGS === 'true';

  return resolveDefaults({
    ...opts,
    dsn:
      opts.dsn ??
      process.env.NEXT_PUBLIC_SENTRY_DSN ??
      process.env.NEXT_PUBLIC_GLITCHTIP_DSN ??
      process.env.SENTRY_DSN ??
      process.env.GLITCHTIP_DSN,
    enableLogs: opts.enableLogs ?? (publicEnableLogs || undefined),
  });
}

export function initClient(opts: UxcoTrackingOptions = {}): void {
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
  });
}

export function createClient(opts: UxcoTrackingOptions = {}) {
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

  return scope;
}