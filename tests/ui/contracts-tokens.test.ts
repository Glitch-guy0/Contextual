import { describe, it, expect } from "bun:test";
import {
  DISCLOSURE_CONFIGS,
  assertProviderDisclosurePolicy,
  type ProviderDisclosurePolicy,
  type ProviderType,
  ERROR_CATALOGUE,
} from "@repo/contracts";
import {
  DESIGN_TOKENS,
  getContrastRatio,
  getRelativeLuminance,
  generateCssVariables,
} from "@repo/ui";

describe("M8 S8.1: Privacy Disclosure Contracts & Design Tokens", () => {
  describe("AI Provider Disclosure Contracts (@repo/contracts)", () => {
    it("exports valid configurations for all supported providers", () => {
      const providers: ProviderType[] = ["google-ai-studio", "groq"];
      for (const provider of providers) {
        const config = DISCLOSURE_CONFIGS[provider];
        expect(config).toBeDefined();
        expect(config.provider).toBe(provider);
        expect(typeof config.badgeLabel).toBe("string");
        expect(config.badgeLabel.length).toBeGreaterThan(0);
        expect(typeof config.noticeTitle).toBe("string");
        expect(typeof config.noticeBody).toBe("string");
        expect(config.policyUrl.startsWith("https://")).toBe(true);
        expect(["training-enabled", "training-exempt"]).toContain(config.trainingStatus);
        expect(() => assertProviderDisclosurePolicy(config)).not.toThrow();
      }
    });

    it("enforces Google AI Studio explicit training disclosure text and policy link (FR-030, BR-028)", () => {
      const googleConfig = DISCLOSURE_CONFIGS["google-ai-studio"];
      expect(googleConfig.trainingStatus).toBe("training-enabled");
      expect(googleConfig.policyUrl).toBe("https://ai.google.dev/terms");
      expect(googleConfig.noticeBody).toContain("Prompts and documents are processed via Google AI Studio free tier");
      expect(googleConfig.noticeBody).toContain(
        "prompt inputs and generated outputs may be reviewed by human reviewers and utilized to train Google AI models"
      );
    });

    it("enforces Groq inference fallback privacy and model training exemption (FR-030)", () => {
      const groqConfig = DISCLOSURE_CONFIGS.groq;
      expect(groqConfig.trainingStatus).toBe("training-exempt");
      expect(groqConfig.policyUrl).toBe("https://groq.com/privacy-policy/");
      expect(groqConfig.noticeBody).toContain("without retention for model training");
    });

    it("assertProviderDisclosurePolicy rejects invalid payloads", () => {
      expect(() => assertProviderDisclosurePolicy(null)).toThrow("ProviderDisclosurePolicy must be an object");
      expect(() => assertProviderDisclosurePolicy({})).toThrow("Invalid provider");
      expect(() =>
        assertProviderDisclosurePolicy({
          provider: "openai",
          badgeLabel: "test",
          noticeTitle: "test",
          noticeBody: "test",
          policyUrl: "https://test.com",
          trainingStatus: "training-exempt",
        })
      ).toThrow("Invalid provider");
      expect(() =>
        assertProviderDisclosurePolicy({
          provider: "groq",
          badgeLabel: "",
          noticeTitle: "test",
          noticeBody: "test",
          policyUrl: "https://test.com",
          trainingStatus: "training-exempt",
        })
      ).toThrow("badgeLabel must be a non-empty string");
      expect(() =>
        assertProviderDisclosurePolicy({
          provider: "groq",
          badgeLabel: "Groq",
          noticeTitle: "Notice",
          noticeBody: "Body",
          policyUrl: "http://insecure.com",
          trainingStatus: "training-exempt",
        })
      ).toThrow("policyUrl must be a valid secure URL");
    });

    it("ensures the RFC 9457 error catalogue remains closed with exactly 17 entries", () => {
      const keys = Object.keys(ERROR_CATALOGUE);
      expect(keys.length).toBe(17);
    });
  });

  describe("Shared UI Design Tokens (@repo/ui)", () => {
    it("exports design tokens matching required structure", () => {
      expect(DESIGN_TOKENS.colors).toBeDefined();
      expect(DESIGN_TOKENS.spacing).toBeDefined();
      expect(DESIGN_TOKENS.radii).toBeDefined();
      expect(DESIGN_TOKENS.typography).toBeDefined();
      expect(DESIGN_TOKENS.elevation).toBeDefined();
      expect(DESIGN_TOKENS.focus).toBeDefined();
    });

    it("satisfies WCAG 2.1 AA text contrast requirements (contrast >= 4.5:1)", () => {
      // Primary text on white surface
      const textPrimaryRatio = getContrastRatio(
        DESIGN_TOKENS.colors.textPrimary,
        DESIGN_TOKENS.colors.surface
      );
      expect(textPrimaryRatio).toBeGreaterThanOrEqual(4.5);

      // Secondary text on white surface
      const textSecondaryRatio = getContrastRatio(
        DESIGN_TOKENS.colors.textSecondary,
        DESIGN_TOKENS.colors.surface
      );
      expect(textSecondaryRatio).toBeGreaterThanOrEqual(4.5);

      // Warning text on warning background
      const warningRatio = getContrastRatio(
        DESIGN_TOKENS.colors.warningText,
        DESIGN_TOKENS.colors.warningBg
      );
      expect(warningRatio).toBeGreaterThanOrEqual(4.5);

      // Error text on error background
      const errorRatio = getContrastRatio(
        DESIGN_TOKENS.colors.errorText,
        DESIGN_TOKENS.colors.errorBg
      );
      expect(errorRatio).toBeGreaterThanOrEqual(4.5);

      // Success text on success background
      const successRatio = getContrastRatio(
        DESIGN_TOKENS.colors.successText,
        DESIGN_TOKENS.colors.successBg
      );
      expect(successRatio).toBeGreaterThanOrEqual(4.5);
    });

    it("satisfies WCAG 2.1 AA non-text UI component contrast requirements (contrast >= 3:1)", () => {
      // Warning border on white surface
      const warningBorderRatio = getContrastRatio(
        DESIGN_TOKENS.colors.warningBorder,
        DESIGN_TOKENS.colors.surface
      );
      expect(warningBorderRatio).toBeGreaterThanOrEqual(3.0);

      // Primary button hover on white
      const primaryRatio = getContrastRatio(
        DESIGN_TOKENS.colors.primary,
        DESIGN_TOKENS.colors.surface
      );
      expect(primaryRatio).toBeGreaterThanOrEqual(3.0);
    });

    it("calculates relative luminance accurately", () => {
      expect(getRelativeLuminance("#000000")).toBe(0);
      expect(getRelativeLuminance("#FFFFFF")).toBeCloseTo(1.0, 2);
    });

    it("generates CSS custom properties root string", () => {
      const css = generateCssVariables();
      expect(css).toContain(":root {");
      expect(css).toContain("--color-primary: #4285F4;");
      expect(css).toContain("--color-warning-bg: #FEF7E0;");
      expect(css).toContain("--color-warning-text: #7A4D00;");
      expect(css).toContain("--font-sans:");
    });
  });
});
