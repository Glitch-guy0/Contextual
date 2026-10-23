import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("Milestone M0: Turborepo Monorepo Layout & Toolchain", () => {
  const rootDir = process.cwd();

  test("TC-0.1.1: Root package.json defines workspaces ['apps/*', 'packages/*'] and private: true", () => {
    const pkgPath = join(rootDir, "package.json");
    expect(existsSync(pkgPath)).toBe(true);

    const pkgContent = JSON.parse(readFileSync(pkgPath, "utf-8"));
    expect(pkgContent.private).toBe(true);
    expect(Array.isArray(pkgContent.workspaces)).toBe(true);
    expect(pkgContent.workspaces).toContain("apps/*");
    expect(pkgContent.workspaces).toContain("packages/*");
  });

  test("TC-0.1.2: turbo.json specifies build, typecheck, lint, and clean task pipelines", () => {
    const turboPath = join(rootDir, "turbo.json");
    expect(existsSync(turboPath)).toBe(true);

    const turboContent = JSON.parse(readFileSync(turboPath, "utf-8"));
    const tasks = turboContent.tasks || turboContent.pipeline;
    expect(tasks).toBeDefined();
    expect(tasks.build).toBeDefined();
    expect(tasks.typecheck).toBeDefined();
    expect(tasks.lint).toBeDefined();
    expect(tasks.clean).toBeDefined();

    expect(tasks.build.dependsOn).toContain("^build");
    expect(tasks.clean.cache).toBe(false);
  });

  test("TC-0.1.3: bunfig.toml configures Bun package manager lockfile behavior", () => {
    const bunfigPath = join(rootDir, "bunfig.toml");
    expect(existsSync(bunfigPath)).toBe(true);

    const bunfigContent = readFileSync(bunfigPath, "utf-8");
    expect(bunfigContent).toContain("[install]");
    expect(bunfigContent).toContain("lockfile = true");
  });
});
