---
name: Daybreak
description: A daily AI/tech brief that reads like a morning weather briefing, not a card dashboard.
colors:
  paper: "#f1f4f4"
  inset: "#e7ecec"
  sunk: "#dce3e3"
  ink: "#12171b"
  ink-2: "#46545a"
  ink-3: "#5f6d72"
  rule: "#d6dedf"
  rule-2: "#b7c2c3"
  signal: "#a83216"
  signal-ink: "#7a2410"
  signal-wash: "#f7eae5"
  chart-teal: "#5b7a8c"
  chart-olive: "#7a8c6b"
  chart-tan: "#8c7a5b"
  chart-slate: "#a3adaf"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 12vw, 5.5rem)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem (30px, sm: 2.5rem/40px)"
    fontWeight: 700
    lineHeight: 1.16
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.4375rem"
    fontWeight: 700
    lineHeight: 1.16
    letterSpacing: "-0.014em"
  body:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    letterSpacing: "0.01em"
  label-strong:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    letterSpacing: "0.04em"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.75rem"
components:
  control-default:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "0px"
    padding: "0.3125rem 0.5625rem"
  control-active:
    backgroundColor: "{colors.inset}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "0px"
    padding: "0.3125rem 0.5625rem"
  surface-menu:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "0px"
    padding: "0.25rem"
---

# Design System: Daybreak

## Overview

**Creative North Star: "The Synoptic Brief"**

Daybreak reads today's AI/tech news the way a weather service reads the atmosphere: conditions stated in plain language first, then the individual "station reports" (stories) that make up the picture. The build rejects the badge-and-card dashboard grid this category defaults to — there are no pill badges, no colored corner ribbons, no drop-shadowed cards stacked in a masonry feed. Structure comes from contour-rule dividers (hairline horizontal rules) and typographic weight, not boxes.

The palette is a cool, grey-blue chart-paper (`#f1f4f4`), explicitly chosen against the warm cream-and-serif "tasteful AI interface" look this category clusters around. One accent — a storm-warning red — exists for exactly one job: marking a must-read (importance 5) story. It never functions as a brand color, a hover state, or decoration; a five-segment importance meter (filled bars, not dots or badges) is the only place intensity is encoded, replacing an earlier build that showed importance three redundant ways at once.

The system is deliberately flat: no border-radius anywhere in the sampled components, no drop shadows except one restrained tinted shadow under floating menu surfaces, and a single light theme with no unfinished dark-mode scaffolding. A follow-up polish pass tightened the reading rhythm (a shrunk, baseline-aligned lede in place of an oversized hero heading, tighter row and section spacing throughout) and finished two loose ends: the Companies/Matrix/Trends charts, which had been left on an old pre-redesign palette and mono stack, are now built from the same tokens as everything else, and the last two unicode glyphs in the interface (a remove-chip "×", an archive-row "▾") were replaced with drawn SVG to match the rest of the icon vocabulary. **The token system, the rule-not-card structure, and every named rule below now apply consistently across the whole site — digest, Companies, Matrix (co-occurrence), Trends, Archive, and How It Works all read as one product**; this is a change from the prior pass, which covered only the digest view and shared chrome.

**Key Characteristics:**
- Chart-paper cool-grey ground, near-black ink, one red accent reserved for a single semantic meaning (must-read)
- Hairline rules substitute for card borders, badges, and shadows as the primary structural device
- Three-typeface system with a clear division of labor: Archivo (display/headlines), Public Sans (UI/body/labels), JetBrains Mono (data — times, counts, tabular numbers, and chart axes)
- Real jumps between type-scale steps; no two sizes sit within a few px of each other
- Flat controls: no rounded pills, no gradients, no shadows on buttons/chips
- A tightened, low-ceremony reading rhythm: the lede is scaled to a working heading, not a hero, so the story list starts within the first viewport

## Colors

A cool chart-paper palette with a single reserved warning-red accent; no secondary or tertiary accent exists. The Companies/Matrix/Trends charts, previously built on an unrelated warm-toned palette left over from the pre-redesign build, now draw from this same set.

