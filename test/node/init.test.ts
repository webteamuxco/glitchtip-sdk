import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  isInitialized: vi.fn(() => false),
}));

import * as Sentry from '@sentry/node';

async function loadInit() {
  vi.resetModules();
  return await import('../../src/node/init.js');
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

describe('node/initNode', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.mocked(Sentry.init).mockClear();
    vi.mocked(Sentry.isInitialized).mockReset().mockReturnValue(false);
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns false and skips Sentry.init when no DSN is provided', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { initNode, isNodeInitialized } = await loadInit();

    expect(initNode({ debug: true })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(isNodeInitialized()).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no DSN provided'));
  });

  it('does not warn when debug is false', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { initNode } = await loadInit();
    initNode({ debug: false });
    expect(warn).not.toHaveBeenCalled();
  });

  it('calls Sentry.init with resolved config when a DSN is provided', async () => {
    const { initNode, isNodeInitialized } = await loadInit();

    expect(initNode({ dsn: 'https://k@host/1', environment: 'test', release: '1.0.0' })).toBe(true);
    expect(Sentry.init).toHaveBeenCalledOnce();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://k@host/1',
        environment: 'test',
        release: '1.0.0',
      }),
    );
    expect(isNodeInitialized()).toBe(true);
  });

  it('falls back to GLITCHTIP_DSN when SENTRY_DSN is unset', async () => {
    process.env.GLITCHTIP_DSN = 'gt-dsn';
    const { initNode } = await loadInit();
    initNode();
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'gt-dsn' }));
  });

  it('is idempotent — only the first call invokes Sentry.init', async () => {
    const { initNode } = await loadInit();
    expect(initNode({ dsn: 'd1' })).toBe(true);
    expect(initNode({ dsn: 'd2' })).toBe(true);
    expect(Sentry.init).toHaveBeenCalledOnce();
  });

  it('does not re-init when another entry point already bound a client', async () => {
    vi.mocked(Sentry.isInitialized).mockReturnValue(true);
    const { initNode, isNodeInitialized } = await loadInit();

    expect(initNode({ dsn: 'd' })).toBe(true);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(isNodeInitialized()).toBe(true);
  });

  it('respects enabled=false even when DSN is set', async () => {
    const { initNode, isNodeInitialized } = await loadInit();
    expect(initNode({ dsn: 'd', enabled: false })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(isNodeInitialized()).toBe(false);
  });

  it('disables includeLocalVariables by default', async () => {
    const { initNode } = await loadInit();
    initNode({ dsn: 'd' });
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ includeLocalVariables: false }));
  });

  it('forwards includeLocalVariables when enabled', async () => {
    const { initNode } = await loadInit();
    initNode({ dsn: 'd', includeLocalVariables: true });
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ includeLocalVariables: true }));
  });

  it('leaves integrations to Sentry defaults when none are provided', async () => {
    const { initNode } = await loadInit();
    initNode({ dsn: 'd' });
    const arg = vi.mocked(Sentry.init).mock.calls[0]![0]!;
    expect(arg).not.toHaveProperty('integrations');
    expect(arg).not.toHaveProperty('tracePropagationTargets');
  });

  it('forwards extra integrations and tracePropagationTargets', async () => {
    const { initNode } = await loadInit();
    const integration = { name: 'Express' };
    initNode({
      dsn: 'd',
      integrations: [integration],
      tracePropagationTargets: ['api.internal', /^\/api\//],
    });
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        integrations: [integration],
        tracePropagationTargets: ['api.internal', /^\/api\//],
      }),
    );
  });

  it('applies sentryOptions last so they override resolved values', async () => {
    const { initNode } = await loadInit();
    initNode({
      dsn: 'd',
      environment: 'staging',
      sentryOptions: { environment: 'override', spotlight: true },
    });
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'override', spotlight: true }),
    );
  });

  it('forwards key config fields to Sentry.init', async () => {
    const { initNode } = await loadInit();
    initNode({
      dsn: 'd',
      tracesSampleRate: 0.5,
      serverName: 'worker-1',
      enableLogs: true,
      ignoreErrors: ['Boom'],
    });
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        tracesSampleRate: 0.5,
        serverName: 'worker-1',
        enableLogs: true,
        ignoreErrors: ['Boom'],
      }),
    );
  });
});
