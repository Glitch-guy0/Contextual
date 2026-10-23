import { describe, expect, test } from "bun:test";
import { generateRateLimitHeaders, getNextDailyResetTimestamp } from "../src/headers";
import { QuotaClassifier } from "../src/quota-classifier";

describe("Story S2.5: Upstream Provider Quota Classifier & RateLimit Headers", () => {
  test("TC-2.5.1: Classify Gemini 429 RESOURCE_EXHAUSTED into SERVICE_LIMIT_REACHED (BR-028)", () => {
    const googleError = {
      status: 429,
      message: "[GoogleGenerativeAI Error]: [429 Too Many Requests] Resource has been exhausted (check quota).",
    };

    const classified = QuotaClassifier.classify(googleError, {
      instance: "/api/v1/chat",
      correlationId: "req_qc_01",
      creditsRemaining: 4.5,
      nowMs: 1700000000000,
    });

    expect(classified.isQuotaExhausted).toBe(true);
    expect(classified.service).toBe("google-ai-studio");
    expect(classified.problem.type).toBe("https://contextual.ai/errors/service-limit-reached");
    expect(classified.problem.title).toBe("Service Limit Reached");
    expect(classified.problem.status).toBe(402);
    expect(classified.problem.code).toBe("SERVICE_LIMIT_REACHED");
    expect(classified.problem.instance).toBe("/api/v1/chat");
    expect(classified.problem.correlation_id).toBe("req_qc_01");

    // Quota extension verification
    expect(classified.problem.quota).toBeDefined();
    expect(classified.problem.quota?.service).toBe("google-ai-studio");
    expect(classified.problem.quota?.quota_period).toBe("daily");
    expect(classified.problem.quota?.quota_used).toBe(1500);
    expect(classified.problem.quota?.quota_limit).toBe(1500);
    expect(classified.problem.quota?.credits_remaining).toBe(4.5);
    expect(classified.problem.quota?.resets_in_seconds).toBeGreaterThan(0);
  });

  test("TC-2.5.2: Upstream 500 internal server error maps to HTTP 502 and NEVER SERVICE_LIMIT_REACHED", () => {
    const serverError = new Error("Connection reset by peer or upstream 500 error");

    const classified = QuotaClassifier.classify(serverError, {
      instance: "/api/v1/chat",
      correlationId: "req_qc_02",
    });

    expect(classified.isQuotaExhausted).toBe(false);
    expect(classified.problem.status).toBe(502);
    expect(classified.problem.type).toBe("https://contextual.ai/errors/upstream-provider-unavailable");
    expect(classified.problem.title).toBe("Upstream Provider Unavailable");
    expect(classified.problem.code).toBe("UPSTREAM_PROVIDER_UNAVAILABLE");

    // Must NEVER emit SERVICE_LIMIT_REACHED for non-quota errors (BR-028, NFR-025)
    expect(classified.problem.code).not.toBe("SERVICE_LIMIT_REACHED");
    expect(classified.problem.type).not.toContain("service-limit-reached");
  });

  test("TC-2.5.3: Response header injection for RateLimit and contextual credit headers", () => {
    const fixedNow = new Date("2026-10-23T12:00:00Z").getTime();
    const headers = generateRateLimitHeaders({
      limit: 5,
      remaining: 3,
      windowMs: 1000,
      creditBalance: 8.5,
      dailyGrant: 10.0,
      nowMs: fixedNow,
    });

    expect(headers["RateLimit-Limit"]).toBe("5");
    expect(headers["RateLimit-Remaining"]).toBe("3");
    expect(headers["RateLimit-Reset"]).toBe("1");
    expect(headers["RateLimit-Policy"]).toBe("5;w=1");
    expect(headers["X-Credit-Balance"]).toBe("8.5");
    expect(headers["X-Credit-Daily-Grant"]).toBe("10");
    expect(headers["X-Credit-Resets-At"]).toBe("2026-10-24T08:00:00.000Z");
    expect(headers["Retry-After"]).toBeUndefined();

    // When throttled, injects Retry-After
    const throttledHeaders = generateRateLimitHeaders({
      limit: 5,
      remaining: 0,
      retryAfterSeconds: 2,
      windowMs: 1000,
      nowMs: fixedNow,
    });

    expect(throttledHeaders["RateLimit-Remaining"]).toBe("0");
    expect(throttledHeaders["Retry-After"]).toBe("2");
    expect(throttledHeaders["RateLimit-Reset"]).toBe("2");
  });

  test("getNextDailyResetTimestamp correctly computes 08:00 UTC target before and after 08:00", () => {
    // Before 08:00 UTC (e.g. 05:00 UTC)
    const before08 = new Date("2026-10-23T05:00:00Z").getTime();
    const resBefore = getNextDailyResetTimestamp(before08);
    expect(resBefore.isoString).toBe("2026-10-23T08:00:00.000Z");
    expect(resBefore.resetsInSeconds).toBe(3 * 3600);

    // After 08:00 UTC (e.g. 14:00 UTC)
    const after08 = new Date("2026-10-23T14:00:00Z").getTime();
    const resAfter = getNextDailyResetTimestamp(after08);
    expect(resAfter.isoString).toBe("2026-10-24T08:00:00.000Z");
    expect(resAfter.resetsInSeconds).toBe(18 * 3600);
  });
});
