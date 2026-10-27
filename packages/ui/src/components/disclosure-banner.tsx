import {
  DISCLOSURE_CONFIGS,
  type ProviderType,
  type ProviderDisclosurePolicy,
} from "@repo/contracts";

export interface DisclosureBannerProps {
  /**
   * The AI inference provider whose terms and data policies are being disclosed.
   * Defaults to "google-ai-studio".
   */
  readonly provider?: ProviderType;
  /**
   * Optional custom disclosure policy override.
   */
  readonly customPolicy?: ProviderDisclosurePolicy;
  readonly className?: string;
  readonly id?: string;
  // NOTE (BR-030 Invariant): No onDismiss, dismissible, or close handlers permitted.
}

/**
 * AI Provider Data Training Disclosure Banner
 *
 * Implements FR-030, CV-041, and BR-030.
 * In accordance with Google terms of service and statutory transparency requirements,
 * this component MUST remain permanently mounted and cannot be dismissed by users.
 */
export function DisclosureBanner({
  provider = "google-ai-studio",
  customPolicy,
  className,
  id = "ai-training-disclosure-banner",
}: DisclosureBannerProps) {
  const policy = customPolicy ?? DISCLOSURE_CONFIGS[provider] ?? DISCLOSURE_CONFIGS["google-ai-studio"];

  return (
    <section
      id={id}
      className={`disclosure-banner ${className ? className : ""}`.trim()}
      role="region"
      aria-label="AI Provider Privacy Disclosure"
      data-provider={policy.provider}
      data-training-status={policy.trainingStatus}
    >
      <div className="disclosure-banner-header">
        <span className="disclosure-badge" aria-hidden="true">
          {policy.badgeLabel}
        </span>
        <h2 className="disclosure-title">{policy.noticeTitle}</h2>
      </div>
      <p className="disclosure-body">{policy.noticeBody}</p>
      <div className="disclosure-footer">
        <span>Review full terms at</span>
        <a
          href={policy.policyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="disclosure-link"
          aria-label={`${policy.badgeLabel} Terms of Service (opens in a new tab)`}
        >
          {policy.policyUrl}
          <span aria-hidden="true"> ↗</span>
        </a>
      </div>
    </section>
  );
}

/**
 * Semantic HTML string renderer for server-side generation, static site export,
 * and automated accessibility testing under headless runners.
 */
export function renderDisclosureBanner({
  provider = "google-ai-studio",
  customPolicy,
  className,
  id = "ai-training-disclosure-banner",
}: DisclosureBannerProps = {}): string {
  const policy = customPolicy ?? DISCLOSURE_CONFIGS[provider] ?? DISCLOSURE_CONFIGS["google-ai-studio"];
  const classes = `disclosure-banner ${className ? className : ""}`.trim();

  return `<section id="${id}" class="${classes}" role="region" aria-label="AI Provider Privacy Disclosure" data-provider="${policy.provider}" data-training-status="${policy.trainingStatus}">
  <div class="disclosure-banner-header">
    <span class="disclosure-badge" aria-hidden="true">${policy.badgeLabel}</span>
    <h2 class="disclosure-title">${policy.noticeTitle}</h2>
  </div>
  <p class="disclosure-body">${policy.noticeBody}</p>
  <div class="disclosure-footer">
    <span>Review full terms at</span>
    <a href="${policy.policyUrl}" target="_blank" rel="noopener noreferrer" class="disclosure-link" aria-label="${policy.badgeLabel} Terms of Service (opens in a new tab)">
      ${policy.policyUrl}<span aria-hidden="true"> ↗</span>
    </a>
  </div>
</section>`;
}
