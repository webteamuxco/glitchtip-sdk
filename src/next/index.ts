export { initClient } from './client.js';
export { initServer } from './server.js';
export { log, type UxcoLog } from './log.js';
export {
  setUser,
  addBreadcrumb,
  captureWithContext,
  flush,
  type UxcoUser,
} from '../core/helpers.js';
export type { UxcoTrackingOptions } from '../core/defaults.js';
