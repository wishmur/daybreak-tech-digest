---
name: Daybreak
description: An operate-first triage board for daily AI/tech news, not a branded reading page.
colors:
  paper: "#fcfcfa"
  inset: "#f2f2ee"
  sunk: "#e8e8e2"
  ink: "#14161a"
  ink-2: "#4a5057"
  ink-3: "#6b7178"
  rule: "#e2e2dc"
  rule-2: "#c7c7bf"
  signal: "#c22f16"
  signal-ink: "#a32c15"
  signal-wash: "#fce9e5"
  lane: "#2f5fb8"
  lane-ink: "#234a92"
  lane-wash: "#e8eefb"
typography:
  display:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem (text-display, 40px)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.014em"
  headline:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.4375rem (text-head, 23px)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.4375rem–1.875rem (text-head/text-head-lg, 23–30px)"
    fontWeight: 700
    lineHeight: 1.16
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem (text-body, 16px)"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem (text-meta, 13px)"
    fontWeight: 500
    letterSpacing: "0.01em"
  label-strong:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem (text-meta, 13px)"
    fontWeight: 700
    letterSpacing: "0.04em"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem (text-micro, 12px)"
rounded:
  none: "0px"
  control: "3px"
  surface: "4px"
  pill: "999px"
spacing:
  xs: "0.375rem"
  sm: "0.625rem"
  md: "1.25rem"
  lg: "2rem"
components:
  ctl-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.3125rem 0.625rem"
  ctl-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.3125rem 0.625rem"
  field-default:
    backgroundColor: "{colors.inset}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.3125rem 0.625rem"
  field-active:
    backgroundColor: "{colors.lane-wash}"
    textColor: "{colors.lane-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.3125rem 0.625rem"
  surface-menu:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "0.5rem 0.75rem"
---

# Design System: Daybreak

## Overview

**Creative North Star: "The Strip Board"**

Daybreak triages today's AI/tech news the way an operations board triages anything under active management: priority lanes, status colour, a compact status readout, and a working surface sized to use the room it has — not a page that hides the board behind a masthead. The system is abstracted deliberately per an explicit steer against theatricality: there is no literal aviation texture, iconography, or motif anywhere in the build. What survived the abstraction is the *discipline* underneath the metaphor — a Lead lane and a secondary lane, two functional accent colours reserved for status/priority, a flat colour-field band that does real grouping work, and distinct control chrome per control role — not the metaphor's surface dressing.

The palette is bright near-white (`#fcfcfa`), not the grey chart-paper or warm cream this category defaults to — it reads as a tool lit for desk work, not a printed page. Two functional accents carry meaning: signal red for importance/must-read/active-state, and a second blue "lane" tone for the secondary-priority lane and for filter-active chrome. Everything else is ink and structural neutrals. One grotesk family, Hanken Grotesk, carries both display and UI type — a deliberate rejection of the prior build's three-typeface, editorial-versus-UI split — because a tool should read as one voice throughout, not a masthead layered over a UI kit. JetBrains Mono is reserved strictly for data that needs to line up in a column.

The board uses the full canvas: a 12-column desktop grid puts a control rail, the story lanes, and a companies-in-range panel in view together, collapsing to one column with a bottom filter sheet on mobile. Structure comes from two devices working together — hairline rules between rows, and flat `.band` colour fields for section headers — rather than either device alone. The system carries one confirmed defect forward rather than concealing it: the TopBar's two-row layout (wordmark+status on row one, full-width nav on row two) exists because a single combined row crushed nav labels to a single letter at mobile widths under real content pressure; it is documented here as the working pattern that fixed a real bug, not retconned as an aesthetic choice.

**Key Characteristics:**
- Bright near-white ground (`#fcfcfa`), near-black ink, two functional accents (signal red, lane blue), each reserved for one job
- One grotesk voice (Hanken Grotesk) for display and UI; JetBrains Mono reserved for tabular data only
- A full-width, real multi-column desktop board (control rail | story lanes | companies panel) instead of a centered reading column
- Distinct control chrome per role — press-button, segmented control, filled dropdown field, toggle switch, search field — never one button shape standing in for five behaviors
- Flat colour-field `.band` headers plus hairline rules as the two structural devices, replacing colored-border-left cards
- Small filled-square `.chip` markers (never a colored left-border) mark lane and status meaning

