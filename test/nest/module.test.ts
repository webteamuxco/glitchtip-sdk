import 'reflect-metadata';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/init.js', () => ({
  initErrorTracking: vi.fn(),
}));

import { initErrorTracking } from '../../src/core/init.js';
import { GlitchtipExceptionFilter } from '../../src/nest/filter.js';
import { GlitchtipBreadcrumbInterceptor } from '../../src/nest/interceptor.js';
import { UxcoLogger } from '../../src/nest/logger.js';
import { GlitchtipModule } from '../../src/nest/module.js';

type ProviderRecord = { provide: unknown; useClass: unknown };

describe('GlitchtipModule.forRoot', () => {
  beforeEach(() => {
    vi.mocked(initErrorTracking).mockClear();
  });

  it('invokes initErrorTracking with the provided options', () => {
    GlitchtipModule.forRoot({ dsn: 'my-dsn', environment: 'staging' });
    expect(initErrorTracking).toHaveBeenCalledWith({ dsn: 'my-dsn', environment: 'staging' });
  });

  it('registers UxcoLogger, the global filter, and the global interceptor by default', () => {
    const mod = GlitchtipModule.forRoot();
    const providers = mod.providers ?? [];

    expect(providers).toContain(UxcoLogger);
    const filter = providers.find(
      (p): p is ProviderRecord => typeof p === 'object' && (p as ProviderRecord).provide === APP_FILTER,
    );
    const interceptor = providers.find(
      (p): p is ProviderRecord => typeof p === 'object' && (p as ProviderRecord).provide === APP_INTERCEPTOR,
    );
    expect(filter?.useClass).toBe(GlitchtipExceptionFilter);
    expect(interceptor?.useClass).toBe(GlitchtipBreadcrumbInterceptor);
  });

  it('omits the global filter when registerGlobalFilter is false', () => {
    const mod = GlitchtipModule.forRoot({ registerGlobalFilter: false });
    const providers = mod.providers ?? [];
    const filter = providers.find(
      (p) => typeof p === 'object' && (p as ProviderRecord).provide === APP_FILTER,
    );
    expect(filter).toBeUndefined();
  });

  it('omits the global interceptor when registerGlobalInterceptor is false', () => {
    const mod = GlitchtipModule.forRoot({ registerGlobalInterceptor: false });
    const providers = mod.providers ?? [];
    const interceptor = providers.find(
      (p) => typeof p === 'object' && (p as ProviderRecord).provide === APP_INTERCEPTOR,
    );
    expect(interceptor).toBeUndefined();
  });

  it('always exports UxcoLogger', () => {
    const mod = GlitchtipModule.forRoot();
    expect(mod.exports).toContain(UxcoLogger);
  });
});
