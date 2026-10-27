export interface LandingHeroProps {
  readonly title?: string;
  readonly subtitle?: string;
  readonly primaryCtaText?: string;
  readonly primaryCtaUrl?: string;
  readonly secondaryCtaText?: string;
  readonly secondaryCtaUrl?: string;
  readonly trustPillText?: string;
  readonly className?: string;
  readonly id?: string;
}

export const DEFAULT_HERO_TITLE =
  "Multi-Modal Contextual Reasoning Powered by Grounded Citations";

export const DEFAULT_HERO_SUBTITLE =
  "Turn multi-page PDFs, YouTube transcripts, and web sources into actionable knowledge graphs with zero hallucination risk and transparent $0.00 infrastructure.";

export const DEFAULT_TRUST_PILL =
  "10 Daily Free Credits · No Credit Card Required · Zero Egress Fees";

/**
 * Public Marketing Landing Hero Component
 *
 * Implements FR-022, BR-024, and NFR-019.
 * Delivers grounded value proposition and dual CTAs with zero layout shift.
 */
export function LandingHero({
  title = DEFAULT_HERO_TITLE,
  subtitle = DEFAULT_HERO_SUBTITLE,
  primaryCtaText = "Get Started Free",
  primaryCtaUrl = "/sign-in",
  secondaryCtaText = "Explore Architecture",
  secondaryCtaUrl = "#features",
  trustPillText = DEFAULT_TRUST_PILL,
  className,
  id = "landing-hero-section",
}: LandingHeroProps = {}) {
  return (
    <section id={id} className={`landing-hero ${className ? className : ""}`.trim()} aria-labelledby="hero-heading">
      <div className="hero-pill" role="status" aria-label="Tier Benefits">
        <span aria-hidden="true">✦</span>
        <span>{trustPillText}</span>
      </div>

      <h1 id="hero-heading" className="hero-title">
        {title}
      </h1>

      <p className="hero-subtitle">{subtitle}</p>

      <div className="hero-actions">
        <a href={primaryCtaUrl} className="btn-hero-primary" aria-label={`${primaryCtaText} with Clerk OAuth`}>
          {primaryCtaText}
          <span aria-hidden="true"> →</span>
        </a>
        <a href={secondaryCtaUrl} className="btn-hero-secondary" aria-label={secondaryCtaText}>
          {secondaryCtaText}
        </a>
      </div>
    </section>
  );
}

/**
 * Semantic HTML string renderer for server-side generation, static site export,
 * and automated headless runner testing.
 */
export function renderLandingHero({
  title = DEFAULT_HERO_TITLE,
  subtitle = DEFAULT_HERO_SUBTITLE,
  primaryCtaText = "Get Started Free",
  primaryCtaUrl = "/sign-in",
  secondaryCtaText = "Explore Architecture",
  secondaryCtaUrl = "#features",
  trustPillText = DEFAULT_TRUST_PILL,
  className,
  id = "landing-hero-section",
}: LandingHeroProps = {}): string {
  const classes = `landing-hero ${className ? className : ""}`.trim();

  return `<section id="${id}" class="${classes}" aria-labelledby="hero-heading">
  <div class="hero-pill" role="status" aria-label="Tier Benefits">
    <span aria-hidden="true">✦</span>
    <span>${trustPillText}</span>
  </div>
  <h1 id="hero-heading" class="hero-title">${title}</h1>
  <p class="hero-subtitle">${subtitle}</p>
  <div class="hero-actions">
    <a href="${primaryCtaUrl}" class="btn-hero-primary" aria-label="${primaryCtaText} with Clerk OAuth">${primaryCtaText}<span aria-hidden="true"> →</span></a>
    <a href="${secondaryCtaUrl}" class="btn-hero-secondary" aria-label="${secondaryCtaText}">${secondaryCtaText}</a>
  </div>
</section>`;
}
