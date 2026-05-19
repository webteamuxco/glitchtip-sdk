import { ConsoleLogger, Injectable, type LoggerService, type LogLevel } from '@nestjs/common';
import { log } from '../core/log.js';

@Injectable()
export class UxcoLogger extends ConsoleLogger implements LoggerService {
  override log(message: unknown, ...optionalParams: unknown[]): void {
    super.log(message, ...optionalParams);
    log.info(this.toLogMessage(message), this.buildAttributes(optionalParams));
  }

  override error(message: unknown, ...optionalParams: unknown[]): void {
    super.error(message, ...optionalParams);
    log.error(this.toLogMessage(message), this.buildAttributes(optionalParams));
  }

  override warn(message: unknown, ...optionalParams: unknown[]): void {
    super.warn(message, ...optionalParams);
    log.warn(this.toLogMessage(message), this.buildAttributes(optionalParams));
  }

  override debug(message: unknown, ...optionalParams: unknown[]): void {
    super.debug(message, ...optionalParams);
    log.debug(this.toLogMessage(message), this.buildAttributes(optionalParams));
  }

  override verbose(message: unknown, ...optionalParams: unknown[]): void {
    super.verbose(message, ...optionalParams);
    log.trace(this.toLogMessage(message), this.buildAttributes(optionalParams));
  }

  override fatal(message: unknown, ...optionalParams: unknown[]): void {
    super.fatal?.(message, ...optionalParams);
    log.fatal(this.toLogMessage(message), this.buildAttributes(optionalParams));
  }

  override setLogLevels(levels: LogLevel[]): void {
    super.setLogLevels?.(levels);
  }

  private toLogMessage(message: unknown): string {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  private buildAttributes(params: unknown[]): Record<string, unknown> {
    const attrs: Record<string, unknown> = { context: this.context ?? 'Nest' };
    if (params.length === 0) return attrs;

    const last = params[params.length - 1];
    if (typeof last === 'string') {
      attrs.context = last;
      if (params.length > 1) attrs.params = params.slice(0, -1);
    } else {
      attrs.params = params;
    }
    return attrs;
  }
}
