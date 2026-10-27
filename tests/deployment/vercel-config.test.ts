import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

describe("Milestone GA: Story SGA.2 — Vercel Production Deployment Configuration", () => {
  const vercelConfigPath = join(process.cwd(), "vercel.json");

  it("TC-GA.2.1: vercel.json exists at repository root", () => {
    expect(existsSync(vercelConfigPath)).toBe(true);
  });

  it("TC-GA.2.2: vercel.json parses cleanly as valid JSON", () => {
    const raw = readFileSync(vercelConfigPath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed).toBeTypeOf("object");
    expect(parsed.framework).toBe("nextjs");
    expect(parsed.cleanUrls).toBe(true);
  });

  it("TC-GA.2.3: vercel.json pins serverless runtime to iad1 region co-located with Neon and Upstash", () => {
    const raw = readFileSync(vercelConfigPath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(parsed.regions).toEqual(["iad1"]);
  });

  it("TC-GA.2.4: vercel.json enforces comprehensive HTTP response security headers", () => {
    const raw = readFileSync(vercelConfigPath, "utf-8");
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed.headers)).toBe(true);

    const rootRule = parsed.headers.find((h: { source: string }) => h.source === "/(.*)");
    expect(rootRule).toBeDefined();

    const headersMap = new Map<string, string>(
      rootRule.headers.map((item: { key: string; value: string }) => [item.key, item.value])
    );

    expect(headersMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headersMap.get("X-Frame-Options")).toBe("DENY");
    expect(headersMap.get("X-XSS-Protection")).toBe("1; mode=block");
    expect(headersMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headersMap.get("Permissions-Policy")).toContain("camera=()");
  });

  it("TC-GA.2.5: vercel.json disables caching on all API routes to protect dynamic data", () => {
    const raw = readFileSync(vercelConfigPath, "utf-8");
    const parsed = JSON.parse(raw);

    const apiRule = parsed.headers.find((h: { source: string }) => h.source === "/api/(.*)");
    expect(apiRule).toBeDefined();

    const cacheHeader = apiRule.headers.find((h: { key: string }) => h.key === "Cache-Control");
    expect(cacheHeader).toBeDefined();
    expect(cacheHeader.value).toBe("no-store, max-age=0");
  });

  it("TC-GA.2.6: vercel.json enforces zero-cost free-tier ceiling with zero billing add-ons (NFR-016)", () => {
    const raw = readFileSync(vercelConfigPath, "utf-8");
    const parsed = JSON.parse(raw);

    // Assert absence of paid add-on keys
    expect(parsed.crons).toBeUndefined(); // Crons managed via free Upstash QStash, not paid Vercel Crons
    expect(parsed.functions).toBeUndefined(); // Standard serverless sizing without paid memory escalations
    expect(raw).not.toContain("password");
    expect(raw).not.toContain("secret");
  });
});
