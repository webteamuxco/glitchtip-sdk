import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveDefaults, scrubPII } from '../../src/core/defaults.js';

describe('scrubPII', () => {
  it('returns primitives unchanged', () => {
    expect(scrubPII('hello')).toBe('hello');
    expect(scrubPII(42)).toBe(42);
    expect(scrubPII(null)).toBe(null);
    expect(scrubPII(undefined)).toBe(undefined);
    expect(scrubPII(true)).toBe(true);
  });

  it('redacts known PII keys at top level (case-insensitive)', () => {
    const input = {
      password: 'p4ss',
      Token: 'abc',
      SECRET: 'shh',
      authorization: 'Bearer x',
      cookie: 'sid=1',
      apikey: 'k',
      api_key: 'k2',
      username: 'mika',
    };
    const out = scrubPII(input);
    expect(out).toEqual({
      password: '[REDACTED]',
      Token: '[REDACTED]',
      SECRET: '[REDACTED]',
      authorization: '[REDACTED]',
      cookie: '[REDACTED]',
      apikey: '[REDACTED]',
      api_key: '[REDACTED]',
      username: 'mika',
    });
  });

  it('redacts PII keys nested in objects', () => {
    const input = { user: { name: 'mika', password: 'p4ss' }, headers: { Authorization: 'Bearer x' } };
    expect(scrubPII(input)).toEqual({
      user: { name: 'mika', password: '[REDACTED]' },
      headers: { Authorization: '[REDACTED]' },
    });
  });

  it('redacts PII keys inside arrays of objects', () => {
    const input = [{ password: 'a' }, { password: 'b' }];
    expect(scrubPII(input)).toEqual([{ password: '[REDACTED]' }, { password: '[REDACTED]' }]);
  });

  it('does not mutate the input', () => {
    const input = { password: 'p4ss', nested: { token: 't' } };
    const snapshot = JSON.parse(JSON.stringify(input));
    scrubPII(input);
    expect(input).toEqual(snapshot);
  });

  it('leaves non-PII keys untouched', () => {
    const input = { foo: 'bar', count: 3, list: [1, 2, 3] };
    expect(scrubPII(input)).toEqual(input);
  });
});