## Colors

A bright, near-white board with two reserved functional accents and no decorative color.

### Primary
- **Signal** (`#c22f16`, ~5.3:1 on paper, AA): Importance-5 / "must-read" marking, the "Lead" lane chip, the active state of the `.toggle` switch, the focus ring, and text selection. Reused in charts as the sole warm series/point for the importance signal. Nothing else wears this color.
- **Signal Ink** (`#a32c15`): Deepened signal red for the one status-bar warning line ("No new brief for N days...").
- **Signal Wash** (`#fce9e5`): Pale signal tint, used only for `::selection`.

### Secondary
- **Lane** (`#2f5fb8`, ~5.4:1 on paper, AA): The secondary-priority lane's "Also in the brief" chip, the active/filled state of `.field` dropdowns, active-filter chip fill, and the checkbox accent inside open multi-select menus. Marks "developing, filtered-on" status the way Signal marks "must-read, active" status — a second, distinct semantic role, not a lighter version of Signal.
- **Lane Ink** (`#234a92`): Deepened lane blue for active-filter chip text and the company-panel active state.
- **Lane Wash** (`#e8eefb`): Pale lane tint, the fill behind active dropdown fields, active-filter chips, and the selected row in the companies panel.

### Neutral
- **Paper** (`#fcfcfa`): Page background. Bright near-white, not grey and not cream.
- **Inset** (`#f2f2ee`): Hover surface for rows/controls, `.band` section-header fill, filled-field resting background, loading skeleton blocks.
- **Sunk** (`#e8e8e2`): Deepest neutral step; unfilled importance-meter segments, hover state of filled fields, loading skeletons.
- **Ink** (`#14161a`, ~17.7:1 on paper): Primary text, headline color, active-control fill/text, chart single-series default.
- **Ink-2** (`#4a5057`, ~7.7:1 on paper, AAA body): Body copy, control default text, metadata company name, chart tooltip labels.
- **Ink-3** (`#6b7178`, ~4.9:1 on paper, AA floor): Labels, meta text, inactive nav, placeholder text, chart axis ticks. The contrast floor for text — never `rule-2`.
- **Rule** (`#e2e2dc`): Primary hairline divider between story rows, sections, status-bar/nav borders, tag separators, chart gridlines.
- **Rule-2** (`#c7c7bf`): Stronger hairline for control borders (`.ctl`, `.seg`), the mobile filter-sheet edge. Border use only, never text.

### Named Rules
**The Two-Signal Rule.** Signal red and Lane blue each carry exactly one status meaning — importance/must-read/active-state for Signal, secondary-priority/filter-active for Lane — and never swap jobs or double as decoration. A third accent, or either color appearing outside these roles, dilutes the coding a status board depends on.

**The Chip-Not-Border Rule.** Lane and status meaning is marked with a small filled-square `.chip` marker plus label, never a colored left-border on a row or card. A colored-border-left device is the one thing this system explicitly does not use to encode priority.

## Typography

