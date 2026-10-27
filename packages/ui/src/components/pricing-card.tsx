export interface PricingActionCost {
  readonly action: string;
  readonly unitCost: string;
  readonly dailyAllowance: string;
}

export interface PricingCardProps {
  readonly tierName?: string;
  readonly priceDisplay?: string;
  readonly cadence?: string;
  readonly dailyCredits?: number;
  readonly resetTimeUtc?: string;
  readonly actionCosts?: readonly PricingActionCost[];
  readonly ctaText?: string;
  readonly ctaUrl?: string;
  readonly className?: string;
  readonly id?: string;
}

export const DEFAULT_ACTION_COSTS: readonly PricingActionCost[] = [
  {
    action: "Grounded Reasoning Query (Gemini / Groq)",
    unitCost: "0.5 credits",
    dailyAllowance: "Up to 20 queries / day",
  },
  {
    action: "Document / Transcript Ingestion (PDF / YouTube / Web)",
    unitCost: "1.0 credit",
    dailyAllowance: "Up to 10 documents / day",
  },
];

/**
 * Zero-Cost Pricing Transparency & Daily Quota Breakdown Component
 *
 * Implements FR-022, BR-025, BR-026, and NFR-019.
 * Strictly free with zero payment inputs, detailing the 10 daily credit allowance.
 */
export function PricingCard({
  tierName = "Free Community Tier",
  priceDisplay = "$0.00",
  cadence = "/ forever",
  dailyCredits = 10,
  resetTimeUtc = "08:00 UTC",
  actionCosts = DEFAULT_ACTION_COSTS,
  ctaText = "Get Started Free",
  ctaUrl = "/sign-in",
  className,
  id = "pricing",
}: PricingCardProps = {}) {
  return (
    <section id={id} className={`pricing-section ${className ? className : ""}`.trim()} aria-labelledby="pricing-heading">
      <div className="section-header">
        <div className="section-tag">Zero-Cost Infrastructure</div>
        <h2 id="pricing-heading" className="section-title">
          Transparent, Predictable Usage
        </h2>
        <p className="section-subtitle">
          No credit card required. No surprise overages. Just honest daily allowances on edge infrastructure.
        </p>
      </div>

      <div className="pricing-card" role="region" aria-label="Pricing Details">
        <div className="pricing-badge-row">
          <span className="pricing-plan-badge">{tierName}</span>
          <span className="pricing-zero-cost-pill">
            <span aria-hidden="true">✓</span> Guaranteed $0.00 forever
          </span>
        </div>

        <div className="pricing-price-container">
          <span className="pricing-amount">{priceDisplay}</span>
          <span className="pricing-cadence">{cadence}</span>
        </div>

        <p className="pricing-summary">
          Every registered user receives an immutable grant of <strong>{dailyCredits} credits daily</strong> at{" "}
          <strong>{resetTimeUtc}</strong>. Experience full multi-modal ingestion and grounded reasoning without entering billing details.
        </p>

        <div className="pricing-allowance-box">
          <table className="pricing-allowance-table" aria-label="Daily Quota Consumption Table">
            <thead>
              <tr>
                <th scope="col">Platform Operation</th>
                <th scope="col">Unit Cost</th>
                <th scope="col">Daily Capacity</th>
              </tr>
            </thead>
            <tbody>
              {actionCosts.map((item) => (
                <tr key={item.action}>
                  <td>{item.action}</td>
                  <td>
                    <strong>{item.unitCost}</strong>
                  </td>
                  <td>{item.dailyAllowance}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pricing-rule-callout" role="note">
            <strong>Quota Policy Notice:</strong> Under platform rule <strong>BR-025</strong>, daily grants execute
            idempotently at {resetTimeUtc}. Under rule <strong>BR-026</strong>, unspent credits expire at reset time
            (zero roll-over carryover) to guarantee zero-cost operational sustainability.
          </div>
        </div>

        <div className="pricing-cta-row">
          <div className="pricing-no-card-notice">
            <span aria-hidden="true">🔒</span>
            <span>No credit card or payment authorization required</span>
          </div>
          <a href={ctaUrl} className="btn-hero-primary" aria-label={`${ctaText} with Clerk OAuth`}>
            {ctaText}
            <span aria-hidden="true"> →</span>
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * Semantic HTML string renderer for server-side generation, static site export,
 * and automated headless runner testing.
 */
export function renderPricingCard({
  tierName = "Free Community Tier",
  priceDisplay = "$0.00",
  cadence = "/ forever",
  dailyCredits = 10,
  resetTimeUtc = "08:00 UTC",
  actionCosts = DEFAULT_ACTION_COSTS,
  ctaText = "Get Started Free",
  ctaUrl = "/sign-in",
  className,
  id = "pricing",
}: PricingCardProps = {}): string {
  const classes = `pricing-section ${className ? className : ""}`.trim();
  const rowsHtml = actionCosts
    .map(
      (item) => `<tr>
      <td>${item.action}</td>
      <td><strong>${item.unitCost}</strong></td>
      <td>${item.dailyAllowance}</td>
    </tr>`
    )
    .join("\n            ");

  return `<section id="${id}" class="${classes}" aria-labelledby="pricing-heading">
  <div class="section-header">
    <div class="section-tag">Zero-Cost Infrastructure</div>
    <h2 id="pricing-heading" class="section-title">Transparent, Predictable Usage</h2>
    <p class="section-subtitle">No credit card required. No surprise overages. Just honest daily allowances on edge infrastructure.</p>
  </div>
  <div class="pricing-card" role="region" aria-label="Pricing Details">
    <div className="pricing-badge-row">
      <span class="pricing-plan-badge">${tierName}</span>
      <span class="pricing-zero-cost-pill"><span aria-hidden="true">✓</span> Guaranteed $0.00 forever</span>
    </div>
    <div class="pricing-price-container">
      <span class="pricing-amount">${priceDisplay}</span>
      <span class="pricing-cadence">${cadence}</span>
    </div>
    <p class="pricing-summary">Every registered user receives an immutable grant of <strong>${dailyCredits} credits daily</strong> at <strong>${resetTimeUtc}</strong>. Experience full multi-modal ingestion and grounded reasoning without entering billing details.</p>
    <div class="pricing-allowance-box">
      <table class="pricing-allowance-table" aria-label="Daily Quota Consumption Table">
        <thead>
          <tr>
            <th scope="col">Platform Operation</th>
            <th scope="col">Unit Cost</th>
            <th scope="col">Daily Capacity</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="pricing-rule-callout" role="note">
        <strong>Quota Policy Notice:</strong> Under platform rule <strong>BR-025</strong>, daily grants execute idempotently at ${resetTimeUtc}. Under rule <strong>BR-026</strong>, unspent credits expire at reset time (zero roll-over carryover) to guarantee zero-cost operational sustainability.
      </div>
    </div>
    <div class="pricing-cta-row">
      <div class="pricing-no-card-notice">
        <span aria-hidden="true">🔒</span>
        <span>No credit card or payment authorization required</span>
      </div>
      <a href="${ctaUrl}" class="btn-hero-primary" aria-label="${ctaText} with Clerk OAuth">${ctaText}<span aria-hidden="true"> →</span></a>
    </div>
  </div>
</section>`;
}
