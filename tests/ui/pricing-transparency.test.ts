import { describe, it, expect } from "bun:test";
import {
  PricingCard,
  renderPricingCard,
  DEFAULT_ACTION_COSTS,
} from "@repo/ui";

describe("M8 S8.4: Zero-Cost Pricing Transparency & Daily Quota Breakdown (FR-022, BR-025, BR-026)", () => {
  it("renders Free Community Tier with explicit $0.00 and zero hidden fees", () => {
    const html = renderPricingCard();
    expect(html).toContain('id="pricing"');
    expect(html).toContain('class="pricing-section"');
    expect(html).toContain('class="pricing-plan-badge"');
    expect(html).toContain("Free Community Tier");
    expect(html).toContain("$0.00");
    expect(html).toContain("/ forever");
    expect(html).toContain("Guaranteed $0.00 forever");
  });

  it("articulates 10 credits daily allowance and 08:00 UTC idempotent reset rule (BR-025)", () => {
    const html = renderPricingCard();
    expect(html).toContain("10 credits daily");
    expect(html).toContain("08:00 UTC");
    expect(html).toContain("BR-025");
  });

  it("details action consumption costs aligned with metering package (0.5 query, 1.0 ingest)", () => {
    const html = renderPricingCard();
    expect(html).toContain("Grounded Reasoning Query (Gemini / Groq)");
    expect(html).toContain("0.5 credits");
    expect(html).toContain("Up to 20 queries / day");

    expect(html).toContain("Document / Transcript Ingestion (PDF / YouTube / Web)");
    expect(html).toContain("1.0 credit");
    expect(html).toContain("Up to 10 documents / day");
  });

  it("discloses unspent credit expiration with complete transparency (BR-026 zero roll-over)", () => {
    const html = renderPricingCard();
    expect(html).toContain("BR-026");
    expect(html).toContain("unspent credits expire at reset time");
    expect(html).toContain("zero roll-over carryover");
  });

  it("enforces zero billing forms, credit card inputs, or third-party payment scripts", () => {
    const html = renderPricingCard();
    expect(html).toContain("No credit card or payment authorization required");

    // Strictly no financial inputs or third-party billing providers
    expect(html).not.toContain("<input");
    expect(html).not.toContain("cardNumber");
    expect(html).not.toContain("cvv");
    expect(html).not.toContain("stripe");
    expect(html).not.toContain("billingAddress");
    expect(html).not.toContain("billing_address");
    expect(html).not.toContain("<form");

    // Primary CTA is clean OAuth sign-in
    expect(html).toContain('href="/sign-in"');
    expect(html).toContain("Get Started Free");
  });

  it("JSX PricingCard returns structured section element", () => {
    const vdom = PricingCard();
    expect(vdom).toBeDefined();
    expect(vdom.type).toBe("section");
    expect(vdom.props.id).toBe("pricing");
  });

  it("supports custom daily credit grants and custom CTA destinations", () => {
    const html = renderPricingCard({
      dailyCredits: 25,
      ctaText: "Join Beta",
      ctaUrl: "/beta-signup",
    });
    expect(html).toContain("25 credits daily");
    expect(html).toContain("Join Beta");
    expect(html).toContain('href="/beta-signup"');
  });
});
