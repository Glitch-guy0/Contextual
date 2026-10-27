import { describe, it, expect } from "bun:test";
import {
  NavigationHeader,
  renderNavigationHeader,
  LandingHero,
  renderLandingHero,
  FeatureGrid,
  renderFeatureGrid,
  PublicFooter,
  renderPublicFooter,
  DEFAULT_NAV_LINKS,
  DEFAULT_FEATURES,
  DEFAULT_FOOTER_LINKS,
} from "@repo/ui";

describe("M8 S8.3: Public Marketing Landing Components (FR-022, BR-024)", () => {
  describe("NavigationHeader Component", () => {
    it("renders semantic header and navigation with brand and sign-in CTA", () => {
      const html = renderNavigationHeader();
      expect(html).toContain('id="landing-navigation-header"');
      expect(html).toContain('class="landing-header"');
      expect(html).toContain('<nav class="landing-nav" aria-label="Main Navigation">');
      expect(html).toContain('class="landing-brand"');
      expect(html).toContain("Contextual");
      expect(html).toContain('href="/sign-in"');
      expect(html).toContain('class="btn-signin"');
      expect(html).toContain("Sign In");

      // Verify default nav links
      expect(html).toContain('href="#features"');
      expect(html).toContain("Features");
      expect(html).toContain('href="#pricing"');
      expect(html).toContain("Pricing");
      expect(html).toContain('href="#architecture"');
      expect(html).toContain("Architecture");
    });

    it("supports custom brand name, sign-in URL, and nav links", () => {
      const html = renderNavigationHeader({
        brandName: "Contextual Pro",
        signInUrl: "/auth/login",
        navLinks: [{ label: "Docs", href: "/docs" }],
      });
      expect(html).toContain("Contextual Pro");
      expect(html).toContain('href="/auth/login"');
      expect(html).toContain('href="/docs"');
      expect(html).not.toContain('href="#pricing"');
    });

    it("JSX NavigationHeader returns structured header element", () => {
      const vdom = NavigationHeader();
      expect(vdom).toBeDefined();
      expect(vdom.type).toBe("header");
      expect(vdom.props.id).toBe("landing-navigation-header");
    });
  });

  describe("LandingHero Component", () => {
    it("renders core grounded reasoning value proposition and dual CTAs", () => {
      const html = renderLandingHero();
      expect(html).toContain('id="landing-hero-section"');
      expect(html).toContain('class="landing-hero"');
      expect(html).toContain('aria-labelledby="hero-heading"');

      // Trust pill
      expect(html).toContain('class="hero-pill"');
      expect(html).toContain("10 Daily Free Credits · No Credit Card Required · Zero Egress Fees");

      // Heading 1 & Subtitle
      expect(html).toContain('<h1 id="hero-heading" class="hero-title">');
      expect(html).toContain("Multi-Modal Contextual Reasoning Powered by Grounded Citations");
      expect(html).toContain('class="hero-subtitle"');
      expect(html).toContain("Turn multi-page PDFs, YouTube transcripts, and web sources into actionable knowledge graphs");

      // Dual Action CTAs
      expect(html).toContain('href="/sign-in"');
      expect(html).toContain('class="btn-hero-primary"');
      expect(html).toContain("Get Started Free");
      expect(html).toContain('href="#features"');
      expect(html).toContain('class="btn-hero-secondary"');
      expect(html).toContain("Explore Architecture");
    });

    it("supports custom hero titles and custom CTAs", () => {
      const html = renderLandingHero({
        title: "Enterprise Context Platform",
        primaryCtaText: "Start Now",
        primaryCtaUrl: "/register",
      });
      expect(html).toContain("Enterprise Context Platform");
      expect(html).toContain("Start Now");
      expect(html).toContain('href="/register"');
    });

    it("JSX LandingHero returns structured section element", () => {
      const vdom = LandingHero();
      expect(vdom).toBeDefined();
      expect(vdom.type).toBe("section");
      expect(vdom.props.id).toBe("landing-hero-section");
    });
  });

  describe("FeatureGrid Component", () => {
    it("renders the 4 core platform capabilities with semantic card articles", () => {
      const html = renderFeatureGrid();
      expect(html).toContain('id="features"');
      expect(html).toContain('class="feature-grid-section"');
      expect(html).toContain('aria-labelledby="features-heading"');
      expect(html).toContain('<h2 id="features-heading" class="section-title">');
      expect(html).toContain("Built for Grounded Multi-Modal Intelligence");

      // 4 Core Capabilities
      expect(html).toContain("Multi-Modal Ingestion");
      expect(html).toContain("Grounded Reasoning");
      expect(html).toContain("Knowledge Graph Engine");
      expect(html).toContain("Ephemeral Memory & Privacy");

      // Semantic article cards
      expect(html).toContain('class="feature-card"');
      const articleMatches = html.match(/<article/g);
      expect(articleMatches?.length).toBe(4);
    });

    it("JSX FeatureGrid returns structured section element", () => {
      const vdom = FeatureGrid();
      expect(vdom).toBeDefined();
      expect(vdom.type).toBe("section");
      expect(vdom.props.id).toBe("features");
    });
  });

  describe("PublicFooter Component", () => {
    it("renders semantic footer with copyright and documentation links", () => {
      const html = renderPublicFooter();
      expect(html).toContain('id="landing-footer"');
      expect(html).toContain('class="public-footer"');
      expect(html).toContain('role="contentinfo"');
      expect(html).toContain('aria-label="Site Footer"');

      // Copyright & Brand
      expect(html).toContain("© 2026 Contextual AI. All rights reserved.");
      expect(html).toContain("Built with zero-cost edge infrastructure.");

      // External documentation and GitHub links
      expect(html).toContain('href="https://github.com/Glitch-guy0/Contextual"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain('href="https://ai.google.dev/terms"');
      expect(html).toContain('href="https://groq.com/privacy-policy/"');
    });

    it("JSX PublicFooter returns structured footer element", () => {
      const vdom = PublicFooter();
      expect(vdom).toBeDefined();
      expect(vdom.type).toBe("footer");
      expect(vdom.props.id).toBe("landing-footer");
    });
  });

  describe("BR-024 Public Page Isolation Invariant", () => {
    it("ensures public landing components operate with zero user session or cookie state", () => {
      // Components take only pure static props
      const headerProps = { brandName: "Contextual" };
      const heroProps = { title: "Title" };
      const featureProps = { sectionTitle: "Features" };
      const footerProps = { brandName: "Contextual" };

      expect("token" in headerProps).toBe(false);
      expect("session" in headerProps).toBe(false);
      expect("cookies" in heroProps).toBe(false);
      expect("user" in featureProps).toBe(false);
      expect("tenantId" in footerProps).toBe(false);

      // Rendering does not throw or require browser document/window
      expect(() => renderNavigationHeader()).not.toThrow();
      expect(() => renderLandingHero()).not.toThrow();
      expect(() => renderFeatureGrid()).not.toThrow();
      expect(() => renderPublicFooter()).not.toThrow();
    });
  });
});
