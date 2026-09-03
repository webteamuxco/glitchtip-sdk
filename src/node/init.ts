import * as Sentry from '@sentry/node';
import type { Integration } from '@sentry/core';
import { resolveDefaults, type UxcoTrackingOptions } from '../core/defaults.js';

let initialized = false;

export interface NodeInitOptions extends UxcoTrackingOptions {
  /**
   * Extra integrations appended to Sentry's Node defaults (http, express,
   * postgres, …). Use it to register framework glue such as
   * `expressIntegration()` or `fastifyIntegration()`.
   */
  integrations?: Integration[];
  /**
   * Attach local variable values to stack frames. Off by default because it
   * relies on the Node inspector and adds overhead on every captured error.
   */
  includeLocalVariables?: boolean;
  /**
   * Outgoing request URLs that receive `sentry-trace` / `baggage` headers so
   * a downstream service can link its traces to this one.
   */
  tracePropagationTargets?: (string | RegExp)[];
  /**
   * Escape hatch — raw `@sentry/node` options, spread last so they override
   * everything the SDK resolved.
   */
  sentryOptions?: Partial<Sentry.NodeOptions>;
}

/**
 * Initialise `@sentry/node` with UXCO defaults (DSN/env/release resolution,
 * PII scrubbing, sample rates) plus Node-specific knobs.
 *
 * Call it once, as early as possible — before the HTTP framework and database
 * drivers are imported — so Sentry's auto-instrumentation can hook them.
 *
 * Returns `true` when tracking is active (or already was), `false` when it
 * was skipped (no DSN, or `enabled: false`).
 */
export function initNode(opts: NodeInitOptions = {}): boolean {
  if (initialized) return true;

  // Another entry point (e.g. `initErrorTracking` from the core module) may
  // already have bound a client; re-running `Sentry.init` would replace it and
  // set OpenTelemetry up a second time.
  if (Sentry.isInitialized()) {
    initialized = true;
    return true;
  }

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
    includeLocalVariables: opts.includeLocalVariables ?? false,
    ...(opts.integrations ? { integrations: opts.integrations } : {}),
    ...(opts.tracePropagationTargets ? { tracePropagationTargets: opts.tracePropagationTargets } : {}),
    ...opts.sentryOptions,
  });

  initialized = true;
  return true;
}

export function isNodeInitialized(): boolean {
  return initialized;
}
