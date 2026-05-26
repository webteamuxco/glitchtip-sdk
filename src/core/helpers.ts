import {
  setUser as sentrySetUser,
  addBreadcrumb as sentryAddBreadcrumb,
  withScope,
  captureException,
  captureMessage as sentryCaptureMessage,
  flush as sentryFlush,
  type Scope,
} from '@sentry/core';

export interface UxcoUser {
  id?: string | number;
  email?: string;
  username?: string;
  [key: string]: unknown;
}

/**
 * Severity level for an event. Mirrors the subset of Sentry's `SeverityLevel`
 * that GlitchTip surfaces in the issues UI.
 */
export type CaptureLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface CaptureContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: UxcoUser;
  level?: CaptureLevel;
}

export function setUser(user: UxcoUser | null): void {
  sentrySetUser(user as Parameters<typeof sentrySetUser>[0]);
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>, category = 'app'): void {
  sentryAddBreadcrumb({ message, data, category, level: 'info' });
}

function applyContext(scope: Scope, context: CaptureContext): void {
  if (context.level) scope.setLevel(context.level);
  if (context.tags) {
    for (const [k, v] of Object.entries(context.tags)) scope.setTag(k, v);
  }
  if (context.extra) {
    for (const [k, v] of Object.entries(context.extra)) scope.setExtra(k, v);
  }
  if (context.user) scope.setUser(context.user as Parameters<typeof scope.setUser>[0]);
}

export function captureWithContext(error: unknown, context: CaptureContext = {}): string | undefined {
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
export function captureMessage(message: string, context: CaptureContext = {}): string | undefined {
  return withScope((scope: Scope) => {
    applyContext(scope, context);
    return sentryCaptureMessage(message, context.level ?? 'info');
  });
}

export function flush(timeoutMs = 2000): Promise<boolean> {
  return sentryFlush(timeoutMs);
}
