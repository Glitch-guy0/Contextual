/**
 * Canonical Environment Configuration Schema & Validator
 * Grounding: _documentation/planning/contracts/config-schema.yaml
 */

export interface AppConfig {
  PORT: number;
  NODE_ENV: "development" | "test" | "production";
  LOG_LEVEL: "debug" | "info" | "warn" | "error" | "critical";
  DATABASE_URL: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD?: string;
  POSTGRES_DB: string;
  REDIS_URL: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  OTEL_EXPORTER_OTLP_ENDPOINT: string;
}

export interface EnvValidationError {
  variable: string;
  message: string;
}

export class ConfigValidationError extends Error {
  readonly errors: readonly EnvValidationError[];

  constructor(errors: EnvValidationError[]) {
    const details = errors.map((e) => `  - ${e.variable}: ${e.message}`).join("\n");
    super(`Environment configuration validation failed:\n${details}`);
    this.name = "ConfigValidationError";
    this.errors = errors;
  }
}

export function validateEnv(rawEnv: Record<string, string | undefined> = process.env): AppConfig {
  const errors: EnvValidationError[] = [];

  const nodeEnv = (rawEnv.NODE_ENV ?? "development") as AppConfig["NODE_ENV"];
  if (!["development", "test", "production"].includes(nodeEnv)) {
    errors.push({
      variable: "NODE_ENV",
      message: `Must be one of 'development' | 'test' | 'production', got '${rawEnv.NODE_ENV}'`,
    });
  }

  const portStr = rawEnv.PORT ?? "3000";
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    errors.push({
      variable: "PORT",
      message: `Must be a valid integer between 1 and 65535, got '${portStr}'`,
    });
  }

  const logLevel = (rawEnv.LOG_LEVEL ?? "info") as AppConfig["LOG_LEVEL"];
  if (!["debug", "info", "warn", "error", "critical"].includes(logLevel)) {
    errors.push({
      variable: "LOG_LEVEL",
      message: `Must be one of 'debug' | 'info' | 'warn' | 'error' | 'critical', got '${rawEnv.LOG_LEVEL}'`,
    });
  }

  const dbUrl = rawEnv.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === "") {
    errors.push({
      variable: "DATABASE_URL",
      message: "Mandatory PostgreSQL connection string is missing or empty",
    });
  } else if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
    errors.push({
      variable: "DATABASE_URL",
      message: "Must be a valid postgres URI starting with postgresql:// or postgres://",
    });
  }

  const clerkPubKey = rawEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!clerkPubKey || clerkPubKey.trim() === "") {
    errors.push({
      variable: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      message: "Mandatory Clerk publishable key is missing or empty",
    });
  } else if (!clerkPubKey.startsWith("pk_")) {
    errors.push({
      variable: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      message: `Clerk publishable key must begin with 'pk_', got '${clerkPubKey.slice(0, 5)}...'`,
    });
  }

  const clerkSecretKey = rawEnv.CLERK_SECRET_KEY;
  if (!clerkSecretKey || clerkSecretKey.trim() === "") {
    errors.push({
      variable: "CLERK_SECRET_KEY",
      message: "Mandatory Clerk secret key is missing or empty",
    });
  } else if (!clerkSecretKey.startsWith("sk_")) {
    errors.push({
      variable: "CLERK_SECRET_KEY",
      message: `Clerk secret key must begin with 'sk_', got '${clerkSecretKey.slice(0, 5)}...'`,
    });
  }

  if (errors.length > 0) {
    throw new ConfigValidationError(errors);
  }

  return {
    PORT: port,
    NODE_ENV: nodeEnv,
    LOG_LEVEL: logLevel,
    DATABASE_URL: dbUrl!,
    POSTGRES_USER: rawEnv.POSTGRES_USER ?? "postgres",
    POSTGRES_PASSWORD: rawEnv.POSTGRES_PASSWORD,
    POSTGRES_DB: rawEnv.POSTGRES_DB ?? "contextual_dev",
    REDIS_URL: rawEnv.REDIS_URL ?? "redis://localhost:6379",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: clerkPubKey!,
    CLERK_SECRET_KEY: clerkSecretKey!,
    OTEL_EXPORTER_OTLP_ENDPOINT: rawEnv.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318",
  };
}
