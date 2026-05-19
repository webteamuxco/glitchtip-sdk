import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
}));

import * as Sentry from '@sentry/nextjs';
import { initClient } from '../../src/next/client.js';

const ENV_KEYS = [
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_GLITCHTIP_DSN',
  'SENTRY_DSN',
  'GLITCHTIP_DSN',
  'NODE_ENV',
] as const;

describe('next/initClient', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    vi.mocked(Sentry.init).mockClear();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('does nothing when no DSN is available', () => {
    initClient();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('prefers opts.dsn over every env var', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'public';
    initClient({ dsn: 'opts' });
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'opts' }));
  });

  it('uses NEXT_PUBLIC_SENTRY_DSN first', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'pub-sentry';
    process.env.NEXT_PUBLIC_GLITCHTIP_DSN = 'pub-gt';
    process.env.SENTRY_DSN = 'sentry';
    process.env.GLITCHTIP_DSN = 'gt';
    initClient();
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'pub-sentry' }));
  });

  it('falls back to NEXT_PUBLIC_GLITCHTIP_DSN', () => {
    process.env.NEXT_PUBLIC_GLITCHTIP_DSN = 'pub-gt';
    process.env.SENTRY_DSN = 'sentry';
    initClient();
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'pub-gt' }));
  });

  it('falls back to SENTRY_DSN', () => {
    process.env.SENTRY_DSN = 'sentry';
    process.env.GLITCHTIP_DSN = 'gt';
    initClient();
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'sentry' }));
  });

  it('falls back to GLITCHTIP_DSN as last resort', () => {
    process.env.GLITCHTIP_DSN = 'gt';
    initClient();
    expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'gt' }));
  });

  it('skips init when enabled=false even with a DSN', () => {
    initClient({ dsn: 'd', enabled: false });
    expect(Sentry.init).not.toHaveBeenCalled();
  });
});