**Display Font:** Hanken Grotesk (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Hanken Grotesk (with ui-sans-serif, system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, SFMono-Regular, monospace)

**Character:** One grotesk family across every role — display, headline, body, and label all resolve to Hanken Grotesk at different weights and sizes, so the product reads as a single, consistent tool voice rather than an editorial face layered over a UI kit. JetBrains Mono is held back strictly for real tabular data: counts, timestamps, source lines, chart axis ticks — never decoration and never a second "brand" face.

### Hierarchy
- **Display** (700, `text-display`/40px, line-height 1.15, `-0.014em`): Reserved for the largest headings the base stylesheet defines (h1–h4 share this family/weight/tracking rule); in practice the wordmark and overview-band day heading sit at `text-head` (23px), not the full display size — there is no oversized hero treatment in this build.
- **Headline** (800, `text-head`/23px, `-0.01em`): The overview-band day heading ("Today"/date) and the TopBar wordmark.
- **Title / Lead story** (700, `text-head-lg`/30px, line-height 1.16): Headline of a Lead-lane (importance ≥5) story row.
- **Title / Standard story** (700, `text-head`/23px, line-height 1.16): Headline of a secondary-lane story row; also empty-state and dialog headings.
- **Body** (400, `text-body`/16px, line-height 1.5, `measure` cap 68ch): Story summaries and running prose.
- **Label** (500, `text-meta`/13px, `0.01em` tracking): Control text, metadata (company/topic/momentum), dropdown field labels.
- **Label Strong** (700, `text-meta`/13px, `0.04em` tracking, uppercase): Section headers inside `.band` fills ("Lead," "Also in the brief," "Companies in range," "Range," "Narrow," "Strongest pairs").
- **Data** (400, `text-micro`/12px, tabular nums, mono): Source, dates, tag chips, story counts, timestamps, chart axis ticks — anything meant to line up in a column. This is the type-scale floor; nothing ships smaller.

### Named Rules
**The One Voice Rule.** Display and UI type are the same family (Hanken Grotesk) at different weights, not two typefaces standing in for "editorial" versus "product." A new surface should never reach for a second display face.

**The Real-Jump Rule.** Type-scale steps differ by meaningful amounts (12/13/16/19/23/30/40px), never a near-invisible 1–2px increment.

## Layout

A full-width working board, not a centered reading column: the frame is `max-w-[100rem]` with `px-5`/`sm:px-8` gutters across the digest, Companies, Matrix, Trends, and Archive views — only How It Works keeps a narrower `max-w-[65rem]` reading column, because its job is long-form reading rather than board-scanning.

The digest view is a 12-column desktop grid below the overview band: a control rail (`lg:col-span-3 xl:col-span-2`), the story lanes (`lg:col-span-6 xl:col-span-7`), and a companies-in-range panel (`lg:col-span-3`), all visible together at `lg` and above. Below `lg` this collapses to a single column: the control rail becomes a "Filters" trigger plus inline search, opening a bottom `FilterSheet` that stacks controls vertically and locks body scroll while open; the companies panel drops entirely rather than being squeezed into the flow.

The overview band that opens the page is a compact status readout — a day heading, one summary line, a signal-stats sentence, and two page actions — never a hero. Below it, stories group by pipeline day; a day containing at least one importance-5 story splits into two `.band`-headed lanes ("Lead" and "Also in the brief"); a day with no 5s renders as one flat lane. Pagination holds 12 items per page without breaking a day group mid-list.

The TopBar is two compact rows rather than one combined row or a stacked three-section masthead: row one holds the wordmark and live status (last-run time, archived count, "How it works" link) with room to breathe; row two is section nav at full width. This split exists because a single-row layout crushed nav labels under mobile width pressure — the working pattern to carry forward, not a stacked-masthead aesthetic choice.

The filter rail groups controls by role in a fixed vertical order — Range (segmented control), Narrow (stacked dropdown fields for company/topic/source/tag), a High-signal toggle, then Search — never one undifferentiated run of identical buttons. The Matrix (co-occurrence) view puts a "Strongest pairs" ranked list beside the matrix table on wide screens (`lg:flex-row`), using the freed board width rather than stranding the list mobile-only and leaving the matrix isolated in empty space on desktop.

## Elevation & Depth

Flat by default. Structure comes from two devices working together — hairline `rule` dividers between rows/sections, and flat `.band` colour-field fills for section headers — not shadows or cards. The one shadow in the system is a tight, tinted shadow reserved for genuinely floating surfaces: dropdown/multi-select popovers and chart tooltips (`.surface`), paired with a `rule-2` border.

### Shadow Vocabulary
- **Menu surface** (`box-shadow: 0 6px 16px -8px rgb(20 22 26 / 0.24)`): Dropdown/multi-select popovers (`MultiSelect`) and Recharts tooltips. Paired with a `rule-2` border and 4px radius.

### Named Rules
**The Flat-By-Default Rule.** Story rows, the overview band, and the control rail carry zero shadow. Only a surface that overlaps content it floats above — a popover or tooltip — earns the one shadow token.

## Shapes

Mostly square with small, consistent softening at the control layer: buttons, fields, and menu surfaces carry a 3–4px radius (`rounded-control`/`rounded-surface`) rather than either sharp rectangles or rounded pills — the one exception is the `.toggle` switch, which is a true pill (999px) because it is a binary physical affordance, not a press-button. Borders are 1px hairlines in `rule` or `rule-2`. The chip/lane marker is a small filled square (2px radius), never a circular dot or a colored border-left. The co-occurrence matrix encodes density as ink opacity on square cells rather than a hue ramp — "one colour, varying presence," consistent with the two-signal discipline elsewhere.

## Components

### Buttons / Controls
Four distinct control types share the board, deliberately not one shape standing in for every role:
- **`.ctl` (press-button):** Flat paper background, `rule-2` border, 3px radius. Default: `ink-2` text. Hover: border to `ink-3`, text to `ink`. Active (`data-active="true"`): filled `ink` background, `paper` text. Disabled: 40% opacity, `not-allowed` cursor. Used for filters trigger, pagination, "Copy brief," "mark all read," dialog actions.
- **`.seg` / `.seg-grid` (segmented control):** A single connected strip (or, on a narrow rail, a 2-column grid — `.seg-grid` — so a 4-way choice doesn't wrap its own labels mid-word) for closed, mutually-exclusive choices like date range. Active segment: filled `ink` background, `paper` text.
- **`.field` (filled dropdown):** Recessed `inset` background, no border at rest, 3px radius — reads as "choose from a list," distinct from a press-button. Active (has a selection): `lane-wash` fill, `lane` border, `lane-ink` text.
- **`.toggle` (switch):** A true pill affordance (2rem × 1.125rem track, sliding thumb), not a button with two label states. Active: `signal` fill.

### Chips
- **Lane/status chip (`.chip`):** A small filled 2px-radius square swatch in `currentColor` plus an uppercase 12px label — "Lead" (signal), "Also in the brief" (lane), "Must read." Never a colored left-border on the row it marks.
- **Active-filter chip:** Built on `.field` chrome (`lane-wash` background, `lane-ink` text) with a trailing drawn-SVG "×" (8×8px, `currentColor`, two 1.5px strokes) — no unicode glyph.

### Cards / Containers
No cards. Story rows are `<li>` items full-bleed within their column, separated by a bottom `rule` hairline, with hover/focus shown as an `inset` background wash. The one boxed container is the empty state (`border-rule`, `inset` background, 3px radius, centered text).

### Inputs / Fields
- **`.search-field`:** Recessed `inset` background, icon-prefixed (13px SVG magnifier), no border at rest; focus moves to `paper` background with a `rule-2` border.
- **`MultiSelect` dropdown:** `.field` trigger opens a `.surface` listbox (checkbox rows, `lane`-accented checkboxes, `inset` hover).
- **Focus:** The global focus-visible ring — 2px solid `signal` outline, 2px offset, 2px corner radius — applies to every interactive control regardless of its resting shape.

### Navigation (TopBar)
Two compact rows: row one is wordmark + live status (never contending with nav for width); row two is a horizontally-scrolling strip of section tabs ("Brief," "Companies," "Who appears together," "Trends," "Archive") with pill-style active state (filled `ink` background, `paper` text via the shared `tabOn`/`tabOff` classes) rather than an underline indicator. This two-row split is a fix for a real mobile bug — nav text was crushed to single letters when squeezed into one row with the wordmark and status — and is the pattern to reuse for any future top-level nav, not a stacked-masthead throwback.

### Story Row (signature component)
Importance meter (five ascending bars, 5–13px tall) leads the row, followed by a "Must read" `.chip` only at importance 5, then metadata (`company` bold, `topic`, momentum text) in `.label` style. The headline follows at `text-head` (or `text-head-lg` in the Lead lane) with a signal-colored underline on hover. A footer line separates provenance (source, optional date) from subject tags with a 1px vertical rule divider rather than punctuation, avoiding stranded interpuncts at line-wrap. Read stories dim to `ink-3` and append a "read" marker after the same rule divider.

### Importance Meter (signature component)
Five vertical bars of increasing height (5–13px), filled left-to-right: `ink-3` for 1–2, `ink` for 3–4, `signal` only at exactly 5. The sole encoding of importance — reused verbatim on the Companies view's "Avg importance" stat.

### Board Panels (signature component)
`.band` (flat `inset`-colored fill, 3px radius) headers group content sections without a bordered box — "Lead"/"Also in the brief" lane headers, "Companies in range," "Strongest pairs." This is the filter bar's and the companies panel's shared structural language: group by flat colour field, not by boxing each cluster.

### Charts (Companies / Matrix / Trends)
Recharts-based area, line, and bar charts drawing from the same token set as the rest of the board. Gridlines/axis lines are `rule`; axis ticks are 12px JetBrains Mono in `ink-3`; a single series defaults to `ink`; the importance-signal line/point is always `signal`; a multi-series chart adds a short, restrained run of additional tones after ink and signal (`lane`, then muted green/tan/grey — no rainbow, no violet, no cyan). Tooltips reuse the `.surface` menu treatment. **The SVG fills can't reliably read CSS custom properties across the export/print path, so `Analysis.tsx` hardcodes `INK`/`INK_2`/`INK_3`/`RULE`/`SIGNAL`/`LANE`/`SERIES` constants mirroring `--color-*` by hand near the top of the file — this hand-sync is a real, documented system rule, not a one-off shortcut, and any future token change must update both places.** The co-occurrence matrix encodes density by `ink` opacity on square cells rather than a hue ramp, with the selected pair outlined in `signal`; on wide screens a "Strongest pairs" ranked list sits beside the matrix (`.band`-headed), using the board's freed width rather than leaving the matrix isolated in empty space.

## Do's and Don'ts

### Do:
- **Do** reserve `signal` red for importance-5/must-read/active-state only, and `lane` blue for secondary-lane/filter-active state only — each accent keeps exactly one job.
- **Do** mark lane/status meaning with a small filled-square `.chip` plus label, never a colored left-border on a row or card.
- **Do** give each control role its own chrome — press-button (`.ctl`), segmented control (`.seg`/`.seg-grid`), filled dropdown field (`.field`), toggle switch (`.toggle`), search field — instead of reusing one button shape for every interaction.
- **Do** group sections with a flat `.band` colour field or a `rule` hairline, not a bordered/shadowed card.
- **Do** let a board surface use the full `max-w-[100rem]` frame; reserve the narrower `max-w-[65rem]` reading column for long-form pages like How It Works.
- **Do** keep the TopBar's two-row split (identity+status / full-width nav) on any new top-level nav — it fixed a real mobile label-crushing bug, not a stylistic preference.
- **Do** hand-sync any hardcoded chart color/font constant (`Analysis.tsx`'s `INK`/`SIGNAL`/`LANE`/`SERIES`) with `--color-*` whenever a token changes; SVG chart fills cannot read CSS custom properties reliably across export/print.
- **Do** draw interface icons (remove, chevron, search) as inline SVG using `currentColor`; never set an icon as a unicode text glyph.

### Don't:
- **Don't** introduce a colored left-border on a card or row to encode status or priority — that device was explicitly replaced by the `.chip` filled-square marker.
- **Don't** add literal aviation texture, iconography, or theming (strip-board graphics, radar/runway motifs, ATC-styled labels) anywhere in the interface — the metaphor was deliberately abstracted away per an explicit steer against theatricality; the shipped discipline is priority lanes and status colour, not decoration referencing the source metaphor.
- **Don't** reach for a second display typeface. Hanken Grotesk carries both display and UI roles; JetBrains Mono is for tabular data only.
- **Don't** use `rule-2` for text; it is border-only by design. Use `ink-3` as the contrast floor for text.
- **Don't** add a third functional accent color, or let `signal`/`lane` double as decoration or a general brand color.
- **Don't** collapse the desktop board back into a single centered reading column outside How It Works; the 12-column control-rail/lanes/panel grid is the system's spatial model for board-type views.

## Not canonized

The TopBar's pill-style active nav-tab treatment (filled `ink`/`paper`, no underline) is recorded as observed component behavior above, but is not elevated to a named system rule — it is one workable choice among the control vocabulary, not a doctrine future nav components must repeat exactly. No kicker/eyebrow, hard-offset shadow, glyph icon, or system-display-face pattern was found in this build to flag as a craft-floor defect; the system's own devices (chips, bands, hairlines) are the ones actually shipped and are canonized as such.
