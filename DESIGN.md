# Design

Visual system for the **public** whistleblowing surface (Whistlevault). App register:
design serves the task. Calm, institutional, modern-technological. Self-hosted assets only
(no third-party CDN, Tor-friendly).

## Theme

Light, institutional, high-contrast. Navy ink on near-white, one blue accent for action and
state. A second cool-neutral surface layer for panels and the footer band. No dark "cyber"
theme, no gradients-as-decoration. The palette is committed (project brand); execution is
where the quality lives.

## Color

OKLCH-reasoned, shipped as hex to match the existing token contract. Semantic tokens; never
raw hex in components.

| Token | Value | Role |
|---|---|---|
| `--color-primary` | `#0F172A` | navy ink, headings, header/footer band |
| `--color-primary-700` | `#1E293B` | raised navy surface |
| `--color-on-primary` | `#FFFFFF` | text on navy |
| `--color-accent` | `#0369A1` | primary action, links, current state (tenant-overridable) |
| `--color-accent-strong` | `#075985` | accent hover/active |
| `--color-accent-tint` | `#EAF3F9` | accent wash for info surfaces |
| `--color-bg` | `#F6F8FB` | page background (cool near-white) |
| `--color-surface` | `#FFFFFF` | cards, inputs |
| `--color-surface-2` | `#F0F4F8` | panels, sidebars, subtle fills |
| `--color-fg` | `#0B1220` | body text (≥ 7:1 on bg) |
| `--color-muted-fg` | `#51607A` | secondary text (≥ 4.5:1) |
| `--color-border` | `#DCE3EC` | hairlines |
| `--color-border-strong` | `#C2CCDA` | input borders, focus-adjacent |
| `--color-danger` | `#C4291C` | error |
| `--color-success` | `#15803D` | success/confirmation |
| `--color-warning` | `#B45309` | caution |

Strategy: **Restrained** (tinted cool neutrals + one accent ≤ 10% of surface). Navy carries
the header/footer bands (Committed moments), not the whole page.

## Typography

Self-hosted, `font-display: swap`. Within the 3-family cap; one super-family for cohesion.

- **IBM Plex Sans** — everything: headings, UI, body, labels, buttons. Institutional-tech,
  highly legible, not the Inter/SaaS default. Weights 400 / 500 / 600 / 700.
- **IBM Plex Mono** — receipt codes, identifiers, tabular data. Weights 400 / 600.

Fixed rem scale (product register), ratio ~1.2 with deliberate jumps for hierarchy:

`12 · 14 · 16(base) · 18 · 21 · 26 · 33 · 42`px → `.75 / .875 / 1 / 1.125 / 1.3125 / 1.625 / 2.0625 / 2.625 rem`.

- Body 16px / line-height 1.6, prose capped 68ch.
- Headings: weight 600–700, `letter-spacing -0.01em` to `-0.02em`, `text-wrap: balance`.
- Mono for the receipt: large, letter-spaced, tabular.
- No all-caps body. Short uppercase labels only (≤ 3 words), tracked +0.06em.

## Components

Every interactive element ships default / hover / focus-visible / active / disabled (+ loading
where async). One vocabulary across all pages.

- **Buttons**: `.btn` (44px min, radius-md). `.btn-primary` solid accent; `.btn-secondary`
  surface + border; `.btn-ghost` text. One primary CTA per view.
- **Inputs**: 1px `border-strong`, radius-md, 12–14px padding, accent focus ring (3px, offset).
  Visible labels, `.hint` helper below, `.req` asterisk, `aria-live` error text under field.
- **Surfaces**: `.panel` (surface, hairline border, soft shadow) replaces the old `.card`.
  Cards used only when truly the right affordance; never nested.
- **Notice / callout**: full hairline border + tinted fill + leading icon. **No side-stripe
  borders** (banned). Variants: info (accent), warn (warning), ok (success).
- **Stepper**: pill row with active/done states; current step accent-filled.
- **Thread message**: reporter vs handler distinguished by alignment + label + fill, not color
  alone.
- **Trust strip**: inline row of guarantees (encryption / anonymity / legal basis) separated by
  hairlines, each with a stroke icon. Not an identical-card grid.

## Layout

- Header: sticky, navy band, wordmark + language select. Footer: navy band, legal + compliance.
- Landing: full-bleed sections (hero, trust, how-it-works, legal) on a centered `--maxw-wide`
  (1080px) shell. Forms: narrow `--maxw` (760px) reading column.
- Spacing: 4px base scale (4 8 12 16 24 32 48 64 96). Section rhythm 64–96px on desktop.
- Responsive is structural: hero stacks, trust strip wraps, stepper wraps. Mobile-first,
  breakpoints 480 / 768 / 1024.
- z-index scale: base 0, sticky 100, dropdown 200, modal 1000, toast 1100.

## Effects

- Shadows: `--shadow-sm` (hairline lift), `--shadow-md` (panels), `--shadow-lg` (raised). Cool
  navy-tinted, low alpha. Consistent elevation scale, no random values.
- Radius: `--radius-sm 8` / `--radius-md 12` / `--radius-lg 16` / pill 999.
- Icons: inline SVG, stroke 1.75, currentColor. No emoji, one icon family.

## Motion

150–250ms, `ease-out` (quart). State only: hover, focus, press, async feedback, and a single
restrained hero/trust entrance (fade + 8px rise, staggered 40ms). Every animation has a
`prefers-reduced-motion: reduce` fallback (instant / crossfade). No orchestrated page loads on
the form surfaces.

## Accessibility

WCAG 2.1 AAA target. Focus rings 3px accent + 2px offset, never removed. Contrast verified for
every text/bg pair. Color never the sole signal. Keyboard-complete. `aria-live="polite"` on
async errors. Honors reduced motion and 200% zoom.
