export interface UxcoTrackingOptions {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  enabled?: boolean;
  debug?: boolean;
  serverName?: string;
  ignoreErrors?: (string | RegExp)[];
  beforeSend?: (event: unknown, hint: unknown) => unknown | null;
  enableLogs?: boolean;
  beforeSendLog?: (log: unknown) => unknown | null;
}

const PII_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie', 'apikey', 'api_key'];

export function scrubPII<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(scrubPII) as unknown as T;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    result[k] = PII_KEYS.includes(k.toLowerCase()) ? '[REDACTED]' : scrubPII(v);
  }
  return result as T;
}

export function resolveDefaults(opts: UxcoTrackingOptions = {}): Required<
  Omit<UxcoTrackingOptions, 'beforeSend' | 'beforeSendLog' | 'ignoreErrors' | 'serverName'>
> & {
  beforeSend: NonNullable<UxcoTrackingOptions['beforeSend']>;
  beforeSendLog: NonNullable<UxcoTrackingOptions['beforeSendLog']>;
  ignoreErrors: (string | RegExp)[];
  serverName: string | undefined;
} {
  const env =
    opts.environment ??
    process.env.SENTRY_ENVIRONMENT ??
    process.env.APP_ENV ??
    process.env.NODE_ENV ??
    'development';
  const isProd = env === 'production';

  const envDsn = process.env.SENTRY_DSN ?? process.env.GLITCHTIP_DSN ?? '';
  const envEnableLogs =
    process.env.GLITCHTIP_ENABLE_LOGS === 'true' || process.env.SENTRY_ENABLE_LOGS === 'true';

  return {
    dsn: opts.dsn ?? envDsn,
    environment: env,
    release: opts.release ?? process.env.SENTRY_RELEASE ?? process.env.APP_RELEASE ?? process.env.npm_package_version ?? 'dev',
    tracesSampleRate: opts.tracesSampleRate ?? (isProd ? 0.1 : 1.0),
    profilesSampleRate: opts.profilesSampleRate ?? 0,
    enabled: opts.enabled ?? Boolean(opts.dsn ?? envDsn),
    debug: opts.debug ?? !isProd,
    serverName: opts.serverName,
    ignoreErrors: opts.ignoreErrors ?? [
      'ResizeObserver loop limit exceeded',
      'Network request failed',
    ],
    beforeSend:
      opts.beforeSend ??
      ((event: unknown) => {
        if (event && typeof event === 'object') {
          return scrubPII(event);
        }
        return event;
      }),
    enableLogs: opts.enableLogs ?? envEnableLogs,
    beforeSendLog:
      opts.beforeSendLog ??
      ((log: unknown) => {
        if (log && typeof log === 'object') {
          return scrubPII(log);
        }
        return log;
      }),
  };
}
