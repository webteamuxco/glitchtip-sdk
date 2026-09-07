import * as Sentry from '@sentry/react-native';
import { resolveDefaults, type UxcoTrackingOptions } from '../core/defaults.js';

let initialized = false;

export interface ReactNativeInitOptions extends UxcoTrackingOptions {
  /** Build identifier (`ios` build number, Android `versionCode`). */
  dist?: string;
  /** Off by default — GlitchTip has no session/release-health UI. */
  enableAutoSessionTracking?: boolean;
  /**
   * Escape hatch — raw `@sentry/react-native` options, spread last so they
   * override everything the SDK resolved (`integrations`, `enableNative`,
   * `enableStallTracking`, …).
   */
  sentryOptions?: Partial<Sentry.ReactNativeOptions>;
}

/**
 * Initialise `@sentry/react-native` with UXCO defaults. Call it once at the
 * top of the app entry file, before the root component is registered.
 *
 * Mobile-specific defaults, on purpose different from the server entries:
 * - `release` / `dist` are **not** guessed from the environment — pass the
 *   app version and build number, they are what GlitchTip groups by;
 * - `tracesSampleRate` and `profilesSampleRate` default to `0`;
 * - `debug` defaults to `false` (the Metro console is noisy enough).
 *
 * Returns `true` when tracking is active (or already was), `false` when it
 * was skipped (no DSN, or `enabled: false`).
 */
export function initReactNative(opts: ReactNativeInitOptions = {}): boolean {
  if (initialized) return true;

  const config = resolveDefaults(opts);

  if (!config.enabled || !config.dsn) {
    if (opts.debug) {
      console.warn('[uxco/glitchtip] disabled — no DSN provided');
    }
    return false;
  }

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
  return true;
}

export function isReactNativeInitialized(): boolean {
  return initialized;
}
