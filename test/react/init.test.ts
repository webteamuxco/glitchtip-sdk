import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
  ErrorBoundary: () => null,
  withErrorBoundary: () => null,
  withProfiler: () => null,
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

import * as Sentry from '@sentry/react';
import { initClient, log } from '../../src/react/index.js';

describe('react/initClient', () => {
  beforeEach(() => {
    vi.mocked(Sentry.init).mockClear();
  });

  it('does nothing when no DSN is provided', () => {
    initClient();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('forwards core config to Sentry.init', () => {
    initClient({ dsn: 'd', environment: 'prod', release: '2.0.0' });
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'd',
        environment: 'prod',
        release: '2.0.0',
      }),
    );
  });

  it('always includes browserTracingIntegration', () => {
    initClient({ dsn: 'd' });
    const arg = vi.mocked(Sentry.init).mock.calls[0]![0] as { integrations: unknown[] };
    expect(arg.integrations).toHaveLength(1);
    expect(Sentry.browserTracingIntegration).toHaveBeenCalled();
  });

  it('uses default tracePropagationTargets when none provided', () => {
    initClient({ dsn: 'd' });
    const arg = vi.mocked(Sentry.init).mock.calls[0]![0] as { tracePropagationTargets: unknown[] };
    expect(arg.tracePropagationTargets).toEqual(['localhost', /^\//]);
  });

  it('honors custom tracePropagationTargets', () => {
    initClient({ dsn: 'd', tracePropagationTargets: ['my-api'] });
    const arg = vi.mocked(Sentry.init).mock.calls[0]![0] as { tracePropagationTargets: unknown[] };
    expect(arg.tracePropagationTargets).toEqual(['my-api']);
  });

  it('skips init when enabled=false', () => {
    initClient({ dsn: 'd', enabled: false });
    expect(Sentry.init).not.toHaveBeenCalled();
  });
});

describe('react/log', () => {
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

  it.each(levels)('forwards %s to Sentry.logger', (level) => {
    log[level]('msg', { k: 'v' });
    expect(Sentry.logger[level]).toHaveBeenCalledWith('msg', { k: 'v' });
  });
});
