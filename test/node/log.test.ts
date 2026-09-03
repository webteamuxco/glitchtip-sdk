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
import { log } from '../../src/node/log.js';

describe('node/log', () => {
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

  it.each(levels)('forwards %s to Sentry.logger', (level) => {
    log[level]('msg', { k: 'v' });
    expect(Sentry.logger[level]).toHaveBeenCalledWith('msg', { k: 'v' });
  });

  it('forwards messages without attributes', () => {
    log.info('hello');
    expect(Sentry.logger.info).toHaveBeenCalledWith('hello', undefined);
  });
});
