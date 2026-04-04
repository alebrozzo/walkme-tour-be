import type { Request } from 'express';

type LogLevel = 'log' | 'warn' | 'error';

interface LogContext {
  enableLogging: boolean;
}

// Determine if logging is enabled based on environment
const logContext: LogContext = {
  enableLogging: process.env.NODE_ENV === 'development' || process.env.ENABLE_LOGGING === 'true',
};

/**
 * Set logging context globally (can be called at app initialization)
 */
export function setLoggingContext(context: Partial<LogContext>): void {
  Object.assign(logContext, context);
}

/**
 * Format log message with correlation ID and optional context
 */
function formatLogMessage(
  message: string,
  correlationId?: string,
  data?: Record<string, unknown>,
): string {
  const id = correlationId || 'unknown';
  const baseMsg = `[${id}] ${message}`;

  if (data && Object.keys(data).length > 0) {
    return `${baseMsg} ${JSON.stringify(data)}`;
  }

  return baseMsg;
}

/**
 * Log a message if logging is enabled
 */
export function logMessage(
  level: LogLevel,
  message: string,
  correlationId?: string,
  data?: Record<string, unknown>,
): void {
  if (!logContext.enableLogging) {
    return;
  }

  const formattedMsg = formatLogMessage(message, correlationId, data);

  if (level === 'log') {
    console.log(formattedMsg);
  } else if (level === 'warn') {
    console.warn(formattedMsg);
  } else if (level === 'error') {
    console.error(formattedMsg);
  }
}
