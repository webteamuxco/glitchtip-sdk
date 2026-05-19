import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
}));

import * as Sentry from '@sentry/node';

async function loadInit() {
  vi.resetModules();
  return await import('../../src/core/init.js');
}

describe('initErrorTracking', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.mocked(Sentry.init).mockClear();
    for (const key of [
      'SENTRY_DSN',
      'GLITCHTIP_DSN',
      'SENTRY_ENVIRONMENT',
      'APP_ENV',
      'NODE_ENV',
      'SENTRY_RELEASE',
      'APP_RELEASE',
      'GLITCHTIP_ENABLE_LOGS',
      'SENTRY_ENABLE_LOGS',
    ]) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns false and skips Sentry.init when no DSN is provided', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { initErrorTracking, isInitialized } = await loadInit();

    expect(initErrorTracking({ debug: true })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(isInitialized()).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no DSN provided'));
  });

  it('does not warn when debug is false', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { initErrorTracking } = await loadInit();
    initErrorTracking({ debug: false });
    expect(warn).not.toHaveBeenCalled();
  });

  it('calls Sentry.init with resolved config when a DSN is provided', async () => {
    const { initErrorTracking, isInitialized } = await loadInit();

    expect(initErrorTracking({ dsn: 'https://k@host/1', environment: 'test', release: '1.0.0' })).toBe(true);
    expect(Sentry.init).toHaveBeenCalledOnce();
    const arg = vi.mocked(Sentry.init).mock.calls[0]![0]!;
    expect(arg).toMatchObject({
      dsn: 'https://k@host/1',
      environment: 'test',
      release: '1.0.0',
    });
    expect(isInitialized()).toBe(true);
  });

  it('is idempotent — only the first call invokes Sentry.init', async () => {
    const { initErrorTracking } = await loadInit();
    expect(initErrorTracking({ dsn: 'd1' })).toBe(true);
    expect(initErrorTracking({ dsn: 'd2' })).toBe(true);
    expect(Sentry.init).toHaveBeenCalledOnce();
  });

  it('respects enabled=false even when DSN is set', async () => {
    const { initErrorTracking, isInitialized } = await loadInit();
    expect(initErrorTracking({ dsn: 'd', enabled: false })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(isInitialized()).toBe(false);
  });
});
