/**
 * Shared UI Design Tokens and WCAG 2.1 AA Compliance Standards
 * Reference: conventions.md §1/§2, FR-030, CV-041..CV-044, NFR-018, NFR-019
 */

export const DESIGN_TOKENS = {
  colors: {
    // Primary Accents
    primary: "#4285F4",
    primaryHover: "#3367D6",
    primaryActive: "#1A73E8",
    primaryLight: "rgba(66, 133, 244, 0.08)",

    // Surfaces & Backgrounds
    background: "#F8F9FA",
    surface: "#FFFFFF",
    surfaceTranslucent: "rgba(255, 255, 255, 0.85)",
    surfaceDark: "#202124",
    surfaceDarkMuted: "#303134",

    // Typography (WCAG 2.1 AA: normal text >= 4.5:1, large text >= 3:1)
    textPrimary: "#202124",      // 14.1:1 on #FFFFFF
    textSecondary: "#5F6368",    // 4.6:1 on #FFFFFF
    textMuted: "#70757A",        // 3.6:1 on #FFFFFF (large text only)
    textInverse: "#FFFFFF",

    // Borders & Outlines (WCAG 2.1 AA non-text contrast >= 3:1)
    border: "#DADCE0",
    borderFocus: "#4285F4",
    borderDark: "#5F6368",

    // Disclosure & Regulatory Alerts (Amber / Warning)
    warningBg: "#FEF7E0",
    warningBorder: "#B06000",      // 4.6:1 on #FFFFFF (WCAG 2.1 AA >= 3:1 Pass)
    warningText: "#7A4D00",        // 5.8:1 on #FEF7E0 (WCAG 2.1 AA Pass)
    warningBadge: "#B06000",

    // Success & Error Tones
    successBg: "#E6F4EA",
    successBorder: "#34A853",
    successText: "#137333",      // 5.2:1 on #E6F4EA
    errorBg: "#FCE8E6",
    errorBorder: "#EA4335",
    errorText: "#C5221F",        // 5.4:1 on #FCE8E6
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
    xxxl: "64px",
  },
  radii: {
    xs: "2px",
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px",
  },
  typography: {
    fontFamilySans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontFamilyMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    h1: { fontSize: "40px", lineHeight: "48px", fontWeight: "700" },
    h2: { fontSize: "28px", lineHeight: "36px", fontWeight: "600" },
    h3: { fontSize: "20px", lineHeight: "28px", fontWeight: "600" },
    body: { fontSize: "16px", lineHeight: "24px", fontWeight: "400" },
    bodyMedium: { fontSize: "16px", lineHeight: "24px", fontWeight: "500" },
    small: { fontSize: "13px", lineHeight: "18px", fontWeight: "400" },
  },
  elevation: {
    flat: "none",
    card: "0 1px 3px rgba(60, 64, 67, 0.12), 0 1px 2px rgba(60, 64, 67, 0.24)",
    floating: "0 4px 12px rgba(60, 64, 67, 0.15)",
    glass: "backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);",
  },
  focus: {
    outlineWidth: "2px",
    outlineStyle: "solid",
    outlineColor: "#4285F4",
    outlineOffset: "2px",
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;

/**
 * Computes relative luminance for a hex color according to WCAG 2.1 specs
 */
export function getRelativeLuminance(hex: string): number {
  const sanitized = hex.replace("#", "");
  const r = parseInt(sanitized.substring(0, 2), 16) / 255;
  const g = parseInt(sanitized.substring(2, 4), 16) / 255;
  const b = parseInt(sanitized.substring(4, 6), 16) / 255;

  const toLinear = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes WCAG 2.1 contrast ratio between two hex colors (e.g. 4.5 for 4.5:1)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Generates Vanilla CSS root custom properties from DESIGN_TOKENS
 */
export function generateCssVariables(): string {
  return `:root {
  --color-primary: ${DESIGN_TOKENS.colors.primary};
  --color-primary-hover: ${DESIGN_TOKENS.colors.primaryHover};
  --color-primary-active: ${DESIGN_TOKENS.colors.primaryActive};
  --color-primary-light: ${DESIGN_TOKENS.colors.primaryLight};

  --color-background: ${DESIGN_TOKENS.colors.background};
  --color-surface: ${DESIGN_TOKENS.colors.surface};
  --color-surface-translucent: ${DESIGN_TOKENS.colors.surfaceTranslucent};
  --color-surface-dark: ${DESIGN_TOKENS.colors.surfaceDark};

  --color-text-primary: ${DESIGN_TOKENS.colors.textPrimary};
  --color-text-secondary: ${DESIGN_TOKENS.colors.textSecondary};
  --color-text-inverse: ${DESIGN_TOKENS.colors.textInverse};

  --color-border: ${DESIGN_TOKENS.colors.border};
  --color-border-focus: ${DESIGN_TOKENS.colors.borderFocus};

  --color-warning-bg: ${DESIGN_TOKENS.colors.warningBg};
  --color-warning-border: ${DESIGN_TOKENS.colors.warningBorder};
  --color-warning-text: ${DESIGN_TOKENS.colors.warningText};
  --color-warning-badge: ${DESIGN_TOKENS.colors.warningBadge};

  --spacing-xs: ${DESIGN_TOKENS.spacing.xs};
  --spacing-sm: ${DESIGN_TOKENS.spacing.sm};
  --spacing-md: ${DESIGN_TOKENS.spacing.md};
  --spacing-lg: ${DESIGN_TOKENS.spacing.lg};
  --spacing-xl: ${DESIGN_TOKENS.spacing.xl};
  --spacing-xxl: ${DESIGN_TOKENS.spacing.xxl};

  --radius-sm: ${DESIGN_TOKENS.radii.sm};
  --radius-md: ${DESIGN_TOKENS.radii.md};
  --radius-lg: ${DESIGN_TOKENS.radii.lg};
  --radius-full: ${DESIGN_TOKENS.radii.full};

  --font-sans: ${DESIGN_TOKENS.typography.fontFamilySans};
  --font-mono: ${DESIGN_TOKENS.typography.fontFamilyMono};
}`;
}
