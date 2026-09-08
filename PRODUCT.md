# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user is the builder themselves: a product manager who wants a daily, high-signal brief on AI/tech news. Secondary audience is engineers and hiring managers who may read the project (and its "How it works" page) next to the repo as a demonstration of craft — the product is a personal tool that also functions as a portfolio piece.

## Product Purpose

Turn a noisy set of overlapping tech/AI news sources into a small number of high-signal stories that preserve context across days, so the reader can quickly understand what changed, why it matters, and how a story is evolving — without reading five separate articles. Success is getting caught up on what actually matters in a few minutes, once a day.

## Positioning

The differentiator is contextual synthesis, not link aggregation: collapsing many overlapping updates into fewer stories that stay threaded across days (the app already tracks per-company history/"momentum" across issues), rather than "10 links for PMs." The minimal, auditable pipeline — one scheduled job, one Claude call a day, no backend, a git-diffable JSON archive — is part of the product's philosophy and adds credibility, but is explicitly not the primary value proposition; synthesis quality is.

## Operating Context

Runs as a scheduled GitHub Action once daily (14:00 UTC / ~10 AM ET, can be triggered manually), with nothing running the rest of the day — no server. The frontend is a static TanStack Start/Vite app that fetches a single `digest.json` from the repo and refreshes client-side. Filter state and read state persist to the URL and localStorage. Deployed via Lovable at daybreak-tech-digest.lovable.app, synced with GitHub.

## Capabilities and Constraints

- No auth, no accounts, no comments, no save/star feature, no backend beyond the public JSON fetch. Deliberate scope; may stay this way indefinitely as a solo/portfolio project with no pricing, team, or enterprise features (now or planned).
- Eight fixed feeds; one Claude call per day selects and ranks roughly ten stories, writes per-story reasoning, and scores importance 1–5. If the model's response fails to parse, that day is skipped rather than writing malformed data into the archive — no retry.
- No personalization: every reader sees the same stories. What has been read is remembered only in that browser's localStorage, nowhere else.
- Beyond the main digest list, the app already implements a Companies view, a co-occurrence/matrix view, a Trends view, and a command palette (Cmd/Ctrl+K) — these are shipped, not aspirational.
- Responsive design and basic accessibility are requirements going forward.
- The current single light theme and visual system are explicitly not durable — open to replacement by future design work, unlike the facts above.

## Brand Commitments

"Daybreak" is the fixed product name. Stays a solo/portfolio project: no pricing, team, or enterprise features, now or planned.

## Evidence on Hand

Live app at https://daybreak-tech-digest.lovable.app. Real `digest.json` data seeded from the actual pipeline; its git history is the archive. The "How it works" page (`src/routes/how-it-works.tsx`) documents real, code-verified pipeline facts (feeds, steps, schema, stats) — a prior version overstated some of these and was corrected; future copy must stay checked against `scripts/digest.js` and not drift back into aspirational claims. No user research, testimonials, or usage metrics exist beyond what's computed live from the digest file — do not fabricate any.

## Product Principles

1. Say only what's true — pipeline descriptions, stats, and limitations shown to the reader must match the real implementation, not aspiration.
2. Synthesis over aggregation — collapse noisy, overlapping coverage into fewer stories that preserve context across days, rather than listing more links.
3. Minimal machinery, maximal transparency — infrastructure stays small and auditable (one job, one file, git-diffable); the mechanism should be legible end to end to a technical reader.
4. Craft as the pitch — because this doubles as a portfolio piece, execution quality has to hold up to a technical/hiring audience, not just casual daily use.

## Accessibility & Inclusion

Basic accessibility and responsive design are confirmed requirements. No specific standard (e.g., a WCAG level) has been set yet.
