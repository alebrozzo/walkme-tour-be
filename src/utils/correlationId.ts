import { Request, Response, NextFunction } from 'express';

/**
 * Generate a unique correlation ID for tracking requests
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomStr}`;
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
