/**
 * Core Economic Constants & Metering Types
 * Reference: conventions.md §4, FR-014..FR-018, BR-013..BR-017, BR-025..BR-027
 */

export const CREDIT_GRANT_DEFAULT = 10.0;
export const CREDIT_COST_LLM_ACTION = 0.5;
export const CREDIT_COST_DOC_PROCESS = 1.0;
export const RATE_LIMIT_RPS = 5;
export const RATE_LIMIT_WINDOW_MS = 1000;
export const CREDIT_RESET_UTC_HOUR = 8; // 08:00 UTC

export type MeteredAction = "llm_action" | "doc_process" | "query_decomposition" | "custom";

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
  readonly windowMs: number;
  readonly limit: number;
}

export interface DebitResult {
  readonly success: boolean;
  readonly remaining: number;
  readonly debited: number;
  readonly action: string;
  readonly balanceBefore?: number;
}

export interface ResetResult {
  readonly executed: boolean;
  readonly balance: number;
  readonly expiredCredits: number;
  readonly date: string;
}

export interface CreditBalance {
  readonly balance: number;
  readonly dailyGrant: number;
  readonly resetsAt: string;
  readonly resetsInSeconds: number;
}

export interface ConsumerUsageRecord {
  readonly consumerId: string;
  readonly action: MeteredAction;
  readonly costCredits: number;
  readonly timestampMs: number;
  readonly source: string;
}

export interface RateLimitWindow {
  readonly consumerId: string;
  readonly windowStartMs: number;
  readonly requestCount: number;
}

export interface RateLimitExceededEvent {
  readonly consumerId: string;
  readonly action: MeteredAction;
  readonly windowStartMs: number;
  readonly limit: number;
  readonly retryAfterSeconds: number;
}

export function createConsumerUsageRecord(params: {
  consumerId: string;
  action: MeteredAction;
  costCredits: number;
  timestampMs: number;
  source: string;
}): ConsumerUsageRecord {
  return params;
}

export function createRateLimitWindow(params: {
  consumerId: string;
  windowStartMs: number;
  requestCount: number;
}): RateLimitWindow {
  return params;
}

export function createRateLimitExceededEvent(params: {
  consumerId: string;
  action: MeteredAction;
  windowStartMs: number;
  limit: number;
  retryAfterSeconds: number;
}): RateLimitExceededEvent {
  return params;
}
