import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("Milestone GA: Story SGA.1 — GitHub Actions CI/CD Pipeline Workflow", () => {
  const workflowPath = join(process.cwd(), ".github/workflows/ci.yml");

  it("TC-GA.1.1: Workflow file exists at .github/workflows/ci.yml", () => {
    expect(existsSync(workflowPath)).toBe(true);
  });

  it("TC-GA.1.2: Workflow file contains required GitHub Actions top-level fields", () => {
    const content = readFileSync(workflowPath, "utf-8");
    expect(content).toContain("name: CI");
    expect(content).toContain("on:");
    expect(content).toContain("push:");
    expect(content).toContain("pull_request:");
    expect(content).toContain("branches: [main]");
    expect(content).toContain("jobs:");
    expect(content).toContain("verify:");
    expect(content).toContain("runs-on: ubuntu-latest");
    expect(content).toContain("timeout-minutes: 15");
  });

  it("TC-GA.1.3: Workflow specifies Bun toolchain setup with frozen lockfile", () => {
    const content = readFileSync(workflowPath, "utf-8");
    expect(content).toContain("uses: actions/checkout@v4");
    expect(content).toContain("fetch-depth: 0");
    expect(content).toContain("uses: oven-sh/setup-bun@v2");
    expect(content).toContain("bun-version: latest");
    expect(content).toContain("run: bun install --frozen-lockfile");
  });

  it("TC-GA.1.4: Workflow enforces strict quality gate commands in sequence", () => {
    const content = readFileSync(workflowPath, "utf-8");
    
    const lintIdx = content.indexOf("bun run lint");
    const typecheckIdx = content.indexOf("bun run typecheck");
    const testIdx = content.indexOf("bun test");
    const buildIdx = content.indexOf("bun run build");

    expect(lintIdx).toBeGreaterThan(0);
    expect(typecheckIdx).toBeGreaterThan(lintIdx);
    expect(testIdx).toBeGreaterThan(typecheckIdx);
    expect(buildIdx).toBeGreaterThan(testIdx);
  });

  it("TC-GA.1.5: Workflow mandates closed 17-member RFC 9457 error catalogue test as an explicit gate", () => {
    const content = readFileSync(workflowPath, "utf-8");
    expect(content).toContain("Verify Closed 17-Member RFC 9457 Error Catalogue");
    expect(content).toContain("run: bun test packages/contracts/tests/errors.test.ts");
  });

  it("TC-GA.1.6: Workflow requires zero external third-party SaaS secrets for standard PR validation", () => {
    const content = readFileSync(workflowPath, "utf-8");
    expect(content).not.toContain("secrets.VERCEL_TOKEN");
    expect(content).not.toContain("secrets.AWS_SECRET_ACCESS_KEY");
  });
});
