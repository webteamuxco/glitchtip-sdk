import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { initErrorTracking } from '../core/init.js';
import type { UxcoTrackingOptions } from '../core/defaults.js';
import { GlitchtipExceptionFilter } from './filter.js';
import { GlitchtipBreadcrumbInterceptor } from './interceptor.js';

export interface GlitchtipModuleOptions extends UxcoTrackingOptions {
  registerGlobalFilter?: boolean;
  registerGlobalInterceptor?: boolean;
}

@Global()
@Module({})
export class GlitchtipModule {
  static forRoot(options: GlitchtipModuleOptions = {}): DynamicModule {
    initErrorTracking(options);

    const providers = [];
    if (options.registerGlobalFilter !== false) {
      providers.push({ provide: APP_FILTER, useClass: GlitchtipExceptionFilter });
    }
    if (options.registerGlobalInterceptor !== false) {
      providers.push({ provide: APP_INTERCEPTOR, useClass: GlitchtipBreadcrumbInterceptor });
    }

    return {
      module: GlitchtipModule,
      providers,
      exports: [],
    };
  }
}
