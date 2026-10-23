import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ERROR_CATALOGUE, createProblemDetails } from "../packages/contracts/src/index.js";
import { DESIGN_TOKENS } from "../packages/ui/src/index.js";

describe("Milestone M0: Shared Packages Export & Contract Boundary", () => {
  const rootDir = process.cwd();

  test("TC-0.2.1: packages/config exports valid strict TypeScript tsconfig presets", () => {
    const baseConfigPath = join(rootDir, "packages/config/tsconfig.base.json");
    const nodeConfigPath = join(rootDir, "packages/config/tsconfig.node.json");
    const reactConfigPath = join(rootDir, "packages/config/tsconfig.react.json");

    expect(existsSync(baseConfigPath)).toBe(true);
    expect(existsSync(nodeConfigPath)).toBe(true);
    expect(existsSync(reactConfigPath)).toBe(true);

    const baseConfig = JSON.parse(readFileSync(baseConfigPath, "utf-8"));
    expect(baseConfig.compilerOptions.strict).toBe(true);
    expect(baseConfig.compilerOptions.moduleResolution).toBe("bundler");
  });

  test("TC-0.2.2: packages/contracts exports RFC 9457 standard problem details schema", () => {
    expect(ERROR_CATALOGUE).toBeDefined();
    expect(Object.keys(ERROR_CATALOGUE).length).toBe(17);
    expect(ERROR_CATALOGUE.INSUFFICIENT_CREDITS.status).toBe(402);
    expect(ERROR_CATALOGUE.RATE_LIMIT_EXCEEDED.status).toBe(429);

    const problem = createProblemDetails("INSUFFICIENT_CREDITS", {
      detail: "Action requires 1.0 credits, account has 0.5",
      instance: "/api/v1/ingestions",
    });

    expect(problem.status).toBe(402);
    expect(problem.type).toBe("https://contextual.ai/errors/insufficient-credits");
    expect(problem.title).toBe("Insufficient Credits");
    expect(problem.detail).toContain("requires 1.0 credits");
  });

  test("TC-0.2.3: packages/db exports Kysely database schema interface stubs", () => {
    const schemaPath = join(rootDir, "packages/db/src/schema.ts");
    expect(existsSync(schemaPath)).toBe(true);

    const schemaContent = readFileSync(schemaPath, "utf-8");
    expect(schemaContent).toContain("UsersTable");
    expect(schemaContent).toContain("ThreadsTable");
    expect(schemaContent).toContain("NotebooksTable");
    expect(schemaContent).toContain("Database");
  });

  test("TC-0.2.4: packages/ui exports foundational design token interfaces", () => {
    expect(DESIGN_TOKENS).toBeDefined();
    expect(DESIGN_TOKENS.colors.primary).toBe("#4285F4");
    expect(DESIGN_TOKENS.spacing.md).toBe("16px");
    expect(DESIGN_TOKENS.typography.fontFamilySans).toContain("system-ui");
  });
});
