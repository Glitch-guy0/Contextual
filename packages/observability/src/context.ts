import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export interface RequestContext {
  correlationId: string;
  traceparent?: string;
  userId?: string;
  service?: string;
  attributes?: Record<string, unknown>;
}

export const contextStore = new AsyncLocalStorage<RequestContext>();

/**
 * Generate a standard correlation ID (e.g. corr_uuid)
 */
export function createCorrelationId(prefix = "corr"): string {
  return `${prefix}_${randomUUID()}`;
}

/**
 * Execute a function within an asynchronous correlation context.
 */
export function runWithCorrelation<T>(
  contextOrId: (Partial<RequestContext> & { correlationId?: string; traceparent?: string }) | string,
  fn: () => T
): T {
  let context: RequestContext;
  const currentStore = contextStore.getStore();

  if (typeof contextOrId === "string") {
    context = {
      correlationId: contextOrId,
      traceparent: currentStore?.traceparent,
      userId: currentStore?.userId,
      service: currentStore?.service,
      attributes: currentStore?.attributes ? { ...currentStore.attributes } : undefined,
    };
  } else {
    context = {
      correlationId: contextOrId.correlationId ?? currentStore?.correlationId ?? createCorrelationId(),
      traceparent: contextOrId.traceparent ?? currentStore?.traceparent,
      userId: contextOrId.userId ?? currentStore?.userId,
      service: contextOrId.service ?? currentStore?.service,
      attributes: contextOrId.attributes
        ? { ...currentStore?.attributes, ...contextOrId.attributes }
        : currentStore?.attributes
        ? { ...currentStore.attributes }
        : undefined,
    };
  }

  return contextStore.run(context, fn);
}

/**
 * Get current correlation ID or 'none' if outside correlation context.
 */
export function getCorrelationId(): string {
  return contextStore.getStore()?.correlationId ?? "none";
}

/**
 * Get current W3C traceparent header or undefined if not set.
 */
export function getTraceparent(): string | undefined {
  return contextStore.getStore()?.traceparent;
}

/**
 * Get entire active request context or undefined.
 */
export function getContext(): RequestContext | undefined {
  return contextStore.getStore();
}

/**
 * Mutate active request context with additional attributes.
 */
export function setContextAttribute(key: string, value: unknown): void {
  const store = contextStore.getStore();
  if (store) {
    if (!store.attributes) {
      store.attributes = {};
    }
    store.attributes[key] = value;
  }
}
