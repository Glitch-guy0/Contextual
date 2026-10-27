import type { LogLevel } from "@repo/contracts";
import { getCorrelationId, getTraceparent } from "./context.js";
import { redactSecrets } from "./redact.js";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  correlation_id: string;
  service: string;
  event: string;
  payload: Record<string, unknown> | unknown;
  traceparent?: string;
}

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  critical: 60,
};

export type LogDestination = (entry: LogEntry, rawJson: string) => void;

let activeDestination: LogDestination | null = null;

/**
 * Set a custom log sink/destination (useful for test assertions and custom transports).
 */
export function setLogDestination(destination: LogDestination | null): void {
  activeDestination = destination;
}

export interface LoggerOptions {
  service?: string;
  minLevel?: LogLevel;
}

export class Logger {
  readonly service: string;
  readonly minLevel: LogLevel;

  constructor(options: LoggerOptions = {}) {
    this.service = options.service ?? "platform";
    const envLevel = (typeof process !== "undefined" && process.env?.LOG_LEVEL) as LogLevel | undefined;
    this.minLevel = options.minLevel ?? (envLevel && LEVEL_SEVERITY[envLevel] !== undefined ? envLevel : "info");
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_SEVERITY[level] >= LEVEL_SEVERITY[this.minLevel];
  }

  log(level: LogLevel, event: string, payload: unknown = {}): LogEntry | null {
    if (!this.shouldLog(level)) {
      return null;
    }

    const correlationId = getCorrelationId();
    const traceparent = getTraceparent();

    // Redact payload secrets
    const sanitizedPayload = redactSecrets(payload);

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      correlation_id: correlationId,
      service: this.service,
      event,
      payload: sanitizedPayload,
    };

    if (traceparent) {
      entry.traceparent = traceparent;
    }

    const rawJson = JSON.stringify(entry);

    if (activeDestination) {
      activeDestination(entry, rawJson);
    } else {
      // Standard output
      process.stdout.write(rawJson + "\n");
    }

    return entry;
  }

  debug(event: string, payload?: unknown): LogEntry | null {
    return this.log("debug", event, payload);
  }

  info(event: string, payload?: unknown): LogEntry | null {
    return this.log("info", event, payload);
  }

  warn(event: string, payload?: unknown): LogEntry | null {
    return this.log("warn", event, payload);
  }

  error(event: string, payload?: unknown): LogEntry | null {
    return this.log("error", event, payload);
  }

  critical(event: string, payload?: unknown): LogEntry | null {
    return this.log("critical", event, payload);
  }
}

// Global logger singleton
let defaultLogger: Logger | null = null;

/**
 * Get the singleton logger instance or create one for the specified service.
 */
export function getLogger(service = "platform", minLevel?: LogLevel): Logger {
  if (service === "platform" && !minLevel) {
    if (!defaultLogger) {
      defaultLogger = new Logger({ service: "platform" });
    }
    return defaultLogger;
  }
  return new Logger({ service, minLevel });
}

/**
 * Format a JSON log object conforming strictly to platform schema.
 */
export function formatJsonLog(
  level: LogLevel,
  event: string,
  payload: unknown = {},
  options?: { service?: string; correlationId?: string; traceparent?: string }
): LogEntry {
  const correlationId = options?.correlationId ?? getCorrelationId();
  const traceparent = options?.traceparent ?? getTraceparent();

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlation_id: correlationId,
    service: options?.service ?? "platform",
    event,
    payload: redactSecrets(payload),
  };

  if (traceparent) {
    entry.traceparent = traceparent;
  }

  return entry;
}
