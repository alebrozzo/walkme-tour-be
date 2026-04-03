import { Request } from 'express';
import { randomBytes } from 'crypto';

/**
 * Generate a unique correlation ID for tracking requests
 */
export function generateCorrelationId(): string {
  return randomBytes(3).toString('hex');
}

/**
 * Extract correlation ID from request headers or generate a new one
 */
export function getOrGenerateCorrelationId(req: Request): string {
  const headerValue = req.headers['x-correlation-id'];

  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue;
  }

  return generateCorrelationId();
}

/**
 * Store correlation ID in request object for access in route handlers
 */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}
