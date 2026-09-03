export { initNode, isNodeInitialized, type NodeInitOptions } from './init.js';
export { createClient, type NodeClientOptions, type NodeTrackingClient } from './client.js';
export { log, type UxcoLog } from './log.js';
export {
  setUser,
  addBreadcrumb,
  captureWithContext,
  captureMessage,
  flush,
  type UxcoUser,
  type CaptureLevel,
  type CaptureContext,
} from '../core/helpers.js';
export type { UxcoTrackingOptions } from '../core/defaults.js';

// Node-specific surface of the Sentry SDK, re-exported so consumers only
// import from one place. Everything here exists in both @sentry/node 8 and 9.
export {
  // scope & capture primitives
  captureException,
  setTag,
  setTags,
  setContext,
  setExtra,
  withScope,
  withIsolationScope,
  // lifecycle
  close,
  // tracing
  startSpan,
  startInactiveSpan,
  // HTTP frameworks
  httpIntegration,
  expressIntegration,
  setupExpressErrorHandler,
  fastifyIntegration,
  setupFastifyErrorHandler,
  koaIntegration,
  setupKoaErrorHandler,
  hapiIntegration,
  setupHapiErrorHandler,
  // crons & workers
  cron,
  withMonitor,
  captureCheckIn,
  // misc
  captureConsoleIntegration,
} from '@sentry/node';
