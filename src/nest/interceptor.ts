import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { addBreadcrumb } from '../core/helpers.js';

@Injectable()
export class GlitchtipBreadcrumbInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const type = context.getType();
    if (type === 'http') {
      const req = context.switchToHttp().getRequest<{ method?: string; url?: string }>();
      addBreadcrumb(`${req.method ?? 'REQ'} ${req.url ?? ''}`.trim(), undefined, 'http');
    }
    const start = Date.now();
    return next.handle().pipe(
      tap({
        error: (err) => {
          addBreadcrumb('handler error', { durationMs: Date.now() - start, message: String(err) }, 'error');
        },
      }),
    );
  }
}
