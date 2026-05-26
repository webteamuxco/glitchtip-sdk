export {
  setUser,
  addBreadcrumb,
  captureWithContext,
  captureMessage,
  flush,
  type UxcoUser,
  type CaptureLevel,
  type CaptureContext,
} from './helpers.js';
export { resolveDefaults, scrubPII, type UxcoTrackingOptions } from './defaults.js';
export { log, type UxcoLog } from './log.js';

/**
 * `initErrorTracking` is Node-only (depends on `@sentry/node`). When the
 * package is bundled for a browser target this entry is selected via the
 * `browser` export condition, and calling it throws to make the misuse loud
 * instead of silently doing nothing.
 *
 * For browsers, use the platform-specific init (`./next/client`, `./react`).
 */
export function initErrorTracking(): boolean {
  throw new Error(
    '[uxco/glitchtip] initErrorTracking() is not available in browser builds. ' +
      'Use initClient from "@webteamuxco/glitchtip-sdk/next/client" or "@webteamuxco/glitchtip-sdk/react".',
  );
}

export function isInitialized(): boolean {
  return false;
}
