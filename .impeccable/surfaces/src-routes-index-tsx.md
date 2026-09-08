---
version: 1
slug: "src-routes-index-tsx"
primary_target: "src/routes/index.tsx"
related_targets: []
---

## Scope

Main digest reading view (`src/routes/index.tsx`, its Chrome/Filters/Story components). Read mode. Companies/Matrix/Trends/Archive/How-it-works keep their current look this pass; ViewTabs must keep routing to them.

## Audience, job, constraints

A product manager (the builder) scanning today's AI/tech developments once a day, then reading a few in depth; also read by engineers/hiring managers evaluating craft. Preserve all existing functionality: filters, search, URL/localStorage persistence, keyboard nav (j/k/enter), command palette, read state, pagination, copy-brief. Keep the honest, precise, self-checking voice — restyle around it, don't flatten it.

## Direction contract

THESIS: News reads as a synoptic weather briefing — plain-language conditions first, story "systems" and "station reports" after — refusing the badge-and-card dashboard grid this category always ships.

OWN-WORLD: Cool grey-blue chart-paper ground (#EEF2F3), near-black chart ink (#12161A), contour-line rules in place of card borders and badges, one storm-red accent (#D1361A) reserved for must-read (importance 5) only. Archivo for display, Public Sans for body/UI, JetBrains Mono for data readouts (times, counts, station index).

STORY: The reader gets today's overall signal in one plain sentence, scans systems (topic threads) ranked by intensity, reads a station-report line per story (fact, why-it-matters, intensity mark), and traces a company's momentum across days without leaving the page.

FIRST VIEWPORT: A full-width "Today's Outlook" band — kicker, large date, one-sentence conditions summary, the honest signal-stats line. Below, a slim sticky filter strip, then the lead system: today's stories as station reports in one wide column, intensity as a filled contour mark, never a card or badge grid.

FORM: The Synoptic Brief — assigned direction, rank 6 of 7 on the resonance-ordered list, seed key a7077270.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions

Whether "systems" (topic groupings) fully replace the current flat day-grouped list or ride alongside it as a secondary lens — resolve during build in favor of whichever keeps scanning fastest; the day-group is the proven backbone (per-day chronology, pagination, addedOn grouping) and systems/intensity are the new organizing skin over it, not a second information architecture.
