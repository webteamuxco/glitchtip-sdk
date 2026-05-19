import 'reflect-metadata';
import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/helpers.js', () => ({
  captureWithContext: vi.fn(() => 'event-id'),
}));

import { captureWithContext } from '../../src/core/helpers.js';
import { GlitchtipExceptionFilter } from '../../src/nest/filter.js';

function buildHost(request: { url?: string; method?: string; headers?: Record<string, string> }) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const response = { status };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('GlitchtipExceptionFilter', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  it('captures non-HttpException as 500 and responds with generic body', () => {
    const filter = new GlitchtipExceptionFilter();
    const { host, status, json } = buildHost({ url: '/x', method: 'GET', headers: { h: 'v' } });

    filter.catch(new Error('boom'), host);

    expect(captureWithContext).toHaveBeenCalledWith(expect.any(Error), {
      tags: { url: '/x', method: 'GET' },
      extra: { headers: { h: 'v' } },
    });
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  });

  it('captures 5xx HttpException and forwards its body', () => {
    const filter = new GlitchtipExceptionFilter();
    const { host, status, json } = buildHost({ url: '/x', method: 'POST' });
    const exception = new HttpException({ msg: 'db down' }, 503);

    filter.catch(exception, host);

    expect(captureWithContext).toHaveBeenCalledOnce();
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({ msg: 'db down' });
  });

  it('does NOT capture 4xx HttpException but still responds correctly', () => {
    const filter = new GlitchtipExceptionFilter();
    const { host, status, json } = buildHost({ url: '/x', method: 'GET' });
    const exception = new HttpException('Not found', 404);

    filter.catch(exception, host);

    expect(captureWithContext).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith('Not found');
  });

  it('uses "unknown" tags when request fields are missing', () => {
    const filter = new GlitchtipExceptionFilter();
    const { host } = buildHost({});

    filter.catch(new Error('boom'), host);

    expect(captureWithContext).toHaveBeenCalledWith(expect.any(Error), {
      tags: { url: 'unknown', method: 'unknown' },
      extra: { headers: undefined },
    });
  });
});
