import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { captureWithContext } from '../core/helpers.js';

@Catch()
export class GlitchtipExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlitchtipExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    const request = ctx.getRequest<{ url?: string; method?: string; headers?: Record<string, string> }>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!isHttp || status >= 500) {
      captureWithContext(exception, {
        tags: { url: request?.url ?? 'unknown', method: request?.method ?? 'unknown' },
        extra: { headers: request?.headers },
      });
      this.logger.error(exception);
    }

    const body = isHttp
      ? exception.getResponse()
      : { statusCode: status, message: 'Internal server error' };

    response.status(status).json(body);
  }
}
