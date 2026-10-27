import { randomBytes } from "node:crypto";
import { runWithCorrelation, getCorrelationId, getTraceparent } from "./context.js";
import { isValidTraceparent } from "@repo/contracts";

export interface SpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
}

export type SpanStatusCode = "UNSET" | "OK" | "ERROR";

export interface SpanStatus {
  code: SpanStatusCode;
  message?: string;
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

export interface SpanData {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: number;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: SpanStatus;
  attributes: Record<string, unknown>;
  events: SpanEvent[];
}

export class Span {
  readonly name: string;
  readonly context: SpanContext;
  readonly parentSpanId?: string;
  readonly startTime: number;
  endTime?: number;
  status: SpanStatus = { code: "UNSET" };
  readonly attributes: Record<string, unknown>;
  readonly events: SpanEvent[] = [];
  private onEnd?: (span: Span) => void;

  constructor(
    name: string,
    context: SpanContext,
    parentSpanId?: string,
    attributes: Record<string, unknown> = {},
    onEnd?: (span: Span) => void
  ) {
    this.name = name;
    this.context = context;
    this.parentSpanId = parentSpanId;
    this.startTime = Date.now();
    this.attributes = { ...attributes };
    this.onEnd = onEnd;
  }

  setAttribute(key: string, value: unknown): this {
    this.attributes[key] = value;
    return this;
  }

  setAttributes(attributes: Record<string, unknown>): this {
    Object.assign(this.attributes, attributes);
    return this;
  }

  setStatus(status: SpanStatus): this {
    this.status = status;
    return this;
  }

  recordException(exception: Error | string): this {
    const message = exception instanceof Error ? exception.message : String(exception);
    this.setStatus({ code: "ERROR", message });
    this.events.push({
      name: "exception",
      timestamp: Date.now(),
      attributes: {
        "exception.message": message,
        "exception.stack": exception instanceof Error ? exception.stack : undefined,
      },
    });
    return this;
  }

  addEvent(name: string, attributes?: Record<string, unknown>): this {
    this.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
    return this;
  }

  end(): SpanData {
    if (!this.endTime) {
      this.endTime = Date.now();
      if (this.onEnd) {
        this.onEnd(this);
      }
    }
    return this.toData();
  }

  toData(): SpanData {
    const end = this.endTime ?? Date.now();
    return {
      name: this.name,
      traceId: this.context.traceId,
      spanId: this.context.spanId,
      parentSpanId: this.parentSpanId,
      traceFlags: this.context.traceFlags,
      startTime: this.startTime,
      endTime: end,
      durationMs: end - this.startTime,
      status: { ...this.status },
      attributes: { ...this.attributes },
      events: [...this.events],
    };
  }
}

/**
 * Format a SpanContext into a W3C traceparent string: 00-{traceId}-{spanId}-{flags}
 */
export function formatTraceparent(context: SpanContext): string {
  const flagsHex = context.traceFlags.toString(16).padStart(2, "0");
  return `00-${context.traceId}-${context.spanId}-${flagsHex}`;
}

/**
 * Parse a W3C traceparent header string into SpanContext or null if invalid.
 */
export function parseTraceparent(header?: string | null): SpanContext | null {
  if (!header || typeof header !== "string" || !isValidTraceparent(header)) {
    return null;
  }

  const parts = header.split("-");
  if (parts.length < 4) return null;

  const traceId = parts[1]!;
  const spanId = parts[2]!;
  const traceFlags = parseInt(parts[3]!, 16);

  // All-zero traceId or spanId is invalid per W3C spec
  if (/^0+$/.test(traceId) || /^0+$/.test(spanId)) {
    return null;
  }

  return {
    traceId,
    spanId,
    traceFlags: isNaN(traceFlags) ? 1 : traceFlags,
  };
}

/**
 * Extract W3C traceparent header from generic HTTP headers record.
 */
export function extractTraceparent(headers: Record<string, string | string[] | undefined>): SpanContext | null {
  const header = headers["traceparent"] ?? headers["Traceparent"] ?? headers["x-traceparent"];
  const val = Array.isArray(header) ? header[0] : header;
  return parseTraceparent(val);
}

/**
 * Inject W3C traceparent header into outgoing headers record.
 */
export function injectTraceparent(
  headers: Record<string, string>,
  spanOrContext: Span | SpanContext
): Record<string, string> {
  const context = "context" in spanOrContext ? spanOrContext.context : spanOrContext;
  headers["traceparent"] = formatTraceparent(context);
  return headers;
}

export type SpanExportHandler = (spans: SpanData[]) => void | Promise<void>;

let activeSpanExporter: SpanExportHandler | null = null;

export function setSpanExporter(exporter: SpanExportHandler | null): void {
  activeSpanExporter = exporter;
}

export interface OtlpExporterOptions {
  endpoint?: string;
  sourceToken?: string;
  timeoutMs?: number;
}

/**
 * Non-blocking OTLP HTTP exporter wrapper.
 * Forwards spans to endpoint with source token and 500ms timeout cap (FM-704).
 */
export class OtlpSpanExporter {
  readonly endpoint: string;
  readonly sourceToken?: string;
  readonly timeoutMs: number;

