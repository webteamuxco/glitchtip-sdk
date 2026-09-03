import {
  NodeClient,
  Scope,
  defaultStackParser,
  getDefaultIntegrationsWithoutPerformance,
  makeNodeTransport,
} from '@sentry/node';

import { resolveDefaults, type UxcoTrackingOptions } from '../core/defaults.js';
import {
  captureMessage,
  captureWithContext,
  type CaptureContext,
  type UxcoUser,
} from '../core/helpers.js';

/**
 * Default integrations that are safe to run on a second, isolated client.
 *
 * Everything that hooks the process globally (`OnUncaughtException`,
 * `OnUnhandledRejection`, `Http`, `NodeFetch`, `ProcessSession`, …) is left
 * out: those belong to the main client set up by `initNode`, and duplicating
 * them would report every crash twice, once per DSN.
 */
const ISOLATED_INTEGRATIONS = new Set([
  'InboundFilters',
  'EventFilters',
  'FunctionToString',
  'LinkedErrors',
  'Dedupe',
  'RequestData',
  'ContextLines',
  'Context',
  'Modules',
]);

export type NodeClientOptions = UxcoTrackingOptions;

/**
 * Build an isolated client bound to its own DSN, independent from the global
 * one set up by `initNode`. Use it to route one stream of events (an AI agent,
 * a payment worker, a tenant) to a dedicated GlitchTip project.
 *
 * Returns `null` when tracking is disabled or no DSN is available.
 */
export function createClient(opts: NodeClientOptions = {}) {
  const config = resolveDefaults(opts);

  if (!config.enabled || !config.dsn) {
    return null;
  }

  const client = new NodeClient({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    serverName: config.serverName,

    integrations: getDefaultIntegrationsWithoutPerformance().filter((integration) =>
      ISOLATED_INTEGRATIONS.has(integration.name),
    ),
    transport: makeNodeTransport,
    stackParser: defaultStackParser,

    debug: config.debug,
    ignoreErrors: config.ignoreErrors,

    beforeSend: config.beforeSend as NonNullable<
      ConstructorParameters<typeof NodeClient>[0]
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

    /**
     * Flush pending events and release the client's timers. Call it before the
     * process exits — a `NodeClient` left open keeps the event loop alive.
     */
    close: (timeoutMs = 2000) => client.close(timeoutMs),
  };
}

export type NodeTrackingClient = NonNullable<ReturnType<typeof createClient>>;
