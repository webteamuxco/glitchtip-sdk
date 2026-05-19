import * as Sentry from '@sentry/node';
import { resolveDefaults, type UxcoTrackingOptions } from './defaults.js';

let initialized = false;

export function initErrorTracking(opts: UxcoTrackingOptions = {}): boolean {
  if (initialized) return true;

  const config = resolveDefaults(opts);
  if (!config.enabled || !config.dsn) {
    if (config.debug) {
      console.warn('[uxco/glitchtip] disabled — no DSN provided');
    }
    return false;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
    profilesSampleRate: config.profilesSampleRate,
    debug: config.debug,
    serverName: config.serverName,
    ignoreErrors: config.ignoreErrors,
    beforeSend: config.beforeSend as NonNullable<Parameters<typeof Sentry.init>[0]>['beforeSend'],
    enableLogs: config.enableLogs,
    beforeSendLog: config.beforeSendLog as NonNullable<Parameters<typeof Sentry.init>[0]>['beforeSendLog'],
  });

  initialized = true;
  return true;
}

export function isInitialized(): boolean {
  return initialized;
}
