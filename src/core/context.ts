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
  /**
   * Logical operation the event belongs to (`'POST /api/booking'`,
   * `'ai-agent/sendMessage'`). GlitchTip stores it as the issue's **culprit**
   * and renders it under the title in the issue list — unlike tags, which are
   * only reachable through search. Use it to make a list row self-describing.
   *
   * Note that the culprit takes part in issue grouping, so two operations
   * raising the same error produce two issues. That is usually what you want;
   * override it with `fingerprint` when it is not.
   */
  transaction?: string;
  /**
   * Explicit grouping key. Events sharing a fingerprint collapse into one
   * issue, whatever their message or culprit. Include `'{{ default }}'` to
   * extend the default grouping instead of replacing it.
   *
   * Use it when a message carries a variable part (an id, a retry delay) that
   * would otherwise split one problem across many issues.
   */
  fingerprint?: string[];
}

/**
 * The subset of a Sentry `Scope` that `applyContext` needs. Kept structural so
 * the same mapping serves every runtime (`@sentry/core`, `@sentry/react-native`)
 * without this file importing any Sentry package — the React Native bundle
 * must not pull `@sentry/core` in next to its own copy.
 */
export interface ScopeLike {
  setLevel(level: CaptureLevel): unknown;
  setTransactionName(name: string): unknown;
  setFingerprint(fingerprint: string[]): unknown;
  setTag(key: string, value: string): unknown;
  setExtra(key: string, value: unknown): unknown;
  setUser(user: UxcoUser | null): unknown;
}

/** Copy a `CaptureContext` onto a scope. Shared by every platform entry. */
export function applyContext(scope: ScopeLike, context: CaptureContext): void {
  if (context.level) scope.setLevel(context.level);
  if (context.transaction) scope.setTransactionName(context.transaction);
  if (context.fingerprint?.length) scope.setFingerprint(context.fingerprint);
  if (context.tags) {
    for (const [k, v] of Object.entries(context.tags)) scope.setTag(k, v);
  }
  if (context.extra) {
    for (const [k, v] of Object.entries(context.extra)) scope.setExtra(k, v);
  }
  if (context.user) scope.setUser(context.user);
}
