/**
 * District brand tokens — the single source of truth. Never hardcode colours outside this file
 * (globals.css mirrors these into Tailwind theme vars; keep the two in sync).
 *
 * Provenance
 *  - `verified`    : read from District's production web CSS (docs/DESIGN_LANGUAGE.md) or matched
 *                    against the App Store screenshots (public/brand/).
 *  - `provisional` : our choice pending exact sampling — swap freely.
 *
 * Direction (design pass, Sept 2026): purple-forward, premium, dark. The app screenshots show a
 * near-black, faintly violet ground, charcoal cards with hairline borders, District purple
 * (#6444e4 / #6d49fd) as the only strong hue, and coloured ambient glows (purple / yellow / pink)
 * per vertical. That is what the roles below encode.
 */

export const palette = {
  // Verified brand hues (district.in CSS)
  districtPurple: "#6444e4",
  districtPurpleSecondary: "#9988dc",
  districtPink: "#e13ff3",
  purple150: "#d5ccff",
  purple200: "#bcaefe",
  purple300: "#8972fe", // bright accent
  purple400: "#6d49fd", // primary button fill
  purple500: "#5631ed",
  purple600: "#401cce",
  purple700: "#371ba7",
  purple800: "#231268",
  // Verified semantic ramps
  green400: "#58e487",
  green900: "#042f12",
  ember300: "#f09275",
  ember800: "#57200f",
  yellow300: "#ebdf6f",
  yellow400: "#e8d954",
  yellow900: "#322a01",
  blue400: "#45a4f7",
  red400: "#fb4173",
  // Violet-tinted neutrals (provisional — read from app screenshots; web CSS uses neutral greys)
  ink0: "#0b0910",  // page ground behind the phone
  ink1: "#120e1b",  // app background
  ink2: "#1a1526",  // surface / card
  ink3: "#241d33",  // raised surface / chips
  ink4: "#2f2742",  // pressed / selection
  text: "#f5f2fa",
  text2: "#b3a7c7",
  text3: "#7f748f",
  text4: "#574d66",
  whiteAlpha6: "rgba(255,255,255,0.06)",
  whiteAlpha10: "rgba(255,255,255,0.10)",
  whiteAlpha16: "rgba(255,255,255,0.16)",
  whiteAlpha24: "rgba(255,255,255,0.24)",
  blackAlpha64: "rgba(0,0,0,0.64)",
} as const;

/** Semantic roles for the (only) theme — dark. */
export const dark = {
  ground: palette.ink0,
  background: palette.ink1,
  surface: palette.ink2,
  surface2: palette.ink3,
  surfaceSelection: palette.ink4,
  borderSubtle: palette.whiteAlpha6,
  borderModerate: palette.whiteAlpha10,
  borderIntense: palette.whiteAlpha24,
  textPrimary: palette.text,
  textSecondary: palette.text2,
  textTertiary: palette.text3,
  textDisabled: palette.text4,
  brand: palette.districtPurple,
  brandButton: palette.purple400,
  accent: palette.purple300,
  accentSoft: palette.purple200,
  pink: palette.districtPink,
  success: palette.green400,
  successSurface: palette.green900,
  error: palette.ember300,
  errorSurface: palette.ember800,
  warning: palette.yellow300,
  warningSurface: palette.yellow900,
  overlay: palette.blackAlpha64,
  verticalMovie: palette.blue400,
  verticalEvent: palette.yellow400,
  verticalDining: palette.red400,
  verticalActivities: palette.ember300,
  /** Ambient glows (screenshot phones each sit in a coloured halo) */
  glowPurple: "rgba(100,68,228,0.45)",
  glowPink: "rgba(225,63,243,0.35)",
  glowYellow: "rgba(232,217,84,0.30)",
  /** Primary CTA shadow */
  ctaGlow: "0 10px 30px -10px rgba(109,73,253,0.65), 0 2px 8px -2px rgba(109,73,253,0.35)",
} as const;

export const radius = { xs: "6px", sm: "10px", md: "14px", lg: "18px", xl: "24px", pill: "9999px" } as const;

export const font = {
  /** Be Vietnam Pro is District's verified UI face (web CSS). Headlines use it tight and semibold. */
  sans: '"Be Vietnam Pro", ui-sans-serif, system-ui, -apple-system, sans-serif',
  weight: { regular: 400, medium: 500, semibold: 600, bold: 700 },
} as const;

/** One motion system. Fast, ease-out, spring only for tactile moments. Reduced motion → none. */
export const motion = {
  duration: { fast: 0.15, base: 0.22, slow: 0.3 },
  ease: { out: [0.16, 1, 0.3, 1] as [number, number, number, number], inOut: [0.65, 0, 0.35, 1] as [number, number, number, number] },
  spring: {
    snappy: { type: "spring" as const, stiffness: 520, damping: 32, mass: 0.8 },
    soft: { type: "spring" as const, stiffness: 260, damping: 26, mass: 1 },
  },
  stagger: 0.045,
} as const;

export const layout = { maxWidth: "430px", tabBarHeight: "64px" } as const;

export const tokens = { palette, dark, radius, font, motion, layout } as const;
export type Tokens = typeof tokens;
