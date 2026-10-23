import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { validateEnv, ConfigValidationError } from "../packages/config/src/env";

describe("Milestone M1 — Story S1.1: Local Infrastructure & Environment Configuration", () => {
  const rootDir = resolve(import.meta.dir, "..");

  test("TC-1.1.1: infra/compose.yaml defines valid postgres:16-alpine and redis:7-alpine services with healthchecks", () => {
    const composePath = resolve(rootDir, "infra/compose.yaml");
    expect(existsSync(composePath)).toBe(true);

    const content = readFileSync(composePath, "utf-8");
    // Verify postgres service
    expect(content).toContain("postgres:16-alpine");
    expect(content).toContain("contextual-postgres");
    expect(content).toContain("5432:5432");
    expect(content).toContain("POSTGRES_DB: contextual_dev");
    expect(content).toContain("pg_isready -U postgres");

    // Verify redis service
    expect(content).toContain("redis:7-alpine");
    expect(content).toContain("contextual-redis");
    expect(content).toContain("6379:6379");
    expect(content).toContain("redis-cli");
    expect(content).toContain("ping");

    // Verify named volumes
    expect(content).toContain("postgres_data:");
    expect(content).toContain("redis_data:");
  });

  test("TC-1.1.2: .env.example contains all required environment variables with sensible local defaults", () => {
    const envPath = resolve(rootDir, ".env.example");
    expect(existsSync(envPath)).toBe(true);

    const content = readFileSync(envPath, "utf-8");
    const requiredVars = [
      "PORT",
      "NODE_ENV",
      "LOG_LEVEL",
      "DATABASE_URL",
      "POSTGRES_USER",
      "POSTGRES_PASSWORD",
      "POSTGRES_DB",
      "REDIS_URL",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "CLERK_SECRET_KEY",
      "OTEL_EXPORTER_OTLP_ENDPOINT",
    ];

    for (const v of requiredVars) {
      expect(content).toContain(`${v}=`);
    }

    // Verify local container connection strings
    expect(content).toContain("postgresql://postgres:postgrespassword@localhost:5432/contextual_dev");
    expect(content).toContain("redis://localhost:6379");
    expect(content).toContain("pk_test_");
    expect(content).toContain("sk_test_");
  });

  test("TC-1.1.3: packages/config/src/env.ts validates valid environment configurations and rejects invalid inputs", () => {
    // Valid configuration sample
    const validConfig = validateEnv({
      PORT: "4000",
      NODE_ENV: "test",
      LOG_LEVEL: "debug",
      DATABASE_URL: "postgresql://postgres:password@localhost:5432/test_db",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_12345",
      CLERK_SECRET_KEY: "sk_test_67890",
    });

    expect(validConfig.PORT).toBe(4000);
    expect(validConfig.NODE_ENV).toBe("test");
    expect(validConfig.LOG_LEVEL).toBe("debug");
    expect(validConfig.DATABASE_URL).toBe("postgresql://postgres:password@localhost:5432/test_db");
    expect(validConfig.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe("pk_test_12345");
    expect(validConfig.CLERK_SECRET_KEY).toBe("sk_test_67890");
    expect(validConfig.REDIS_URL).toBe("redis://localhost:6379");

    // Invalid port
    expect(() =>
      validateEnv({
        PORT: "-1",
        DATABASE_URL: "postgresql://localhost:5432/db",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
        CLERK_SECRET_KEY: "sk_test_123",
      })
    ).toThrow(ConfigValidationError);

    // Missing DATABASE_URL
    expect(() =>
      validateEnv({
        PORT: "3000",
        DATABASE_URL: "",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
        CLERK_SECRET_KEY: "sk_test_123",
      })
    ).toThrow(ConfigValidationError);

    // Malformed Clerk keys (missing pk_ or sk_ prefix)
    expect(() =>
      validateEnv({
        DATABASE_URL: "postgresql://localhost:5432/db",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "invalid_key",
        CLERK_SECRET_KEY: "invalid_secret",
      })
    ).toThrow(ConfigValidationError);
  });
});
