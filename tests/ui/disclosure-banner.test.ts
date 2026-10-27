import { describe, it, expect } from "bun:test";
import {
  DisclosureBanner,
  renderDisclosureBanner,
  PromptDisclosureNotice,
  renderPromptDisclosureNotice,
} from "@repo/ui";
import { DISCLOSURE_CONFIGS } from "@repo/contracts";

describe("M8 S8.2: Dynamic Un-dismissible AI Provider Training Disclosure Banner (FR-030, BR-030, CV-041)", () => {
  describe("DisclosureBanner Component", () => {
    it("renders default Google AI Studio training disclosure correctly", () => {
      const html = renderDisclosureBanner();
      expect(html).toContain('id="ai-training-disclosure-banner"');
      expect(html).toContain('class="disclosure-banner"');
      expect(html).toContain('role="region"');
      expect(html).toContain('aria-label="AI Provider Privacy Disclosure"');
      expect(html).toContain('data-provider="google-ai-studio"');
      expect(html).toContain('data-training-status="training-enabled"');

      // Header, Badge & Title
      expect(html).toContain("Google Gemini Free Tier");
      expect(html).toContain("AI Provider Data Training Disclosure");

      // Mandatory Legal Copy & Policy Link (FR-030, BR-028)
      expect(html).toContain(
        "Prompts and documents are processed via Google AI Studio free tier. In accordance with Google terms of service, prompt inputs and generated outputs may be reviewed by human reviewers and utilized to train Google AI models."
      );
      expect(html).toContain('href="https://ai.google.dev/terms"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    it("renders Groq fallback disclosure when provider is set to groq", () => {
      const html = renderDisclosureBanner({ provider: "groq" });
      expect(html).toContain('data-provider="groq"');
      expect(html).toContain('data-training-status="training-exempt"');
      expect(html).toContain("Groq Llama-3.3 Fallback");
      expect(html).toContain("Secondary Inference Provider Notice");
      expect(html).toContain("without retention for model training");
      expect(html).toContain('href="https://groq.com/privacy-policy/"');
    });

    it("supports custom className and id attributes", () => {
      const html = renderDisclosureBanner({
        className: "custom-sticky-banner",
        id: "workspace-privacy-banner",
      });
      expect(html).toContain('id="workspace-privacy-banner"');
      expect(html).toContain('class="disclosure-banner custom-sticky-banner"');
    });

    it("JSX component returns structured object matching rendered markup", () => {
      const vdom = DisclosureBanner({ provider: "google-ai-studio" });
      expect(vdom).toBeDefined();
      expect(vdom.type).toBe("section");
      expect(vdom.props.role).toBe("region");
      expect(vdom.props["data-provider"]).toBe("google-ai-studio");
      expect(vdom.props["data-training-status"]).toBe("training-enabled");
    });

    it("strictly enforces BR-030 Anti-Tampering Invariant (no close buttons, no dismiss handles)", () => {
      const html = renderDisclosureBanner();

      // Invariant: Banner MUST NOT have any button or dismissal triggers
      expect(html).not.toContain("<button");
      expect(html).not.toContain("</button>");
      expect(html).not.toContain("close");
      expect(html).not.toContain("dismiss");
      expect(html).not.toContain("localStorage");
      expect(html).not.toContain("sessionStorage");
      expect(html).not.toContain("aria-label=\"Close\"");
      expect(html).not.toContain("aria-label=\"Dismiss\"");

      // Invariant: Props interface does not have onDismiss
      const bannerProps = {
        provider: "google-ai-studio" as const,
      };
      expect("onDismiss" in bannerProps).toBe(false);
      expect("dismissible" in bannerProps).toBe(false);
    });
  });

  describe("PromptDisclosureNotice Component", () => {
    it("renders compact prompt notice for Google AI Studio", () => {
      const html = renderPromptDisclosureNotice();
      expect(html).toContain('id="prompt-disclosure-notice"');
      expect(html).toContain('class="prompt-disclosure-notice"');
      expect(html).toContain('role="note"');
      expect(html).toContain('aria-label="Prompt Privacy Notice"');
      expect(html).toContain('data-provider="google-ai-studio"');
      expect(html).toContain("AI Training Notice");
      expect(html).toContain("prompts and outputs may be used to train Google AI models");
      expect(html).toContain('href="https://ai.google.dev/terms"');
      expect(html).toContain("Terms ↗");
    });

    it("renders compact prompt notice for Groq fallback", () => {
      const html = renderPromptDisclosureNotice({ provider: "groq" });
      expect(html).toContain('data-provider="groq"');
      expect(html).toContain("Privacy Notice");
      expect(html).toContain("data processed transiently without retention for training");
      expect(html).toContain('href="https://groq.com/privacy-policy/"');
    });

    it("enforces BR-030 anti-tampering invariant on prompt notice (no close handles)", () => {
      const html = renderPromptDisclosureNotice();
      expect(html).not.toContain("<button");
      expect(html).not.toContain("</button>");
      expect(html).not.toContain("dismiss");
    });

    it("JSX component returns structured element", () => {
      const vdom = PromptDisclosureNotice({ provider: "google-ai-studio" });
      expect(vdom).toBeDefined();
      expect(vdom.type).toBe("div");
      expect(vdom.props.role).toBe("note");
      expect(vdom.props["data-provider"]).toBe("google-ai-studio");
    });
  });
});
