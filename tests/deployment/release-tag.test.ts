import { describe, expect, it } from "bun:test";
import {
  verifyReleaseInvariants,
  formatReleaseTagMessage,
  cutReleaseTag,
  type ReleaseTagInvariantCheck,
  type ReleaseTagResult,
} from "../../scripts/cut-release-tag.ts";

describe("Milestone GA: Story SGA.5 — Annotated Git Release Tagging Automation & Checkpoint 5 Governance", () => {
  it("TC-GA.5.1: verifyReleaseInvariants evaluates all 5 mandatory pre-flight invariant checks", () => {
    const checks: ReleaseTagInvariantCheck[] = verifyReleaseInvariants({ skipCommandExec: true });
    expect(checks.length).toBe(5);

    const checkIds = checks.map((c) => c.id);
    expect(checkIds).toContain("INV-1"); // Tests
    expect(checkIds).toContain("INV-2"); // Typecheck
    expect(checkIds).toContain("INV-3"); // Build
    expect(checkIds).toContain("INV-4"); // Working tree
    expect(checkIds).toContain("INV-5"); // PM Approval
  });

  it("TC-GA.5.2: Invariant check INV-5 confirms presence of unconditional PM approval", () => {
    const checks = verifyReleaseInvariants({ skipCommandExec: true });
    const inv5 = checks.find((c) => c.id === "INV-5");
    expect(inv5).toBeDefined();
    expect(inv5?.status).toBe("PASS");
    expect(inv5?.evidence).toContain("Unconditional approval verified");
  });

  it("TC-GA.5.3: formatReleaseTagMessage generates compliant annotated release message", () => {
    const message = formatReleaseTagMessage("v1.0.0", "abcdef1234567890");
    expect(message).toContain("Contextual AI Platform General Availability Release (v1.0.0)");
    expect(message).toContain("Commit SHA: abcdef1234567890");
    expect(message).toContain("pm-agent (Stage 2 Owner");
    expect(message).toContain("deployment-agent (Stage 5 Owner");
    expect(message).toContain("M0: Workspace Foundation & Monorepo Scaffolding");
    expect(message).toContain("GA: General Availability Production Release");
    expect(message).toContain("Zero-Dollar Cost Ceiling: $0.00/month");
    expect(message).toContain("Quality Gates: G1 through G6 certified complete");
  });

  it("TC-GA.5.4: cutReleaseTag in dry-run mode succeeds with valid release payload and zero git side effects", () => {
    const result: ReleaseTagResult = cutReleaseTag({
      tagVersion: "v1.0.0",
      dryRun: true,
      skipCommandExec: true,
    });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.tag).toBe("v1.0.0");
    expect(result.message).toContain("v1.0.0");
    expect(result.checks.length).toBe(5);
  });

  it("TC-GA.5.5: cutReleaseTag aborts execution when an invariant check fails", () => {
    // Pass custom directory where pm-approval does not exist
    const result: ReleaseTagResult = cutReleaseTag({
      tagVersion: "v1.0.0",
      dryRun: true,
      skipCommandExec: true,
      cwd: "/tmp",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Pre-release invariant checks failed");
    const failedCheck = result.checks.find((c) => c.status === "FAIL");
    expect(failedCheck).toBeDefined();
  });
});
