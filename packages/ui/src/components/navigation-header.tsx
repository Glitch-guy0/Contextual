export interface NavLinkItem {
  readonly label: string;
  readonly href: string;
}

export interface NavigationHeaderProps {
  readonly brandName?: string;
  readonly signInUrl?: string;
  readonly navLinks?: readonly NavLinkItem[];
  readonly className?: string;
  readonly id?: string;
}

export const DEFAULT_NAV_LINKS: readonly NavLinkItem[] = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Architecture", href: "#architecture" },
];

/**
 * Public Navigation Header Component
 *
 * Implements FR-022, BR-024, and NFR-019.
 * Strictly stateless without authenticated user cookies, tokens, or sessions.
 */
export function NavigationHeader({
  brandName = "Contextual",
  signInUrl = "/sign-in",
  navLinks = DEFAULT_NAV_LINKS,
  className,
  id = "landing-navigation-header",
}: NavigationHeaderProps = {}) {
  return (
    <header id={id} className={`landing-header ${className ? className : ""}`.trim()}>
      <nav className="landing-nav" aria-label="Main Navigation">
        <a href="/" className="landing-brand" aria-label={`${brandName} Home`}>
          <div className="landing-brand-logo" aria-hidden="true">
            C
          </div>
          <span>{brandName}</span>
        </a>

        <ul className="landing-nav-links" role="list">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="landing-nav-link">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="landing-nav-actions">
          <a href={signInUrl} className="btn-signin" aria-label="Sign in to your account">
            Sign In
          </a>
        </div>
      </nav>
    </header>
  );
}

/**
 * Semantic HTML string renderer for server-side generation, static site export,
 * and automated headless runner testing.
 */
export function renderNavigationHeader({
  brandName = "Contextual",
  signInUrl = "/sign-in",
  navLinks = DEFAULT_NAV_LINKS,
  className,
  id = "landing-navigation-header",
}: NavigationHeaderProps = {}): string {
  const classes = `landing-header ${className ? className : ""}`.trim();
  const linksHtml = navLinks
    .map(
      (link) => `<li><a href="${link.href}" class="landing-nav-link">${link.label}</a></li>`
    )
    .join("\n        ");

  return `<header id="${id}" class="${classes}">
  <nav class="landing-nav" aria-label="Main Navigation">
    <a href="/" class="landing-brand" aria-label="${brandName} Home">
      <div class="landing-brand-logo" aria-hidden="true">C</div>
      <span>${brandName}</span>
    </a>
    <ul class="landing-nav-links" role="list">
      ${linksHtml}
    </ul>
    <div class="landing-nav-actions">
      <a href="${signInUrl}" class="btn-signin" aria-label="Sign in to your account">Sign In</a>
    </div>
  </nav>
</header>`;
}
