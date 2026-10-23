import {
  serializeProblemDetails,
  type ProblemDocument,
  type QuotaExtension,
  type QuotaService,
} from "@repo/contracts/errors";
import { getNextDailyResetTimestamp } from "./headers";

export interface QuotaClassificationContext {
  instance: string;
  correlationId?: string;
  creditsRemaining?: number;
  nowMs?: number;
}

export interface ClassifiedError {
  isQuotaExhausted: boolean;
  service?: QuotaService;
  problem: ProblemDocument;
}

/**
 * Inspects upstream provider error shapes (Google AI Studio, Groq, Upstash)
 * and determines whether the root cause is a provider quota exhaustion.
 */
export function isGoogleQuotaError(error: unknown): boolean {
  if (!error) return false;
  const err = error as Record<string, unknown>;
  const msg = String(err.message || "").toLowerCase();
  const status = Number(err.status || err.code || err.statusCode || 0);

  if (status === 429) return true;
  if (msg.includes("resource_exhausted")) return true;
  if (msg.includes("quota exceeded") || msg.includes("rate limit") || msg.includes("check quota")) {
    return true;
  }
  return false;
}

export function isGroqQuotaError(error: unknown): boolean {
  if (!error) return false;
  const err = error as Record<string, unknown>;
  const msg = String(err.message || "").toLowerCase();
  const status = Number(err.status || err.code || err.statusCode || 0);

  if (status === 429) return true;
  if (msg.includes("rate_limit_exceeded") || msg.includes("tokens per minute") || msg.includes("requests per day")) {
    return true;
  }
  return false;
}

export function isUpstashQuotaError(error: unknown): boolean {
  if (!error) return false;
  const err = error as Record<string, unknown>;
  const msg = String(err.message || "").toLowerCase();
  const status = Number(err.status || err.code || err.statusCode || 0);

  if (status === 429) return true;
  if (msg.includes("daily request limit exceeded") || msg.includes("max requests limit reached")) {
    return true;
  }
  return false;
}

export class QuotaClassifier {
  /**
   * Classifies an upstream error into a typed RFC 9457 Problem Details document.
   *
   * Invariant (BR-028, TC-2.5.2):
   * SERVICE_LIMIT_REACHED is strictly emitted ONLY for genuine provider quota limits (429/exhaustion).
   * Generic 5xx or network errors are classified as UPSTREAM_PROVIDER_UNAVAILABLE (502).
   */
  static classify(error: unknown, context: QuotaClassificationContext): ClassifiedError {
    const { instance, correlationId, creditsRemaining = 0, nowMs = Date.now() } = context;

    // 1. Google AI Studio Quota Check
    if (isGoogleQuotaError(error)) {
      const { resetsInSeconds } = getNextDailyResetTimestamp(nowMs);
      const quota: QuotaExtension = {
        service: "google-ai-studio",
        quota_period: "daily",
        quota_used: 1500,
        quota_limit: 1500,
        resets_in_seconds: resetsInSeconds,
        credits_remaining: creditsRemaining,
      };

      const problem = serializeProblemDetails("SERVICE_LIMIT_REACHED", {
        detail: "Google AI Studio daily quota exhausted (1,500 requests/day). Resets at 08:00 UTC.",
        instance,
        correlation_id: correlationId,
        quota,
        customExtensions: {
          service: quota.service,
          quota_period: quota.quota_period,
          quota_used: quota.quota_used,
          quota_limit: quota.quota_limit,
          resets_in_seconds: quota.resets_in_seconds,
          credits_remaining: quota.credits_remaining,
        },
      });

      return {
        isQuotaExhausted: true,
        service: "google-ai-studio",
        problem,
      };
    }

    // 2. Groq Quota Check
    if (isGroqQuotaError(error)) {
      const quota: QuotaExtension = {
        service: "groq",
        quota_period: "daily",
        quota_used: 14400,
        quota_limit: 14400,
        resets_in_seconds: 60,
        credits_remaining: creditsRemaining,
      };

      const problem = serializeProblemDetails("SERVICE_LIMIT_REACHED", {
        detail: "Groq inference service quota or rate limit exceeded.",
        instance,
        correlation_id: correlationId,
        quota,
        customExtensions: {
          service: quota.service,
          quota_period: quota.quota_period,
          quota_used: quota.quota_used,
          quota_limit: quota.quota_limit,
          resets_in_seconds: quota.resets_in_seconds,
          credits_remaining: quota.credits_remaining,
        },
      });

      return {
        isQuotaExhausted: true,
        service: "groq",
        problem,
      };
    }

    // 3. Upstash Quota Check
    if (isUpstashQuotaError(error)) {
      const { resetsInSeconds } = getNextDailyResetTimestamp(nowMs);
      const quota: QuotaExtension = {
        service: "upstash-redis",
        quota_period: "daily",
        quota_used: 10000,
        quota_limit: 10000,
        resets_in_seconds: resetsInSeconds,
        credits_remaining: creditsRemaining,
      };

      const problem = serializeProblemDetails("SERVICE_LIMIT_REACHED", {
        detail: "Upstash Redis free tier daily command allowance reached.",
        instance,
        correlation_id: correlationId,
        quota,
        customExtensions: {
          service: quota.service,
          quota_period: quota.quota_period,
          quota_used: quota.quota_used,
          quota_limit: quota.quota_limit,
          resets_in_seconds: quota.resets_in_seconds,
          credits_remaining: quota.credits_remaining,
        },
      });

      return {
        isQuotaExhausted: true,
        service: "upstash-redis",
        problem,
      };
    }

    // 4. Upstream Server / Network Error (500, 502, 503, connection drops)
    const rawMessage = error instanceof Error ? error.message : String(error);
    const problem = serializeProblemDetails("UPSTREAM_PROVIDER_UNAVAILABLE", {
      detail: `Upstream AI provider encountered an unexpected failure: ${rawMessage}`,
      instance,
      correlation_id: correlationId,
    });

    return {
      isQuotaExhausted: false,
      problem,
    };
  }
}
