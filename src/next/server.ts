import * as Sentry from '@sentry/nextjs';
import { resolveDefaults, type UxcoTrackingOptions } from '../core/defaults.js';

export function initServer(opts: UxcoTrackingOptions = {}): void {
  const config = resolveDefaults({
    ...opts,
    dsn: opts.dsn ?? process.env.SENTRY_DSN ?? process.env.GLITCHTIP_DSN,
  });
  if (!config.enabled || !config.dsn) return;

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
    debug: config.debug,
    serverName: config.serverName,
    ignoreErrors: config.ignoreErrors,
    beforeSend: config.beforeSend as NonNullable<Parameters<typeof Sentry.init>[0]>['beforeSend'],
  });
}
