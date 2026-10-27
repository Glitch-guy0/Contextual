import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("Milestone GA: Story SGA.4 — Curated Production Release Changelog & Migration Guide", () => {
  const changelogPath = join(process.cwd(), "CHANGELOG.md");

  it("TC-GA.4.1: Root CHANGELOG.md exists and is non-empty", () => {
    expect(existsSync(changelogPath)).toBe(true);
    const content = readFileSync(changelogPath, "utf-8");
    expect(content.length).toBeGreaterThan(1000);
  });

  it("TC-GA.4.2: CHANGELOG.md complies with Keep a Changelog standard format", () => {
    const content = readFileSync(changelogPath, "utf-8");
    expect(content).toContain("# Changelog");
    expect(content).toContain("Keep a Changelog");
    expect(content).toContain("Semantic Versioning");
  });

  it("TC-GA.4.3: CHANGELOG.md documents all 10 platform milestones from M0 through GA in SemVer order", () => {
    const content = readFileSync(changelogPath, "utf-8");
    const expectedMilestones = [
      "## [1.0.0] - 2026-10-27",
      "## [0.9.0-rc.1] - 2026-10-27",
      "## [0.8.0] - 2026-10-27",
      "## [0.7.0] - 2026-10-27",
      "## [0.6.0] - 2026-10-27",
      "## [0.5.0] - 2026-10-27",
      "## [0.4.0] - 2026-10-27",
      "## [0.3.0] - 2026-10-26",
      "## [0.2.0] - 2026-10-26",
      "## [0.1.0] - 2026-10-26",
      "## [0.1.0-alpha.1] - 2026-10-23",
    ];

    let lastIdx = -1;
    for (const milestoneHeader of expectedMilestones) {
      const idx = content.indexOf(milestoneHeader);
      expect(idx).toBeGreaterThan(-1);
      if (lastIdx !== -1) {
        expect(idx).toBeGreaterThan(lastIdx); // Asserts reverse chronological SemVer ordering
      }
      lastIdx = idx;
    }
  });

  it("TC-GA.4.4: CHANGELOG.md includes comprehensive v1.0.0 Migration Guide", () => {
    const content = readFileSync(changelogPath, "utf-8");
    expect(content).toContain("## Migration Guide — Upgrading to v1.0.0");
    expect(content).toContain("Environment Configuration Prerequisites");
    expect(content).toContain("Clerk Authentication");
    expect(content).toContain("Neon Postgres");
    expect(content).toContain("Upstash Redis & Vector");
    expect(content).toContain("Local Stack Execution");
    expect(content).toContain("RFC 9457 Error Handling Contract");
  });

  it("TC-GA.4.5: CHANGELOG.md contains zero placeholder TODOs or unresolved markers", () => {
    const content = readFileSync(changelogPath, "utf-8");
    expect(content).not.toContain("TODO");
    expect(content).not.toContain("TBD");
    expect(content).not.toContain("FIXME");
  });
});
