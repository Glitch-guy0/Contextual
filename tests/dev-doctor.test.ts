import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  runDoctor,
  probeLayer1Runtime,
  probeLayer3Environment,
  probeLayer7Packages,
  probeLayer8BuildHealth,
} from "../packages/config/src/doctor/index";

describe("Milestone M1 — Story S1.2: 8-Layer Developer Diagnostic Suite (npm run dev:doctor)", () => {
  const rootDir = resolve(import.meta.dir, "..");

  test("TC-1.2.1: Doctor engine instantiates all 8 distinct diagnostic layers with timeout budgets", async () => {
    const report = await runDoctor({
      projectRoot: rootDir,
      customEnv: {
        PORT: "3000",
        NODE_ENV: "test",
        LOG_LEVEL: "info",
        DATABASE_URL: "postgresql://postgres:postgrespassword@localhost:5432/contextual_dev",
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_sample",
        CLERK_SECRET_KEY: "sk_test_sample",
      },
    });

    expect(report.layers.length).toBe(8);
    expect(report.totalDurationMs).toBeGreaterThan(0);
    expect(report.totalDurationMs).toBeLessThan(300000); // Well under 5-minute SLA

    const layerNumbers = report.layers.map((l) => l.layer);
    expect(layerNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    for (const layer of report.layers) {
      expect(["PASS", "FAIL", "WARN"]).toContain(layer.status);
      expect(layer.durationMs).toBeGreaterThanOrEqual(0);
      expect(layer.message.length).toBeGreaterThan(0);
    }
  });

  test("TC-1.2.2: Layer 1 correctly asserts Node >= 22 or Bun >= 1.1 runtime compatibility", async () => {
    const result = await probeLayer1Runtime();
    expect(result.layer).toBe(1);
    expect(result.name).toContain("Runtime");
    expect(result.status).toBe("PASS");
    expect(result.message).toMatch(/(Bun|Node\.js) runtime version/);
  });

  test("TC-1.2.3: Layer 3 flags missing or malformed required environment variables", async () => {
    // Malformed environment
    const failResult = await probeLayer3Environment({
      PORT: "not-a-number",
      DATABASE_URL: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "bad_prefix",
      CLERK_SECRET_KEY: "bad_secret",
    });

    expect(failResult.layer).toBe(3);
    expect(failResult.status).toBe("FAIL");
    expect(failResult.message).toContain("Environment validation failed");
    expect(failResult.suggestion).toContain(".env.example");

    // Compliant environment
    const passResult = await probeLayer3Environment({
      PORT: "3000",
      NODE_ENV: "development",
      LOG_LEVEL: "info",
      DATABASE_URL: "postgresql://postgres:postgrespassword@localhost:5432/contextual_dev",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_valid",
      CLERK_SECRET_KEY: "sk_test_valid",
    });

    expect(passResult.status).toBe("PASS");
    expect(passResult.message).toContain("canonical config schema");
  });

  test("TC-1.2.4: Monorepo package resolution and Turborepo DAG integrity pass", async () => {
    const layer7 = await probeLayer7Packages(rootDir);
    expect(layer7.layer).toBe(7);
    expect(layer7.status).toBe("PASS");
    expect(layer7.message).toMatch(/All (?:4|5) internal workspace packages resolved/);

    const layer8 = await probeLayer8BuildHealth(rootDir);
    expect(layer8.layer).toBe(8);
    expect(layer8.status).toBe("PASS");
    expect(layer8.message).toContain("Turborepo pipeline DAG validated");
  });
});
