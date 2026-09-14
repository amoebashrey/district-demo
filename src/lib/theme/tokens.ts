/**
 * District brand tokens — single source of truth for the component kit.
 *
 * Values marked `verified` were read from District's production web CSS on 2026-09-14
 * (see docs/DESIGN_LANGUAGE.md and docs/district-web-css-tokens-extracted.txt).
 * Values marked `provisional` are our substitutions/guesses; swap once confirmed from app screenshots.
 *
 * Swap any value here and the whole UI follows (globals.css maps these into Tailwind v4 theme vars).
 */

export const palette = {
  // Neutral ramp (verified)
  grey50: "#f7f7f7",
  grey100: "#f1f1f2",
  grey150: "#cfcfd3",
  grey200: "#bfbfc4",
  grey250: "#a5a5ac",
  grey300: "#8b8b93",
  grey400: "#77777e",
  grey500: "#545459",
  grey600: "#3b3b3f",
  grey700: "#2c2c2e",
  grey800: "#1e1e20",
  grey900: "#131316",

  // Brand (verified)
  districtPurple: "#6444e4",
  districtPurpleSecondary: "#9988dc",
  districtPink: "#e13ff3",
  purple400: "#6d49fd", // button-brand-background
  purple500: "#5631ed",
  purple600: "#401cce",
  purple200: "#bcaefe",
  purple150: "#d5ccff",
  purple700: "#371ba7",

  // Semantic ramps (verified)
  green400: "#58e487",
  green700: "#158e3e",
  green900: "#042f12",
  ember300: "#f09275",
  ember400: "#e96f49",
  ember800: "#57200f",
  yellow300: "#ebdf6f",
  yellow400: "#e8d954",
  yellow900: "#322a01",
  blue400: "#45a4f7",
  red400: "#fb4173",
  pink400: "#f449d1",

  whiteAlpha8: "rgba(255,255,255,0.08)",
  whiteAlpha16: "rgba(255,255,255,0.16)",
  whiteAlpha24: "rgba(255,255,255,0.24)",
  whiteAlpha48: "rgba(255,255,255,0.48)",
  whiteAlpha64: "rgba(255,255,255,0.64)",
  blackAlpha40: "rgba(0,0,0,0.40)",
  blackAlpha64: "rgba(0,0,0,0.64)",
} as const;

/** Dark theme semantic roles (District's dark mode mapping, verified). */
export const dark = {
  background: palette.grey900,
  backgroundSecondary: palette.grey800,
  surface: palette.grey800,
  surfaceSecondary: palette.grey700,
  surfaceSelection: palette.whiteAlpha8,
  borderSubtle: palette.whiteAlpha8,
  borderModerate: palette.whiteAlpha16,
  borderIntense: palette.whiteAlpha24,
  textPrimary: palette.grey50,
  textSecondary: palette.grey250,
  textTertiary: palette.grey400,
  textDisabled: palette.grey500,
  textBrand: palette.districtPurple,
  textOffer: palette.purple200,
  textSuccess: palette.green400,
  textError: palette.ember300,
  textWarning: palette.yellow300,
  iconPrimary: palette.grey50,
  iconSecondary: palette.grey150,
  iconTertiary: palette.grey300,
  brand: palette.districtPurple,
  brandButton: palette.purple400,
  brandButtonLabel: palette.grey50,
  offerGradientStart: palette.purple600,
  offerGradientEnd: palette.purple400,
  surfaceSuccess: palette.green900,
  surfaceError: palette.ember800,
  surfaceWarning: palette.yellow900,
  surfaceAccentPurple: palette.purple700,
  overlay: palette.blackAlpha64,
  // "vertical" (category) accents
  verticalMovie: palette.blue400,
  verticalEvent: palette.yellow400,
  verticalDining: palette.red400,
  verticalActivities: palette.ember400,
} as const;

export const radius = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px", // most common card radius (verified)
  xl: "24px",
  pill: "9999px",
} as const;

export const space = {
  4: "4px", 8: "8px", 12: "12px", 16: "16px", 20: "20px", 24: "24px",
  32: "32px", 40: "40px", 48: "48px", 56: "56px", 64: "64px",
} as const;

/**
 * Type. District ships Be Vietnam Pro (UI) + Passenger Serif (display).
 * Passenger Serif is a commercial face; Instrument Serif is our provisional stand-in.
 */
export const font = {
  sans: '"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif', // verified family
  serif: '"Instrument Serif", "Passenger Serif", Georgia, serif', // provisional substitute
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
} as const;

/** Verified type scale: [size, lineHeight, weight, letterSpacing]. */
export const typeScale = {
  display1: ["64px", "72px", 700, "-3.2px"],
  display2: ["48px", "56px", 700, "-1.92px"],
  display3: ["32px", "42px", 600, "-1.44px"],
  heading1: ["32px", "40px", 700, "-0.96px"],
  heading2: ["28px", "34px", 700, "-0.84px"],
  heading3: ["24px", "30px", 700, "-0.48px"],
  heading4: ["18px", "24px", 400, "-0.48px"],
  title1: ["22px", "28px", 600, "-0.44px"],
  body1: ["16px", "24px", 400, "0"],
  body2: ["14px", "22px", 400, "0"],
  button1: ["16px", "20px", 600, "0"],
  button2: ["14px", "20px", 600, "0"],
  button3: ["12px", "18px", 600, "0"],
  caption: ["12px", "16px", 400, "0"],
} as const;

/** Motion — provisional until confirmed from app captures. */
export const motion = {
  fast: "150ms",
  base: "220ms",
  slow: "360ms",
  ease: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** Phone-width shell for the prototype (mobile-first web app). */
export const layout = {
  maxWidth: "430px",
  safeBottom: "env(safe-area-inset-bottom, 0px)",
  tabBarHeight: "64px",
} as const;

export const tokens = { palette, dark, radius, space, font, typeScale, motion, layout } as const;
export type Tokens = typeof tokens;
