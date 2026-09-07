import {
  setUser as sentrySetUser,
  addBreadcrumb as sentryAddBreadcrumb,
  withScope,
  captureException,
  captureMessage as sentryCaptureMessage,
  flush as sentryFlush,
  type Scope,
} from '@sentry/core';
import { applyContext, type CaptureContext, type UxcoUser } from './context.js';

export type { UxcoUser, CaptureLevel, CaptureContext } from './context.js';

export function setUser(user: UxcoUser | null): void {
  sentrySetUser(user as Parameters<typeof sentrySetUser>[0]);
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>, category = 'app'): void {
  sentryAddBreadcrumb({ message, data, category, level: 'info' });
}

export function captureWithContext(
  error: unknown,
  context: CaptureContext = {},
  scope?: Scope,
): string | undefined {
  if (scope) {
    applyContext(scope, context);
    return scope.captureException(error);
  }

  return withScope((scope: Scope) => {
    applyContext(scope, context);
    return captureException(error);
  });
}

/**
 * Capture a text-only event (no stack trace) with a severity level. Use this
 * to surface non-error conditions (warnings, info notices) in GlitchTip as
 * standalone issues, separate from the `log` stream.
 *
 * Defaults to `info` when no level is provided.
 */
export function captureMessage(
  message: string,
  context: CaptureContext = {},
  scope?: Scope,
): string | undefined {
  if (scope) {
    applyContext(scope, context);
    return scope.captureMessage(message, context.level ?? 'info');
  }

  return withScope((scope: Scope) => {
    applyContext(scope, context);
    return sentryCaptureMessage(message, context.level ?? 'info');
  });
}

export function flush(timeoutMs = 2000): Promise<boolean> {
  return sentryFlush(timeoutMs);
}
