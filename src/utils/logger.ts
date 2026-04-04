type LogLevel = 'log' | 'warn' | 'error';
import { getCorrelationIdFromContext } from './requestContext.js';

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
function formatLogMessage(message: string, data?: string): string {
  const id = getCorrelationIdFromContext() || 'unknown';
  const baseMsg = `[${id}] ${message}`;
  return data ? `${baseMsg} ${data}` : baseMsg;
}

/**
 * Log a message if logging is enabled
 */
export function logMessage(level: LogLevel, message: string, data?: string): void {
  if (!logContext.enableLogging) {
    return;
  }

  const formattedMsg = formatLogMessage(message, data);

  if (level === 'log') {
    console.log(formattedMsg);
  } else if (level === 'warn') {
    console.warn(formattedMsg);
  } else if (level === 'error') {
    console.error(formattedMsg);
  }
}
