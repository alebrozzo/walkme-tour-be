import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  correlationId?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, callback: () => T): T {
  return requestContextStorage.run(context, callback);
}

export function getCorrelationIdFromContext(): string | undefined {
  return requestContextStorage.getStore()?.correlationId;
}
