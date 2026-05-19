import 'reflect-metadata';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/helpers.js', () => ({
  addBreadcrumb: vi.fn(),
}));

import { addBreadcrumb } from '../../src/core/helpers.js';
import { GlitchtipBreadcrumbInterceptor } from '../../src/nest/interceptor.js';

function makeHttpContext(req: { method?: string; url?: string }): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeNonHttpContext(): ExecutionContext {
  return { getType: () => 'rpc' } as unknown as ExecutionContext;
}

describe('GlitchtipBreadcrumbInterceptor', () => {
  it('adds an http breadcrumb on incoming HTTP requests', async () => {
    const interceptor = new GlitchtipBreadcrumbInterceptor();
    const ctx = makeHttpContext({ method: 'GET', url: '/users' });
    const next: CallHandler = { handle: () => of('ok') };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({ complete: resolve });
    });

    expect(addBreadcrumb).toHaveBeenCalledWith('GET /users', undefined, 'http');
  });

  it('does not add a request breadcrumb for non-HTTP contexts', async () => {
    const interceptor = new GlitchtipBreadcrumbInterceptor();
    const ctx = makeNonHttpContext();
    const next: CallHandler = { handle: () => of('ok') };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({ complete: resolve });
    });

    expect(addBreadcrumb).not.toHaveBeenCalled();
  });

  it('adds an error breadcrumb with duration when the handler errors', async () => {
    const interceptor = new GlitchtipBreadcrumbInterceptor();
    const ctx = makeHttpContext({ method: 'POST', url: '/fail' });
    const next: CallHandler = { handle: () => throwError(() => new Error('boom')) };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({
        error: () => resolve(),
      });
    });

    expect(addBreadcrumb).toHaveBeenCalledWith('POST /fail', undefined, 'http');
    expect(addBreadcrumb).toHaveBeenCalledWith(
      'handler error',
      expect.objectContaining({ message: expect.stringContaining('boom'), durationMs: expect.any(Number) }),
      'error',
    );
  });

  it('falls back to "REQ" when method is missing', async () => {
    const interceptor = new GlitchtipBreadcrumbInterceptor();
    const ctx = makeHttpContext({});
    const next: CallHandler = { handle: () => of('ok') };

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, next).subscribe({ complete: resolve });
    });

    expect(addBreadcrumb).toHaveBeenCalledWith('REQ', undefined, 'http');
  });
});
