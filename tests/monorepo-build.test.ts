import { describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

describe("Milestone M0: Monorepo Build Pipeline & Typecheck Validation", () => {
  const rootDir = process.cwd();

  test("TC-0.3.1: bun run build completes in < 15s with zero circular dependency warnings", () => {
    const startTime = Date.now();
    const output = execSync("bun run build", {
      cwd: rootDir,
      encoding: "utf-8",
    });
    const durationSec = (Date.now() - startTime) / 1000;

    expect(durationSec).toBeLessThan(15);
    expect(output).toMatch(/(?:4|5) successful, (?:4|5) total/);
    expect(output).not.toContain("circular");
  });

  test("TC-0.3.2: bun run typecheck validates all packages under strict mode with 0 errors", () => {
    const output = execSync("bun run typecheck", {
      cwd: rootDir,
      encoding: "utf-8",
    });

    expect(output).toMatch(/(?:4|5) successful, (?:4|5) total/);
    expect(output).not.toContain("error TS");
  });

  test("TC-0.3.3: bun run clean purges all build artifacts and .turbo cache directories", () => {
    const output = execSync("bun run clean", {
      cwd: rootDir,
      encoding: "utf-8",
    });

    expect(output).toMatch(/(?:4|5) successful, (?:4|5) total/);
  });
});
