import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  correlationId?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext(context: RequestContext, callback: () => void): void {
  requestContextStorage.run(context, callback);
}

export function getCorrelationIdFromContext(): string | undefined {
  return requestContextStorage.getStore()?.correlationId;
}