describe('resolveDefaults', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    for (const key of [
      'SENTRY_DSN',
      'GLITCHTIP_DSN',
      'SENTRY_ENVIRONMENT',
      'APP_ENV',
      'NODE_ENV',
      'SENTRY_RELEASE',
      'APP_RELEASE',
      'npm_package_version',
      'GLITCHTIP_ENABLE_LOGS',
      'SENTRY_ENABLE_LOGS',
    ]) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('uses opts.dsn over env vars', () => {
    process.env.SENTRY_DSN = 'env-dsn';
    const config = resolveDefaults({ dsn: 'opts-dsn' });
    expect(config.dsn).toBe('opts-dsn');
  });

  it('falls back to SENTRY_DSN env', () => {
    process.env.SENTRY_DSN = 'env-dsn';
    expect(resolveDefaults().dsn).toBe('env-dsn');
  });

  it('falls back to GLITCHTIP_DSN env when SENTRY_DSN is unset', () => {
    process.env.GLITCHTIP_DSN = 'gt-dsn';
    expect(resolveDefaults().dsn).toBe('gt-dsn');
  });

  it('SENTRY_DSN takes precedence over GLITCHTIP_DSN', () => {
    process.env.SENTRY_DSN = 'sentry';
    process.env.GLITCHTIP_DSN = 'glitchtip';
    expect(resolveDefaults().dsn).toBe('sentry');
  });

  it('returns empty dsn when nothing is provided', () => {
    expect(resolveDefaults().dsn).toBe('');
  });

  it('resolves environment precedence: opts > SENTRY_ENVIRONMENT > APP_ENV > NODE_ENV > development', () => {
    expect(resolveDefaults().environment).toBe('development');

    process.env.NODE_ENV = 'node';
    expect(resolveDefaults().environment).toBe('node');

    process.env.APP_ENV = 'app';
    expect(resolveDefaults().environment).toBe('app');

    process.env.SENTRY_ENVIRONMENT = 'sentry';
    expect(resolveDefaults().environment).toBe('sentry');

    expect(resolveDefaults({ environment: 'opts' }).environment).toBe('opts');
  });

  it('sets tracesSampleRate to 0.1 in production and 1.0 elsewhere', () => {
    process.env.NODE_ENV = 'production';
    expect(resolveDefaults().tracesSampleRate).toBe(0.1);

    process.env.NODE_ENV = 'development';
    expect(resolveDefaults().tracesSampleRate).toBe(1.0);
  });

  it('honors opts.tracesSampleRate override', () => {
    process.env.NODE_ENV = 'production';
    expect(resolveDefaults({ tracesSampleRate: 0.5 }).tracesSampleRate).toBe(0.5);
  });

  it('defaults profilesSampleRate to 0', () => {
    expect(resolveDefaults().profilesSampleRate).toBe(0);
  });

  it('debug is true outside production, false in production', () => {
    process.env.NODE_ENV = 'production';
    expect(resolveDefaults().debug).toBe(false);

    process.env.NODE_ENV = 'development';
    expect(resolveDefaults().debug).toBe(true);
  });

  it('enabled defaults to true when a DSN is available', () => {
    process.env.SENTRY_DSN = 'x';
    expect(resolveDefaults().enabled).toBe(true);
  });

  it('enabled defaults to false when no DSN is available', () => {
    expect(resolveDefaults().enabled).toBe(false);
  });

  it('release falls back through env vars', () => {
    expect(resolveDefaults().release).toBe('dev');

    process.env.npm_package_version = '1.2.3';
    expect(resolveDefaults().release).toBe('1.2.3');

    process.env.APP_RELEASE = 'app-rel';
    expect(resolveDefaults().release).toBe('app-rel');

    process.env.SENTRY_RELEASE = 'sentry-rel';
    expect(resolveDefaults().release).toBe('sentry-rel');

    expect(resolveDefaults({ release: 'opts-rel' }).release).toBe('opts-rel');
  });

  it('enableLogs honors GLITCHTIP_ENABLE_LOGS=true', () => {
    process.env.GLITCHTIP_ENABLE_LOGS = 'true';
    expect(resolveDefaults().enableLogs).toBe(true);
  });

  it('enableLogs honors SENTRY_ENABLE_LOGS=true', () => {
    process.env.SENTRY_ENABLE_LOGS = 'true';
    expect(resolveDefaults().enableLogs).toBe(true);
  });

  it('enableLogs is false when env var is something other than "true"', () => {
    process.env.GLITCHTIP_ENABLE_LOGS = '1';
    expect(resolveDefaults().enableLogs).toBe(false);
  });

  it('opts.enableLogs overrides env', () => {
    process.env.GLITCHTIP_ENABLE_LOGS = 'true';
    expect(resolveDefaults({ enableLogs: false }).enableLogs).toBe(false);
  });

  it('default ignoreErrors contains the known noisy patterns', () => {
    expect(resolveDefaults().ignoreErrors).toEqual([
      'ResizeObserver loop limit exceeded',
      'Network request failed',
    ]);
  });

  it('opts.ignoreErrors fully replaces the default list', () => {
    const custom = ['MyError'];
    expect(resolveDefaults({ ignoreErrors: custom }).ignoreErrors).toBe(custom);
  });

  it('default beforeSend scrubs PII from event objects', () => {
    const { beforeSend } = resolveDefaults();
    const scrubbed = beforeSend({ password: 'p4ss', tag: 'ok' }, {});
    expect(scrubbed).toEqual({ password: '[REDACTED]', tag: 'ok' });
  });

  it('default beforeSend returns primitives unchanged', () => {
    const { beforeSend } = resolveDefaults();
    expect(beforeSend('string-event', {})).toBe('string-event');
  });

  it('opts.beforeSend overrides the default scrubber', () => {
    const custom = () => null;
    expect(resolveDefaults({ beforeSend: custom }).beforeSend).toBe(custom);
  });

  it('default beforeSendLog scrubs PII from log objects', () => {
    const { beforeSendLog } = resolveDefaults();
    expect(beforeSendLog({ token: 't', msg: 'm' })).toEqual({ token: '[REDACTED]', msg: 'm' });
  });

  it('opts.beforeSendLog overrides the default scrubber', () => {
    const custom = () => null;
    expect(resolveDefaults({ beforeSendLog: custom }).beforeSendLog).toBe(custom);
  });

  it('serverName is undefined by default and passes through opts', () => {
    expect(resolveDefaults().serverName).toBeUndefined();
    expect(resolveDefaults({ serverName: 'api-1' }).serverName).toBe('api-1');
  });
});
