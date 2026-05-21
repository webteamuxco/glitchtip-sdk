import { _INTERNAL_captureLog } from '@sentry/core';

type LogAttributes = Record<string, unknown>;
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface UxcoLog {
  trace(message: string, attributes?: LogAttributes): void;
  debug(message: string, attributes?: LogAttributes): void;
  info(message: string, attributes?: LogAttributes): void;
  warn(message: string, attributes?: LogAttributes): void;
  error(message: string, attributes?: LogAttributes): void;
  fatal(message: string, attributes?: LogAttributes): void;
}

function captureLog(level: LogLevel, message: string, attributes?: LogAttributes): void {
  _INTERNAL_captureLog({ level, message, attributes });
}

export const log: UxcoLog = {
  trace: (message, attributes) => captureLog('trace', message, attributes),
  debug: (message, attributes) => captureLog('debug', message, attributes),
  info: (message, attributes) => captureLog('info', message, attributes),
  warn: (message, attributes) => captureLog('warn', message, attributes),
  error: (message, attributes) => captureLog('error', message, attributes),
  fatal: (message, attributes) => captureLog('fatal', message, attributes),
};
