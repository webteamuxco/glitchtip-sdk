import { describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/core', () => ({
  _INTERNAL_captureLog: vi.fn(),
}));

import { _INTERNAL_captureLog } from '@sentry/core';
import { log } from '../../src/core/log.js';

describe('log', () => {
  const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

  it.each(levels)('forwards %s calls to _INTERNAL_captureLog with attributes', (level) => {
    log[level]('msg', { user: 'mika' });
    expect(_INTERNAL_captureLog).toHaveBeenCalledWith({
      level,
      message: 'msg',
      attributes: { user: 'mika' },
    });
  });

  it('forwards messages without attributes', () => {
    log.info('hello');
    expect(_INTERNAL_captureLog).toHaveBeenCalledWith({
      level: 'info',
      message: 'hello',
      attributes: undefined,
    });
  });
});
