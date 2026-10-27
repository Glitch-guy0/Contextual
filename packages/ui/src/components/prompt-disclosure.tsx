import {
  DISCLOSURE_CONFIGS,
  type ProviderType,
  type ProviderDisclosurePolicy,
} from "@repo/contracts";

export interface PromptDisclosureNoticeProps {
  /**
   * The AI inference provider whose policy applies to this prompt input.
   * Defaults to "google-ai-studio".
   */
  readonly provider?: ProviderType;
  readonly customPolicy?: ProviderDisclosurePolicy;
  readonly className?: string;
  readonly id?: string;
  // NOTE (BR-030 Invariant): No onDismiss or dismiss handles permitted.
}

/**
 * Compact AI Provider Disclosure Notice anchored above prompt textarea inputs.
 * Implements FR-030, CV-041, and BR-030.
 */
export function PromptDisclosureNotice({
  provider = "google-ai-studio",
  customPolicy,
  className,
  id = "prompt-disclosure-notice",
}: PromptDisclosureNoticeProps) {
  const policy = customPolicy ?? DISCLOSURE_CONFIGS[provider] ?? DISCLOSURE_CONFIGS["google-ai-studio"];

  return (
    <div
      id={id}
      className={`prompt-disclosure-notice ${className ? className : ""}`.trim()}
      role="note"
      aria-label="Prompt Privacy Notice"
      data-provider={policy.provider}
    >
      <div className="prompt-disclosure-left">
        <span className="prompt-disclosure-badge" aria-hidden="true">
          {policy.trainingStatus === "training-enabled" ? "AI Training Notice" : "Privacy Notice"}
        </span>
        <span className="prompt-disclosure-text">
          {policy.provider === "google-ai-studio"
            ? "Free tier: prompts and outputs may be used to train Google AI models."
            : "Fallback tier: data processed transiently without retention for training."}
        </span>
      </div>
      <a
        href={policy.policyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="prompt-disclosure-link"
        aria-label={`${policy.badgeLabel} terms and privacy policy (opens in a new tab)`}
      >
        Terms ↗
      </a>
    </div>
  );
}

/**
 * Semantic HTML string renderer for server-side generation, static site export,
 * and automated testing under headless runners.
 */
export function renderPromptDisclosureNotice({
  provider = "google-ai-studio",
  customPolicy,
  className,
  id = "prompt-disclosure-notice",
}: PromptDisclosureNoticeProps = {}): string {
  const policy = customPolicy ?? DISCLOSURE_CONFIGS[provider] ?? DISCLOSURE_CONFIGS["google-ai-studio"];
  const classes = `prompt-disclosure-notice ${className ? className : ""}`.trim();
  const badge = policy.trainingStatus === "training-enabled" ? "AI Training Notice" : "Privacy Notice";
  const text =
    policy.provider === "google-ai-studio"
      ? "Free tier: prompts and outputs may be used to train Google AI models."
      : "Fallback tier: data processed transiently without retention for training.";

  return `<div id="${id}" class="${classes}" role="note" aria-label="Prompt Privacy Notice" data-provider="${policy.provider}">
  <div class="prompt-disclosure-left">
    <span class="prompt-disclosure-badge" aria-hidden="true">${badge}</span>
    <span class="prompt-disclosure-text">${text}</span>
  </div>
  <a href="${policy.policyUrl}" target="_blank" rel="noopener noreferrer" class="prompt-disclosure-link" aria-label="${policy.badgeLabel} terms and privacy policy (opens in a new tab)">Terms ↗</a>
</div>`;
}
