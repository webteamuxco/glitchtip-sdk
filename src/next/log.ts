import * as Sentry from '@sentry/nextjs';

type LogAttributes = Record<string, unknown>;

export interface UxcoLog {
  trace(message: string, attributes?: LogAttributes): void;
  debug(message: string, attributes?: LogAttributes): void;
  info(message: string, attributes?: LogAttributes): void;
  warn(message: string, attributes?: LogAttributes): void;
  error(message: string, attributes?: LogAttributes): void;
  fatal(message: string, attributes?: LogAttributes): void;
}

export const log: UxcoLog = {
  trace: (message, attributes) => Sentry.logger.trace(message, attributes),
  debug: (message, attributes) => Sentry.logger.debug(message, attributes),
  info: (message, attributes) => Sentry.logger.info(message, attributes),
  warn: (message, attributes) => Sentry.logger.warn(message, attributes),
  error: (message, attributes) => Sentry.logger.error(message, attributes),
  fatal: (message, attributes) => Sentry.logger.fatal(message, attributes),
};
