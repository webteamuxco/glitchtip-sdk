export { initReactNative, isReactNativeInitialized, type ReactNativeInitOptions } from './init.js';
export { setUser, addBreadcrumb, captureWithContext, captureMessage } from './helpers.js';
export { log, type UxcoLog } from './log.js';
export type { UxcoUser, CaptureLevel, CaptureContext } from '../core/context.js';
export type { UxcoTrackingOptions } from '../core/defaults.js';

export {
  // components & wrappers
  ErrorBoundary,
  withErrorBoundary,
  wrap,
  reactNavigationIntegration,
  // scope & capture
  captureException,
  captureMessage as sentryCaptureMessage,
  setUser as sentrySetUser,
  addBreadcrumb as sentryAddBreadcrumb,
  withScope,
  setTag,
  setTags,
  setContext,
  setExtra,
  // lifecycle & native
  flush,
  close,
  nativeCrash,
} from '@sentry/react-native';
