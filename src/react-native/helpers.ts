import * as Sentry from '@sentry/react-native';
import { applyContext, type CaptureContext, type UxcoUser } from '../core/context.js';

/**
 * Same helpers as the root package, implemented on top of
 * `@sentry/react-native` instead of `@sentry/core`, so they always talk to
 * the client `initReactNative` set up and the mobile bundle carries a single
 * copy of the Sentry runtime.
 */

export function setUser(user: UxcoUser | null): void {
  Sentry.setUser(user);
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>, category = 'app'): void {
  Sentry.addBreadcrumb({ message, data, category, level: 'info' });
}

/**
 * Capture an exception with tags, extra, user, level, transaction and
 * fingerprint applied to an isolated scope — nothing leaks to the global one.
 */
export function captureWithContext(error: unknown, context: CaptureContext = {}): string | undefined {
  return Sentry.withScope((scope) => {
    applyContext(scope, context);
    return Sentry.captureException(error);
  });
}

/**
 * Capture a text-only event (no stack trace) with a severity level. Defaults
 * to `info` when no level is provided.
 */
export function captureMessage(message: string, context: CaptureContext = {}): string | undefined {
  return Sentry.withScope((scope) => {
    applyContext(scope, context);
    return Sentry.captureMessage(message, context.level ?? 'info');
  });
}
