/**
 * Dynamic AI Provider Training Terms & Data Egress Governance Contracts
 * Grounding: FR-030, BR-028..BR-030, CV-041..CV-044
 */

export type ProviderType = "google-ai-studio" | "groq";

export interface ProviderDisclosurePolicy {
  readonly provider: ProviderType;
  readonly badgeLabel: string;
  readonly noticeTitle: string;
  readonly noticeBody: string;
  readonly policyUrl: string;
  readonly trainingStatus: "training-enabled" | "training-exempt";
}

export const DISCLOSURE_CONFIGS: Record<ProviderType, ProviderDisclosurePolicy> = {
  "google-ai-studio": {
    provider: "google-ai-studio",
    badgeLabel: "Google Gemini Free Tier",
    noticeTitle: "AI Provider Data Training Disclosure",
    noticeBody:
      "Prompts and documents are processed via Google AI Studio free tier. In accordance with Google terms of service, prompt inputs and generated outputs may be reviewed by human reviewers and utilized to train Google AI models.",
    policyUrl: "https://ai.google.dev/terms",
    trainingStatus: "training-enabled",
  },
  groq: {
    provider: "groq",
    badgeLabel: "Groq Llama-3.3 Fallback",
    noticeTitle: "Secondary Inference Provider Notice",
    noticeBody:
      "When the primary provider reaches rate limits, queries fail over transparently to Groq free tier LPUs. Data is processed transiently according to Groq enterprise privacy standards without retention for model training.",
    policyUrl: "https://groq.com/privacy-policy/",
    trainingStatus: "training-exempt",
  },
};

/**
 * Asserts that an input conforms to ProviderDisclosurePolicy
 */
export function assertProviderDisclosurePolicy(
  policy: unknown
): asserts policy is ProviderDisclosurePolicy {
  if (!policy || typeof policy !== "object") {
    throw new Error("ProviderDisclosurePolicy must be an object");
  }
  const p = policy as Record<string, unknown>;
  if (p.provider !== "google-ai-studio" && p.provider !== "groq") {
    throw new Error(`Invalid provider: ${String(p.provider)}`);
  }
  if (typeof p.badgeLabel !== "string" || p.badgeLabel.length === 0) {
    throw new Error("badgeLabel must be a non-empty string");
  }
  if (typeof p.noticeTitle !== "string" || p.noticeTitle.length === 0) {
    throw new Error("noticeTitle must be a non-empty string");
  }
  if (typeof p.noticeBody !== "string" || p.noticeBody.length === 0) {
    throw new Error("noticeBody must be a non-empty string");
  }
  if (typeof p.policyUrl !== "string" || !p.policyUrl.startsWith("https://")) {
    throw new Error("policyUrl must be a valid secure URL");
  }
  if (p.trainingStatus !== "training-enabled" && p.trainingStatus !== "training-exempt") {
    throw new Error(`Invalid trainingStatus: ${String(p.trainingStatus)}`);
  }
}
