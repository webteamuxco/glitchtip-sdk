import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/react-native', () => ({
  init: vi.fn(),
}));

import * as Sentry from '@sentry/react-native';

async function loadInit() {
  vi.resetModules();
  return await import('../../src/react-native/init.js');
}

const ENV_KEYS = [
  'SENTRY_DSN',
  'GLITCHTIP_DSN',
  'SENTRY_ENVIRONMENT',
  'APP_ENV',
  'NODE_ENV',
  'SENTRY_RELEASE',
  'APP_RELEASE',
  'GLITCHTIP_ENABLE_LOGS',
  'SENTRY_ENABLE_LOGS',
] as const;

describe('react-native/initReactNative', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.mocked(Sentry.init).mockClear();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns false and skips Sentry.init when no DSN is provided', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { initReactNative, isReactNativeInitialized } = await loadInit();

    expect(initReactNative()).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(isReactNativeInitialized()).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns about the missing DSN only when debug is on', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { initReactNative } = await loadInit();
    initReactNative({ debug: true });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no DSN provided'));
  });

  it('calls Sentry.init with the DSN and environment when a DSN is provided', async () => {
    const { initReactNative, isReactNativeInitialized } = await loadInit();

    expect(initReactNative({ dsn: 'https://k@host/1', environment: 'staging' })).toBe(true);
    expect(Sentry.init).toHaveBeenCalledOnce();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: 'https://k@host/1', environment: 'staging' }),
    );
    expect(isReactNativeInitialized()).toBe(true);
  });

  it('falls back to GLITCHTIP_DSN when SENTRY_DSN is unset', async () => {
    process.env.GLITCHTIP_DSN = 'gt-dsn';
    const { initReactNative } = await loadInit();
    initReactNative();
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'gt-dsn' }));
  });

  it('is idempotent — only the first call invokes Sentry.init', async () => {
    const { initReactNative } = await loadInit();
    expect(initReactNative({ dsn: 'd1' })).toBe(true);
    expect(initReactNative({ dsn: 'd2' })).toBe(true);
    expect(Sentry.init).toHaveBeenCalledOnce();
  });

  it('respects enabled=false even when DSN is set', async () => {
    const { initReactNative, isReactNativeInitialized } = await loadInit();
    expect(initReactNative({ dsn: 'd', enabled: false })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(isReactNativeInitialized()).toBe(false);
  });

  it('does not guess release or dist from the environment', async () => {
    process.env.SENTRY_RELEASE = 'from-env';
    const { initReactNative } = await loadInit();
    initReactNative({ dsn: 'd' });
    const arg = vi.mocked(Sentry.init).mock.calls[0]![0]!;
    expect(arg.release).toBeUndefined();
    expect(arg.dist).toBeUndefined();
  });

  it('forwards release and dist when provided', async () => {
    const { initReactNative } = await loadInit();
    initReactNative({ dsn: 'd', release: 'app@1.2.3', dist: '42' });
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ release: 'app@1.2.3', dist: '42' }));
  });

  it('applies mobile defaults: no tracing, no profiling, no debug, no session tracking', async () => {
    const { initReactNative } = await loadInit();
    initReactNative({ dsn: 'd' });
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0,
        profilesSampleRate: 0,
        debug: false,
        enableAutoSessionTracking: false,
      }),
    );
  });

  it('honours explicit sample rates, debug and session tracking', async () => {
    const { initReactNative } = await loadInit();
    initReactNative({ dsn: 'd', tracesSampleRate: 0.3, profilesSampleRate: 0.1, debug: true, enableAutoSessionTracking: true });
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0.3,
        profilesSampleRate: 0.1,
        debug: true,
        enableAutoSessionTracking: true,
      }),
    );
  });

  it('forwards ignoreErrors, enableLogs and the PII-scrubbing hooks', async () => {
    const { initReactNative } = await loadInit();
    initReactNative({ dsn: 'd', ignoreErrors: ['Boom'], enableLogs: true });
    const arg = vi.mocked(Sentry.init).mock.calls[0]![0]!;
    expect(arg.ignoreErrors).toEqual(['Boom']);
    expect(arg.enableLogs).toBe(true);
    expect(typeof arg.beforeSend).toBe('function');
    expect(typeof arg.beforeSendLog).toBe('function');
  });

  it('applies sentryOptions last so they override resolved values', async () => {
    const { initReactNative } = await loadInit();
    initReactNative({
      dsn: 'd',
      environment: 'staging',
      sentryOptions: { environment: 'override', enableNative: false },
    });
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'override', enableNative: false }),
    );
  });
});
