/**
 * Shared UI Design Tokens and Component Interface Stubs
 * Reference: conventions.md §1/§2, FR-030, CV-041
 */

export const DESIGN_TOKENS = {
  colors: {
    primary: "#4285F4",
    primaryHover: "#3367D6",
    surface: "#FFFFFF",
    background: "#F8F9FA",
    textPrimary: "#202124",
    textSecondary: "#5F6368",
    border: "#DADCE0",
    error: "#EA4335",
    warning: "#FBBC04",
    success: "#34A853",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  radii: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    full: "9999px",
  },
  typography: {
    fontFamilySans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontFamilyMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;

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

export interface DisclosureBannerProps extends BaseComponentProps {
  readonly provider: "google-ai-studio" | "groq";
  readonly disclosureText: string;
  readonly optOutUrl?: string;
}