  constructor(options: OtlpExporterOptions = {}) {
    this.endpoint = options.endpoint ?? (typeof process !== "undefined" ? process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318" : "http://localhost:4318");
    this.sourceToken = options.sourceToken ?? (typeof process !== "undefined" ? process.env.BETTER_STACK_SOURCE_TOKEN : undefined);
    this.timeoutMs = options.timeoutMs ?? 500;
  }

  async export(spans: SpanData[]): Promise<boolean> {
    if (!spans || spans.length === 0) return true;

    // Call active custom exporter if registered (e.g. for testing)
    if (activeSpanExporter) {
      try {
        await activeSpanExporter(spans);
      } catch {
        // Suppress test handler errors
      }
    }

    // If no endpoint or mocked, resolve safely
    if (!this.endpoint || this.endpoint === "http://localhost:4318" && !process.env.BETTER_STACK_SOURCE_TOKEN) {
      return true;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (this.sourceToken) {
        headers["Authorization"] = `Bearer ${this.sourceToken}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      const fetchPromise = fetch(`${this.endpoint}/v1/traces`, {
        method: "POST",
        headers,
        body: JSON.stringify({ resourceSpans: [{ scopeSpans: [{ spans }] }] }),
        signal: controller.signal,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), this.timeoutMs)
      );

      try {
        await Promise.race([fetchPromise, timeoutPromise]);
        return true;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      // Non-blocking containment per FM-704: never fail caller threads
      return false;
    }
  }
}

export class Tracer {
  readonly serviceName: string;
  readonly exporter: OtlpSpanExporter;

  constructor(serviceName = "platform", exporter?: OtlpSpanExporter) {
    this.serviceName = serviceName;
    this.exporter = exporter ?? new OtlpSpanExporter();
  }

  private generateHex(bytes: number): string {
    return randomBytes(bytes).toString("hex");
  }

  startSpan(
    name: string,
    options: {
      parent?: Span | SpanContext | string;
      attributes?: Record<string, unknown>;
    } = {}
  ): Span {
    let parentContext: SpanContext | null = null;
    let parentSpanId: string | undefined;

    if (options.parent) {
      if (typeof options.parent === "string") {
        parentContext = parseTraceparent(options.parent);
      } else if ("context" in options.parent) {
        parentContext = options.parent.context;
      } else {
        parentContext = options.parent;
      }
    } else {
      // Check active AsyncLocalStorage traceparent
      const activeTrace = getTraceparent();
      if (activeTrace) {
        parentContext = parseTraceparent(activeTrace);
      }
    }

    if (parentContext) {
      parentSpanId = parentContext.spanId;
    }

    const spanContext: SpanContext = {
      traceId: parentContext?.traceId ?? this.generateHex(16), // 32 hex chars
      spanId: this.generateHex(8), // 16 hex chars
      traceFlags: parentContext?.traceFlags ?? 1,
    };

    const initialAttributes = {
      "service.name": this.serviceName,
      ...options.attributes,
    };

    const span = new Span(
      name,
      spanContext,
      parentSpanId,
      initialAttributes,
      (endedSpan) => {
        // Fire-and-forget export without blocking
        this.exporter.export([endedSpan.toData()]).catch(() => {});
      }
    );

    return span;
  }

  async withSpan<T>(
    name: string,
    fn: (span: Span) => T | Promise<T>,
    options: {
      parent?: Span | SpanContext | string;
      attributes?: Record<string, unknown>;
    } = {}
  ): Promise<T> {
    const span = this.startSpan(name, options);
    const traceparent = formatTraceparent(span.context);

    // Run inside correlation scope
    return runWithCorrelation({ traceparent }, async () => {
      try {
        const result = await fn(span);
        if (span.status.code === "UNSET") {
          span.setStatus({ code: "OK" });
        }
        return result;
      } catch (error) {
        span.recordException(error instanceof Error ? error : String(error));
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

let globalTracer: Tracer | null = null;

export function createTracer(serviceName = "platform"): Tracer {
  if (serviceName === "platform") {
    if (!globalTracer) {
      globalTracer = new Tracer("platform");
    }
    return globalTracer;
  }
  return new Tracer(serviceName);
}
