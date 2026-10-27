export * from "./tokens.js";

export interface BaseComponentProps {
  readonly className?: string;
  readonly id?: string;
}

export interface ButtonProps extends BaseComponentProps {
  readonly variant?: "primary" | "secondary" | "outline" | "ghost";
  readonly size?: "sm" | "md" | "lg";
  readonly disabled?: boolean;
  readonly type?: "button" | "submit" | "reset";
}

export interface CardProps extends BaseComponentProps {
  readonly title?: string;
  readonly elevation?: "flat" | "raised" | "bordered";
}

export interface BadgeProps extends BaseComponentProps {
  readonly tone?: "info" | "success" | "warning" | "error" | "neutral";
}

export * from "./components/disclosure-banner.js";
export * from "./components/prompt-disclosure.js";
export * from "./components/navigation-header.js";
export * from "./components/landing-hero.js";
export * from "./components/feature-grid.js";
export * from "./components/public-footer.js";
export * from "./components/pricing-card.js";
