import { describe, expect, test, afterAll } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createAppServer } from "../../apps/platform/src/server";

describe("Milestone GA: Local Docker Compose & Application Runtime Setup", () => {
  const rootDir = resolve(import.meta.dir, "../..");
  let activeServer: ReturnType<typeof createAppServer> | null = null;

  afterAll(() => {
    if (activeServer) {
      activeServer.stop();
    }
  });

  test("TC-GA.7.1: infra/compose.local.yaml defines postgres, redis, and application services with healthchecks", () => {
    const composePath = resolve(rootDir, "infra/compose.local.yaml");
    expect(existsSync(composePath)).toBe(true);

    const content = readFileSync(composePath, "utf-8");
    // Verify services exist
    expect(content).toContain("postgres:");
    expect(content).toContain("redis:");
    expect(content).toContain("app:");

    // Verify container names
    expect(content).toContain("container_name: contextual-postgres");
    expect(content).toContain("container_name: contextual-redis");
    expect(content).toContain("container_name: contextual-app");

    // Verify port mappings
    expect(content).toContain('"5432:5432"');
    expect(content).toContain('"6379:6379"');
    expect(content).toContain('"3000:3000"');

    // Verify app depends on healthy infrastructure
    expect(content).toContain("depends_on:");
    expect(content).toContain("service_healthy");
  });

  test("TC-GA.7.2: infra/compoe.local.yaml alias exists and contains valid app container definition", () => {
    const aliasPath = resolve(rootDir, "infra/compoe.local.yaml");
    expect(existsSync(aliasPath)).toBe(true);

    const content = readFileSync(aliasPath, "utf-8");
    expect(content).toContain("contextual-app");
    expect(content).toContain("3000:3000");
  });

  test("TC-GA.7.3: infra/Dockerfile.local specifies runner container on Bun with healthcheck", () => {
    const dockerfilePath = resolve(rootDir, "infra/Dockerfile.local");
    expect(existsSync(dockerfilePath)).toBe(true);

    const content = readFileSync(dockerfilePath, "utf-8");
    expect(content).toContain("oven/bun");
    expect(content).toContain("EXPOSE 3000");
    expect(content).toContain("HEALTHCHECK");
    expect(content).toContain("apps/platform/src/server.ts");
  });

  test("TC-GA.7.4: createAppServer boots and serves landing page with mandatory dynamic AI disclosure banner (BR-030)", async () => {
    activeServer = createAppServer({ port: 3042, hostname: "127.0.0.1" });
    expect(activeServer.port).toBe(3042);

    const res = await fetch(`http://127.0.0.1:${activeServer.port}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");

    const html = await res.text();
    // Verify title and heading
    expect(html).toContain("Contextual AI Platform");
    expect(html).toContain("Multi-Modal Grounded Reasoning");

    // Verify mandatory un-dismissible disclosure banner (BR-030, FR-030)
    expect(html).toContain('id="disclosure-banner"');
    expect(html).toContain("Privacy Notice");
    expect(html).toContain("Google AI Studio");
    expect(html).toContain("Zero proprietary data retained");
    expect(html).not.toContain("dismiss-btn");
  });

  test("TC-GA.7.5: createAppServer exposes /api/v1/health and /api/v1/credits/balance endpoints", async () => {
    if (!activeServer) {
      activeServer = createAppServer({ port: 3043, hostname: "127.0.0.1" });
    }

    // Health probe
    const healthRes = await fetch(`http://127.0.0.1:${activeServer.port}/api/v1/health`);
    expect(healthRes.status).toBe(200);
    const healthBody = (await healthRes.json()) as Record<string, unknown>;
    expect(healthBody.status).toBe("healthy");
    expect(healthBody.version).toBe("1.0.0");
    expect(healthBody.database).toBe("connected");
    expect(healthBody.redis).toBe("connected");

    // Credit quota probe
    const creditsRes = await fetch(`http://127.0.0.1:${activeServer.port}/api/v1/credits/balance`);
    expect(creditsRes.status).toBe(200);
    expect(creditsRes.headers.get("x-credit-balance")).toBe("10.0");
    expect(creditsRes.headers.get("ratelimit-limit")).toBe("5");
    const creditsBody = (await creditsRes.json()) as Record<string, unknown>;
    expect(creditsBody.credits).toBe(10);
    expect(creditsBody.dailyQuota).toBe(10);

    // Reasoning query probe
    const reasoningRes = await fetch(`http://127.0.0.1:${activeServer.port}/api/v1/reasoning/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "How does vector retrieval work?" }),
    });
    expect(reasoningRes.status).toBe(200);
    const reasoningBody = (await reasoningRes.json()) as Record<string, unknown>;
    expect(reasoningBody.answer).toContain("How does vector retrieval work?");
    expect(Array.isArray(reasoningBody.citations)).toBe(true);

    // 404 RFC 9457 Problem Details
    const notFoundRes = await fetch(`http://127.0.0.1:${activeServer.port}/unknown-route`);
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.headers.get("content-type")).toContain("application/problem+json");
  });
});
