import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
}));

import * as Sentry from '@sentry/nextjs';
import { initServer } from '../../src/next/server.js';

const ENV_KEYS = ['SENTRY_DSN', 'GLITCHTIP_DSN', 'NODE_ENV'] as const;

describe('next/initServer', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.mocked(Sentry.init).mockClear();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('does nothing when no DSN is provided', () => {
    initServer();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('prefers opts.dsn over env', () => {
    process.env.SENTRY_DSN = 'env-dsn';
    initServer({ dsn: 'opts-dsn' });
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'opts-dsn' }));
  });

  it('falls back to SENTRY_DSN', () => {
    process.env.SENTRY_DSN = 'env-dsn';
    initServer();
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'env-dsn' }));
  });

  it('falls back to GLITCHTIP_DSN when SENTRY_DSN is unset', () => {
    process.env.GLITCHTIP_DSN = 'gt-dsn';
    initServer();
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'gt-dsn' }));
  });

  it('skips init when enabled=false even with a DSN', () => {
    initServer({ dsn: 'd', enabled: false });
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('forwards key config fields to Sentry.init', () => {
    initServer({
      dsn: 'd',
      environment: 'staging',
      release: '1.0.0',
      tracesSampleRate: 0.5,
      enableLogs: true,
    });
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'd',
        environment: 'staging',
        release: '1.0.0',
        tracesSampleRate: 0.5,
        enableLogs: true,
      }),
    );
  });
});
