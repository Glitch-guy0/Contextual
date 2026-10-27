export interface FeatureItem {
  readonly id: string;
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export interface FeatureGridProps {
  readonly sectionTag?: string;
  readonly sectionTitle?: string;
  readonly sectionSubtitle?: string;
  readonly features?: readonly FeatureItem[];
  readonly className?: string;
  readonly id?: string;
}

export const DEFAULT_FEATURES: readonly FeatureItem[] = [
  {
    id: "feature-ingestion",
    icon: "📄",
    title: "Multi-Modal Ingestion",
    description:
      "Streamlined parsing of multi-page PDFs, YouTube video transcripts, and web sources into clean semantic chunks with deterministic token budgeting.",
  },
  {
    id: "feature-reasoning",
    icon: "⚡",
    title: "Grounded Reasoning",
    description:
      "Dual-provider LLM inference (Google Gemini 2.5 Flash with Groq LPU fallback) featuring mandatory source-grounded citation bounds.",
  },
  {
    id: "feature-graph",
    icon: "🕸️",
    title: "Knowledge Graph Engine",
    description:
      "Dynamic Neo4j-compatible entity and relationship mapping with high-performance vector retrieval across hybrid embedding spaces.",
  },
  {
    id: "feature-memory",
    icon: "🔒",
    title: "Ephemeral Memory & Privacy",
    description:
      "Sliding conversation context windows with automated 30-day retention cleanup and zero third-party training data leakage.",
  },
];

/**
 * Public Feature Grid Component
 *
 * Implements FR-022, BR-024, and NFR-018/NFR-019.
 * Renders the 4 core platform capabilities with zero layout shift.
 */
export function FeatureGrid({
  sectionTag = "Platform Capabilities",
  sectionTitle = "Built for Grounded Multi-Modal Intelligence",
  sectionSubtitle = "Four modular micro-engines orchestrated to turn fragmented raw sources into verifiable insights.",
  features = DEFAULT_FEATURES,
  className,
  id = "features",
}: FeatureGridProps = {}) {
  return (
    <section id={id} className={`feature-grid-section ${className ? className : ""}`.trim()} aria-labelledby="features-heading">
      <div className="section-header">
        <div className="section-tag" role="text">
          {sectionTag}
        </div>
        <h2 id="features-heading" className="section-title">
          {sectionTitle}
        </h2>
        <p className="section-subtitle">{sectionSubtitle}</p>
      </div>

      <div className="feature-grid" role="list">
        {features.map((feature) => (
          <article key={feature.id} className="feature-card" role="listitem">
            <div className="feature-icon-wrapper" aria-hidden="true">
              {feature.icon}
            </div>
            <h3 className="feature-card-title">{feature.title}</h3>
            <p className="feature-card-desc">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * Semantic HTML string renderer for server-side generation, static site export,
 * and automated headless runner testing.
 */
export function renderFeatureGrid({
  sectionTag = "Platform Capabilities",
  sectionTitle = "Built for Grounded Multi-Modal Intelligence",
  sectionSubtitle = "Four modular micro-engines orchestrated to turn fragmented raw sources into verifiable insights.",
  features = DEFAULT_FEATURES,
  className,
  id = "features",
}: FeatureGridProps = {}): string {
  const classes = `feature-grid-section ${className ? className : ""}`.trim();
  const cardsHtml = features
    .map(
      (feature) => `<article class="feature-card" role="listitem">
      <div class="feature-icon-wrapper" aria-hidden="true">${feature.icon}</div>
      <h3 class="feature-card-title">${feature.title}</h3>
      <p class="feature-card-desc">${feature.description}</p>
    </article>`
    )
    .join("\n    ");

  return `<section id="${id}" class="${classes}" aria-labelledby="features-heading">
  <div class="section-header">
    <div class="section-tag">${sectionTag}</div>
    <h2 id="features-heading" class="section-title">${sectionTitle}</h2>
    <p class="section-subtitle">${sectionSubtitle}</p>
  </div>
  <div class="feature-grid" role="list">
    ${cardsHtml}
  </div>
</section>`;
}
