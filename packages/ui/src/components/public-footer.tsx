export interface FooterLinkItem {
  readonly label: string;
  readonly href: string;
  readonly external?: boolean;
}

export interface PublicFooterProps {
  readonly brandName?: string;
  readonly copyrightYear?: number;
  readonly githubUrl?: string;
  readonly footerLinks?: readonly FooterLinkItem[];
  readonly className?: string;
  readonly id?: string;
}

export const DEFAULT_FOOTER_LINKS: readonly FooterLinkItem[] = [
  { label: "Architecture", href: "#architecture" },
  { label: "Terms of Service", href: "https://ai.google.dev/terms", external: true },
  { label: "Privacy Policy", href: "https://groq.com/privacy-policy/", external: true },
  { label: "GitHub", href: "https://github.com/Glitch-guy0/Contextual", external: true },
];

/**
 * Public Landing Footer Component
 *
 * Implements FR-022, BR-024, and NFR-019.
 * Delivers semantic footer navigation, copyright, and external documentation references.
 */
export function PublicFooter({
  brandName = "Contextual",
  copyrightYear = 2026,
  githubUrl = "https://github.com/Glitch-guy0/Contextual",
  footerLinks = DEFAULT_FOOTER_LINKS,
  className,
  id = "landing-footer",
}: PublicFooterProps = {}) {
  return (
    <footer id={id} className={`public-footer ${className ? className : ""}`.trim()} role="contentinfo" aria-label="Site Footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-brand-name">{brandName}</span>
          <span className="footer-copyright">
            © {copyrightYear} {brandName} AI. All rights reserved. Built with zero-cost edge infrastructure.
          </span>
        </div>

        <ul className="footer-links" role="list">
          {footerLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="footer-link"
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                aria-label={link.external ? `${link.label} (opens in a new tab)` : link.label}
              >
                {link.label}
                {link.external && <span aria-hidden="true"> ↗</span>}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

/**
 * Semantic HTML string renderer for server-side generation, static site export,
 * and automated headless runner testing.
 */
export function renderPublicFooter({
  brandName = "Contextual",
  copyrightYear = 2026,
  githubUrl = "https://github.com/Glitch-guy0/Contextual",
  footerLinks = DEFAULT_FOOTER_LINKS,
  className,
  id = "landing-footer",
}: PublicFooterProps = {}): string {
  const classes = `public-footer ${className ? className : ""}`.trim();
  const linksHtml = footerLinks
    .map((link) => {
      const ext = link.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      const aria = link.external ? ` aria-label="${link.label} (opens in a new tab)"` : ` aria-label="${link.label}"`;
      const arrow = link.external ? '<span aria-hidden="true"> ↗</span>' : "";
      return `<li><a href="${link.href}" class="footer-link"${ext}${aria}>${link.label}${arrow}</a></li>`;
    })
    .join("\n      ");

  return `<footer id="${id}" class="${classes}" role="contentinfo" aria-label="Site Footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <span class="footer-brand-name">${brandName}</span>
      <span class="footer-copyright">© ${copyrightYear} ${brandName} AI. All rights reserved. Built with zero-cost edge infrastructure.</span>
    </div>
    <ul class="footer-links" role="list">
      ${linksHtml}
    </ul>
  </div>
</footer>`;
}