### Primary
- **Storm Signal** (`#a83216`): The must-read marker. Fills the importance meter only when a story scores 5, labels it "Must read," and colors the focus ring and text selection highlight. In charts, it is the one warm line (Trends' "average importance" line, the sparkline's latest-point dot, a selected cell's outline in the co-occurrence matrix) — the same single-job discipline carried into data visualization. Nothing else in the interface uses it — not links, not active nav, not brand chrome.
- **Signal Ink** (`#7a2410`): Deepened signal red, used for the one small warning line in the status bar ("No new brief for N days...").
- **Signal Wash** (`#f7eae5`): Pale tint of the signal color, used only as the `::selection` background.

### Neutral
- **Chart Paper** (`#f1f4f4`): Page background. Cool grey-blue, not warm cream.
- **Inset** (`#e7ecec`): Hover/active surface for rows and controls (`data-active="true"`), and skeleton-loading blocks.
- **Sunk** (`#dce3e3`): Deepest neutral step; unfilled importance-meter segments and loading skeletons.
- **Ink** (`#12171b`, ~16.3:1 on paper): Primary text and headline color; also the default fill for single-series bar/column charts (mentions, importance).
- **Ink-2** (`#46545a`, ~7.1:1 on paper, AAA body): Body copy, deks, secondary control text, sparkline strokes.
- **Ink-3** (`#5f6d72`, ~4.8:1 on paper, AA floor): Labels, meta text, inactive nav, tertiary info, chart axis ticks. Never used for text needing higher contrast — the build has a code comment explicitly rejecting `rule-2` (a border color at 1.7:1) as text for exactly this reason.
- **Rule** (`#d6dedf`): The primary hairline divider — between story rows, filter strip, status bar, section boundaries, and chart gridlines/axis lines.
- **Rule-2** (`#b7c2c3`): A stronger hairline for borders that need more presence (menu surfaces, active-chip borders, bottom-sheet edge, filter-cluster dividers). Reserved for border use, not text.

### Chart Series
- **Chart Teal** (`#5b7a8c`), **Chart Olive** (`#7a8c6b`), **Chart Tan** (`#8c7a5b`), **Chart Slate** (`#a3adaf`): A four-step muted, cool-toned series palette used alongside Ink and Signal (in that order — ink and signal always lead) for the Trends "what the coverage is about" stacked area chart's tag series. Deliberately desaturated; no rainbow, no violet, no cyan, so a five-series chart still reads as part of the same restrained system rather than a generic charting-library default.

### Named Rules
**The One Job Rule.** Storm Signal red has exactly one meaning: importance 5 ("must-read"). It never doubles as a link color, an active-state color, or a decorative brand mark — if red starts showing up anywhere else, the signal has been diluted. This now extends to the chart surfaces: Signal is the sole warm note in any chart, reserved for the one series or point that is the importance signal.

**The Rule-Not-Card Rule.** Content groupings (story rows, day sections, the signal-stats line) are separated by a 1px `rule` divider, not a bordered/shadowed card. A card or badge introduced for a new surface breaks the system's own material logic.

## Typography

**Display Font:** Archivo (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Public Sans (with ui-sans-serif, system-ui, sans-serif)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, SFMono-Regular, monospace)

**Character:** A chart-grade grotesk (Archivo) for anything that needs to command attention — the masthead, story headlines — paired with a workhorse sans (Public Sans) built for dense reading in UI text, labels, and running body copy, plus a monospace reserved strictly for data that needs to line up in a column, now including chart axis labels. Archivo is also the CSS `body` font-family fallback, but visible body/UI copy is explicitly set to Public Sans; Archivo is functionally a display-only face in practice. Inter is deliberately absent — it's called out in the stylesheet as "the default face of every generated interface on the internet."

### Hierarchy
- **Display** (900, `clamp(2.75rem, 12vw, 5.5rem)`, line-height 0.92, `-0.03em` tracking): The "Daybreak" masthead wordmark only.
- **Headline** (700, `text-head-lg`/30px stepping up to `text-display`/40px at `sm:`, line-height 1.16, `-0.01em`): The "Today's Outlook" lede heading. As of this pass it is a working heading set on the same baseline row as the date, not an oversized hero — it was scaled down from a `clamp(2.75rem, 7vw, 4.75rem)` display-scale treatment specifically so the story list is reached sooner. It shares its size steps with the Title tier rather than owning a unique clamp value; what makes it "Headline" is its role (the one per-page-load statement) and its baseline pairing with the date, not a bigger number.
- **Title / Lead story** (700, 30px / `text-head-lg`, line-height 1.16): Headline of a lead (importance ≥5 group) story row.
- **Title / Standard story** (700, 23px / `text-head`, line-height 1.16): Headline of a non-lead story row; also used for empty-state titles and dialog headings.
- **Body / Lede** (400, 19px / `text-lede`, line-height 1.5–1.55): The masthead tagline. No longer the size of the day's summary paragraph (see Body, below) — that dropped a step this pass.
- **Body** (400, 16px / `text-body`, line-height 1.5, `measure` cap of 68ch): Story summaries, running prose, and — as of this pass — the day's one-sentence conditions summary (the `.dek`), which was reduced from 19px so it reads as scannable brief prose rather than a second display line. Paragraphs use old-style figures (`font-variant-numeric: oldstyle-nums`) for better in-line number reading.
- **Label** (500, 13px / `text-meta`, `0.01em` tracking): Story metadata (company, topic, momentum note), control labels.
- **Label Strong** (600, 13px, `0.04em` tracking, uppercase): Section headers ("Lead," "Also in the brief," day headings), the "Must read" tag.
- **Data** (400, 12px / `text-micro`, tabular nums, mono): Source attribution, dates, tag chips, story counts, timestamps, chart axis ticks — anything meant to line up in a column.

### Named Rules
**The No-Eyebrow Rule.** Headings carry their own weight; nothing rides above a headline as a kicker/eyebrow line. "Today's Outlook" and story headlines stand alone — a label only appears when it says something the heading itself doesn't (e.g., "Must read" beside the importance meter, not above the title).

**The Real-Jump Rule.** Type-scale steps differ by meaningful amounts (12/13/16/19/23/30/40px), never by a near-invisible 1–2px increment.

**The Dek Rule.** The day's opening summary is set as an editorial dek: plain `text-body` (16px) with only its first line weighted up via CSS `::first-line` (`.dek`, 600 weight, full `ink`), not markup-driven bolding or truncation. One paragraph gets exactly one weighted lead-in; nothing else in running prose uses `::first-line`.

## Layout

Single-column, centrally-constrained reading layout: a `max-w-5xl` container with `px-5`/`sm:px-8` gutters holds the masthead, lede, filter strip, and story list. Prose elements (lede paragraph, story summaries, empty-state body) are additionally capped at a 68ch measure (`.measure`) inside that container, so the container is wider than the comfortable reading line — the container sets rhythm, the measure sets legibility.

The page stacks vertically: sticky status bar → masthead → view tabs → lede band → sticky filter strip (offset below the status bar) → story list, grouped by pipeline day and paginated 12 items at a time without breaking a day group mid-list. This pass tightened the vertical rhythm end to end: the lede band now opens at `pt-6`/`sm:pt-8` instead of a larger top gap, the heading sits on one baseline row with the date instead of stacking above it, and the filter strip sits `mt-5` below rather than further down — the combined effect is that the story list starts noticeably sooner on first load, which matters for a page meant to be read once a day in under a minute. Within a day group with at least one importance-5 story, the list splits into two labeled sub-lists — "Lead" and "Also in the brief" — rather than a separate visual hierarchy; a day with no 5s renders as a single flat list.

Filter controls run inline in a horizontal strip at `md` and above; below `md` they collapse to a "Filters" trigger plus inline search, opening a bottom sheet (`FilterSheet`) that stacks controls vertically and locks body scroll while open. The inline strip is now grouped into three visual clusters — date range, then narrowing filters (company/topic/source/tag/high-signal), then search — separated by a thin `rule` vertical divider rather than left as one undifferentiated run of controls; control padding within the strip was also tightened. Story rows are single-column at all widths, with per-row vertical padding reduced from `py-6` to `py-4` this pass; there is no responsive multi-column card grid anywhere in the redesigned surface.

## Elevation & Depth

Flat by default. Structure comes from hairline rules and tonal steps (paper → inset → sunk), not shadows. The one shadow in the system is a tight, tinted shadow used exclusively on floating menu/dropdown surfaces (`.surface`) — explicitly a hairline border paired with a *tight* shadow rather than a hairline paired with a wide diffuse cloud. Chart tooltips reuse this same `.surface` treatment rather than inventing a separate elevated card for data views.

### Shadow Vocabulary
- **Menu surface** (`box-shadow: 0 6px 16px -8px rgb(18 17 15 / 0.28)`): Dropdown/multi-select popovers and chart tooltips. Paired with a `rule-2` border.

### Named Rules
**The Flat-By-Default Rule.** Story rows, sections, the lede band, and the filter strip carry zero shadow and zero border-radius. Only a genuinely floating surface (a popover or tooltip that overlaps content) earns the one shadow token.

## Shapes

Uncompromisingly rectangular: no `border-radius` appears anywhere in the sampled stylesheet or components. Controls, inputs, menu surfaces, chips, and the empty-state block are all sharp-cornered. Borders are 1px hairlines in `rule` or `rule-2`; the only "shape" vocabulary beyond the rectangle is the importance meter's five ascending bars (a small bar chart, not a badge or dot row), the underline decoration on story headlines (2px, signal color, 6px offset), and small square swatches (not circular dots) used as chart legend keys.

## Components

### Buttons / Controls (`.ctl`)
- **Shape:** Flat rectangle, no radius, 1px `rule` border.
- **Default:** Transparent background, `ink-2` text, `rule` border, Public Sans 13px/500.
- **Hover:** Border shifts to `rule-2`, text to `ink`.
- **Active** (`data-active="true"`): `inset` background, `ink` border and text — used for the currently-selected range, an open filter, "High signal only" toggled on, the current pagination page.
- **Disabled:** 40% opacity, `not-allowed` cursor.
- Every control shares one class; there is no separate primary/secondary/ghost button family in this surface — filters, pagination, "Copy brief," and "mark all read" are all `.ctl`.

### Chips
- **Style:** Active-filter chips are `rule-2`-bordered rectangles, `ink-2` text (13px micro), with a trailing remove icon; hover darkens border and text to `ink`. No fill, no radius — visually a lighter-weight sibling of `.ctl`, not a pill.
- **Icon:** The remove control is now a drawn SVG "×" (two 1.5px strokes, 8×8px, `currentColor`), replacing a unicode "×" glyph. Matches the drawn-SVG icon vocabulary used everywhere else in the interface (multi-select chevrons, archive expand carets) — no interface icon is set as a text glyph.

### Cards / Containers
- There are no cards in the redesigned surface. Story rows are `<li>` items separated by a bottom `rule` hairline (`border-b`, `last:border-b-0`), full-bleed within the content column, with `hover`/`focus-visible` state shown as an `inset` background wash rather than an elevated card. The one boxed container is the empty state (`border border-rule`, `inset` background, centered text, no radius).

### Inputs / Fields
- **Style:** Transparent background, 1px `rule` border, no radius, Public Sans 13px, `ink-3` placeholder.
- **Focus:** The global focus-visible ring — 2px solid `signal` outline, 2px offset, 2px corner radius (the one radius value in the system, applied only to the focus ring itself, not to the input's resting shape).

### Navigation (ViewTabs)
- **Style:** A horizontal, horizontally-scrolling strip of text tabs with a 2px bottom border indicator. Active tab: `ink` border and text. Inactive: transparent border, `ink-3` text, hover to `ink`. No pill/background treatment on the active tab — the underline is the only state signal.

### Filter Bar (signature component)
Controls are grouped into three visual clusters in fixed order — date range, then narrowing filters (company/topic/source/tag multi-selects plus the "High signal only" toggle), then search — separated by a thin (`h-5 w-1px`) `rule`-colored vertical divider rather than left as one undifferentiated run. The divider is omitted in the stacked mobile-sheet layout, where the clusters already read as distinct vertical groups. This is the filter bar's equivalent of the rule-not-card discipline: grouping by hairline, not by boxing each cluster.

### Story Row (signature component)
The station-report pattern: importance meter (five ascending bars, filled dark or signal-red) leads the row, followed by a "Must read" label only when importance is 5, then metadata (`company` bold, `topic`, momentum text) in `.label` style. The headline follows at `text-head` (or `text-head-lg` when it's a lead story) with a signal-colored underline that appears on hover. A final metadata line separates provenance (source, optional date) from subject tags with a 1px vertical `rule` divider rather than punctuation — a deliberate fix for interpuncts stranding at line-wrap on narrow screens. Read stories dim their headline to `ink-3` and append a "read" marker after the same vertical-rule separator. Row padding is `py-4` (tightened from `py-6` this pass) to bring more of the day's list into view without scrolling.

### Importance Meter (signature component)
Five vertical bars of increasing height (5px to 13px), not dots or a badge. Bars are filled left-to-right up to the story's score: `ink-3`-tinted for 1–2, `ink` for 3–4, `signal` red only at exactly 5. This is the sole encoding of importance in the interface — the build's own history notes a prior version encoded it three redundant ways (dot column, colored pill, red card border) and this consolidates to one. Reused verbatim (not reinvented) on the Companies view's "Avg importance" stat.

### Charts (Companies / Matrix / Trends)
Recharts-based area, line, and bar charts, plus one hand-drawn SVG sparkline, all now built from the same token set as the rest of the site rather than a separate palette. Gridlines and axis lines are `rule`; axis ticks are 12px JetBrains Mono in `ink-3`; a single series defaults to `ink`; the importance-signal line/point is always `signal`; a multi-series chart (the Trends tag breakdown) adds the four muted Chart Series colors after ink and signal. Tooltips reuse the `.surface` menu treatment. The company co-occurrence matrix encodes density by `ink` opacity rather than a hue ramp ("one colour, varying presence"), with the selected-pair cell outlined in `signal` — consistent with the One Job Rule's use of red as a single pointer, not a heat scale.

## Do's and Don'ts

### Do:
- **Do** reserve `signal` red for importance-5 "must-read" marking only — the meter fill, the "Must read" label, the focus ring, text selection, and (in charts) the single importance-signal series or point.
- **Do** separate content groups with a 1px `rule` hairline instead of a card border or shadow — including grouping filter-bar controls into clusters via a vertical rule divider rather than boxing each cluster.
- **Do** keep every interactive control (`.ctl`) flat, square-cornered, and bordered — no rounded pills, gradients, or button shadows.
- **Do** use JetBrains Mono with tabular figures for anything meant to line up in a column (dates, counts, source lines, chart axes).
- **Do** cap running prose at the `measure` (68ch) even when its container is wider.
- **Do** draw interface icons (remove, chevron, expand caret) as inline SVG at 8–10px using `currentColor`; never set an icon as a unicode text glyph (`×`, `▾`, etc.).

### Don't:
- **Don't** introduce a kicker/eyebrow line above a heading. The build deliberately removed one ("the heading carries its own weight") — treat this as confirmed system doctrine, not just a one-page choice.
- **Don't** use `rule-2` for text; it sits at ~1.7:1 contrast on paper and is border-only by design. Use `ink-3` as the contrast floor for text.
- **Don't** add a card, badge, or drop-shadow treatment to a new list or grid surface — the system's structural language is rules and tonal steps, not boxed containers.
- **Don't** add border-radius to controls, inputs, or containers; the one confirmed exception is the 2px focus-ring corner, not a general shape allowance.
- **Don't** give a chart its own palette. Every chart surface (Companies, Matrix, Trends) draws from the same `--color-*` tokens as the rest of the site; a hardcoded hex/font-family constant local to one component is exactly the drift this pass fixed and should not recur.
