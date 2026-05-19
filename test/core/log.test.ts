import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/node', () => ({
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

import * as Sentry from '@sentry/node';
import { log } from '../../src/core/log.js';

describe('log', () => {
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

  it.each(levels)('forwards %s calls to Sentry.logger with attributes', (level) => {
    log[level]('msg', { user: 'mika' });
    expect(Sentry.logger[level]).toHaveBeenCalledWith('msg', { user: 'mika' });
  });

  it('forwards messages without attributes', () => {
    log.info('hello');
    expect(Sentry.logger.info).toHaveBeenCalledWith('hello', undefined);
  });
});
