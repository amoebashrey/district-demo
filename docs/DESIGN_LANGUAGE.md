# District design language — extracted from production web CSS (2026-09-14)

Source: `https://www.district.in/` → `cdn.district.in/district-web/_next/static/chunks/*.css`.
Raw variable dump: `district-web-css-tokens-extracted.txt` (623 custom properties).
This is the web app's design system ("dds-" prefixed utilities). The native app uses the same
tokens per the class names; exact app-only values (motion curves, tab bar) still need screenshot confirmation.

## What the PRD assumed vs what District actually ships
| PRD provisional (6.6) | District actual | Note |
|---|---|---|
| Accent magenta `#FF3D77` | Brand purple `#6444e4` (`--color-brand-district-purple`), button fill `#6d49fd` | Purple is the brand. Pink `#e13ff3` exists as `--color-brand-district-pink` (secondary). |
| Background `#141019` | `#131316` (grey-900) | Near-identical, slightly less violet. |
| Surface `#221A2B` | `#1e1e20` (grey-800), secondary `#2c2c2e` (grey-700) | Neutral greys, not tinted. |
| Line `#372C43` | `rgba(255,255,255,.08)` (white-alpha-8) | Hairlines are alpha, not solid. |
| Success `#33D4A0` | `#58e487` (green-400) | |
| Text `#F6EEF4` / muted `#B7A9BC` | `#f7f7f7` (grey-50) / `#a5a5ac` (grey-250) / `#77777e` (grey-400) | |
| "Bold sans display" | **Be Vietnam Pro** (body/UI) + **Passenger Serif** (display headlines) | Passenger Serif is commercial; we substitute Instrument Serif (Google) and flag it. |
| Radius 14–18 | 12 / 16 / 24 px most common; pills 9999 | |

## Type scale (verbatim)
display1 64/72 bold -3.2 · display2 48/56 bold · display3 32/42 semibold · heading1 32/40 bold · heading2 28/34 bold ·
heading3 24/30 bold · heading4 18/24 regular · title1 22/28 semibold · body1 16/24 · body2 14/22 · button1 16/20 semibold · button2 14/20 semibold · button3 12/18 semibold.

## Category ("vertical") accent colours
movie → blue-400 `#45a4f7` · event → yellow-400 `#e8d954` · dining → red-400 `#fb4173` · activities → ember-400 `#e96f49`.

## Nav (web)
For you · Dining · Movies · Events · Comedy (+ Sports, Concerts, Nightlife, Theatre). Search placeholder: "Search for events, movies and restaurants".

## Still provisional (confirm from app screenshots)
Motion timing/easing, bottom tab bar iconography, exact card shadow on dark, the "Ask AI" sheet styling.

## Design pass (2026-09-15) — decisions vs the provisional brief
| Brief proposed | Shipped in tokens.ts | Why |
|---|---|---|
| primary `#7C3AED`, accent `#A855F7` | `#6444e4` brand / `#6d49fd` button / `#8972fe` accent | District's verified purples (web CSS + App Store screenshots' banner/toggle). |
| bg `#130D1F`, surface `#1C1330`, surface-2 `#261A3D`, line `#352748` | `#120e1b` / `#1a1526` / `#241d33` / white-alpha hairlines | Screenshots read near-black with a faint violet cast and alpha hairlines, not solid violet lines. |
| text `#F4EEFB`, muted `#B3A6C7` | `#f5f2fa` / `#b3a7c7` / `#7f748f` | Kept, plus a tertiary. |
| success `#33D4A0` | `#58e487` | District's green-400. |
| Hanken Grotesk / General Sans | **Be Vietnam Pro** | Verified from production CSS; screenshots' geometric grotesk matches. Serif dropped — the app uses none. |
| radius 16–18 | 18 cards / 14 buttons / pills | |
| purple CTA glow | `--cta-glow` token | Screenshots frame each phone in a coloured halo → `.ambient` top glow + CTA glow. |

Motion system: `src/components/motion.tsx`. Enter = fade + 12px rise, 220ms ease-out `[0.16,1,0.3,1]`; press = spring (520/32);
state swaps = blur cross-fade 150ms; lock = glow burst + check draw, once per plan. `MotionConfig reducedMotion="user"` +
a CSS `prefers-reduced-motion` guard disable everything for users who ask.
