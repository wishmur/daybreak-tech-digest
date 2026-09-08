---
version: 1
slug: "src-routes-index-tsx"
primary_target: "src/routes/index.tsx"
related_targets: ["src/components/digest/Analysis.tsx","src/routes/archive.tsx","src/routes/how-it-works.tsx","src/components/digest/Chrome.tsx","src/components/digest/Filters.tsx","src/components/digest/Story.tsx"]
---

## Scope

Full product, one pass: main digest (`src/routes/index.tsx`), shared Chrome/Filters/Story components, and Companies/Matrix/Trends (`Analysis.tsx`), Archive, How It Works — each adapted to its own task, not a mechanical copy of the digest layout. Operate-led, Read-supporting. Supersedes the rejected "Synoptic Brief" world; DESIGN.md is rewritten at finish from what actually ships.

## Audience, job, constraints

A product manager actively using this tool — scanning, filtering, searching, tracking read state, drilling into companies/topics/trends, repeatedly, alongside their other real software (Linear, Notion, analytics). Preserve all functionality, routes, data behaviour, the Daybreak name, the honest/precise voice, accessibility, and responsive behaviour. No pricing/team/enterprise features.

## Direction contract

THESIS: Stories triage through prioritised, status-coded lanes across the full working canvas — a scan-first product tool, not a branded reading page. Refuses both the old single-column editorial page and the generic badge/card SaaS grid.

OWN-WORLD: Bright near-white ground (#FCFCFA), near-black ink (#14161A), one signal accent reserved for importance/active state (#E8432C), a second functional tone for the secondary lane (#3468C0). Flat colour-field section headers do real grouping work, not hairlines alone. One grotesk family (Hanken Grotesk) at a real weight range for display and UI; JetBrains Mono only for counts/data. Abstracted per steer: no literal aviation material, texture, or iconography — lanes, status tabs, and a compact overview band are the mechanism, kept crisp and product-like.

STORY: The reader sees today's status at a glance in a compact overview band (a few real facts, never a hero), scans a wide lead lane of colour-tabbed priority stories, a secondary lane for the rest, and a companies/momentum panel using the freed width. Filters, search, and range are visually distinct control types, never one repeated button shape.

FIRST VIEWPORT: A slim top bar (wordmark, global nav, live status), the overview band, then the full working board in view together: a control rail, the wide lead lane, and a companies/momentum panel — stories visible immediately, no large branded intro to scroll past.

FORM: The Strip Board, abstracted — priority lanes, status-colour coding, and a compact overview panel as the mechanism. Assigned direction, rank 6 of 7 on the resonance-ordered list, seed key 195d02ae.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions

Exact grid composition per non-digest route (Companies/Matrix/Trends already use a system-consistent layout from the prior pass and mainly need the new token/control language; Archive and How It Works keep their own information architecture, restyled into the new world) — resolve during build in favour of what serves each page's actual task.
