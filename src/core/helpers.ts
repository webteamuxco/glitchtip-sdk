import * as Sentry from '@sentry/node';

export interface UxcoUser {
  id?: string | number;
  email?: string;
  username?: string;
  [key: string]: unknown;
}

export function setUser(user: UxcoUser | null): void {
  Sentry.setUser(user as Parameters<typeof Sentry.setUser>[0]);
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>, category = 'app'): void {
  Sentry.addBreadcrumb({ message, data, category, level: 'info' });
}

export function captureWithContext(
  error: unknown,
  context: { tags?: Record<string, string>; extra?: Record<string, unknown>; user?: UxcoUser } = {},
): string | undefined {
  return Sentry.withScope((scope) => {
    if (context.tags) {
      for (const [k, v] of Object.entries(context.tags)) scope.setTag(k, v);
    }
    if (context.extra) {
      for (const [k, v] of Object.entries(context.extra)) scope.setExtra(k, v);
    }
    if (context.user) scope.setUser(context.user as Parameters<typeof scope.setUser>[0]);
    return Sentry.captureException(error);
  });
}

export function flush(timeoutMs = 2000): Promise<boolean> {
  return Sentry.flush(timeoutMs);
}
