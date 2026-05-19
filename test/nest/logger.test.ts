import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/log.js', () => ({
  log: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

import { ConsoleLogger } from '@nestjs/common';
import { log } from '../../src/core/log.js';
import { UxcoLogger } from '../../src/nest/logger.js';

describe('UxcoLogger', () => {
  beforeEach(() => {
    vi.spyOn(ConsoleLogger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(ConsoleLogger.prototype, 'error').mockImplementation(() => {});
    vi.spyOn(ConsoleLogger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(ConsoleLogger.prototype, 'debug').mockImplementation(() => {});
    vi.spyOn(ConsoleLogger.prototype, 'verbose').mockImplementation(() => {});
    vi.spyOn(ConsoleLogger.prototype, 'fatal').mockImplementation(() => {});
  });

  it('routes log → info with default Nest context', () => {
    const logger = new UxcoLogger();
    logger.log('hello');
    expect(log.info).toHaveBeenCalledWith('hello', { context: 'Nest' });
  });

  it('routes error → error', () => {
    const logger = new UxcoLogger();
    logger.error('oops');
    expect(log.error).toHaveBeenCalledWith('oops', { context: 'Nest' });
  });

  it('routes warn → warn', () => {
    new UxcoLogger().warn('warn-msg');
    expect(log.warn).toHaveBeenCalledWith('warn-msg', { context: 'Nest' });
  });

  it('routes debug → debug', () => {
    new UxcoLogger().debug('dbg');
    expect(log.debug).toHaveBeenCalledWith('dbg', { context: 'Nest' });
  });

  it('routes verbose → trace', () => {
    new UxcoLogger().verbose('verbose-msg');
    expect(log.trace).toHaveBeenCalledWith('verbose-msg', { context: 'Nest' });
  });

  it('routes fatal → fatal', () => {
    new UxcoLogger().fatal('fatal-msg');
    expect(log.fatal).toHaveBeenCalledWith('fatal-msg', { context: 'Nest' });
  });

  it('serializes Error instances to their message', () => {
    new UxcoLogger().error(new Error('boom'));
    expect(log.error).toHaveBeenCalledWith('boom', { context: 'Nest' });
  });

  it('serializes plain objects with JSON.stringify', () => {
    new UxcoLogger().log({ foo: 'bar' });
    expect(log.info).toHaveBeenCalledWith('{"foo":"bar"}', { context: 'Nest' });
  });

  it('falls back to String() when JSON.stringify throws (circular ref)', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    new UxcoLogger().log(circular);
    const call = vi.mocked(log.info).mock.calls.at(-1)!;
    expect(typeof call[0]).toBe('string');
    expect(call[1]).toEqual({ context: 'Nest' });
  });

  it('treats the last string param as the context override', () => {
    new UxcoLogger().log('hi', 'UserService');
    expect(log.info).toHaveBeenCalledWith('hi', { context: 'UserService' });
  });

  it('collects non-string params into attrs.params', () => {
    new UxcoLogger().log('hi', { a: 1 }, [1, 2]);
    expect(log.info).toHaveBeenCalledWith('hi', {
      context: 'Nest',
      params: [{ a: 1 }, [1, 2]],
    });
  });

  it('extracts trailing string as context AND keeps preceding params', () => {
    new UxcoLogger().log('hi', { a: 1 }, 'UserService');
    expect(log.info).toHaveBeenCalledWith('hi', {
      context: 'UserService',
      params: [{ a: 1 }],
    });
  });
});
