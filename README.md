# Daybreak

A daily, high-signal AI/tech brief for a product manager. Eight feeds in, ten
stories out, once a day. No server.

**Live app**: https://daybreak-tech-digest.lovable.app

## How it works

Everything lives in this one repo.

```
.github/workflows/daily-digest.yml   scheduled job (cron 0 14 * * *)
  └─ scripts/digest.js               the entire pipeline
       └─ public/data/digest.json    the archive, committed back by the job
            └─ src/                  the reader, fetching that file in the browser
```

1. `scripts/digest.js` pulls the eight RSS feeds listed in its CONFIG block.
2. It drops items older than 36 hours, dedupes by link, removes anything already
   published in an earlier brief, and applies a keyword pre-filter. At most 40
   headlines go forward.
3. One Claude call picks the ten that matter, writes a sentence on why for each,
   names the companies, scores importance 1-5, tags the story, and writes the
   day's summary. One model call per day is the whole model cost.
4. The picks are merged into `public/data/digest.json` and committed back by the
   job. That file's git history is the archive.
5. The app fetches that JSON straight from GitHub over `raw.githubusercontent.com`
   (see `DATA_URL` in `src/lib/digest.ts`) rather than from its own bundle, so a
   new brief goes live the moment the job commits it, with no publish step.
   **This requires the repo to stay public.**

Filtering, search, company momentum, and every chart are computed in the browser
from that single file. There is no database and no API.

### Data shape

```jsonc
{
  "lastUpdated": "ISO timestamp",
  "days": [                          // newest first
    {
      "date": "YYYY-MM-DD",
      "summary": "2-3 sentence brief on the day",
      "items": [
        {
          "id": "string",            // short hash of the link
          "title": "string",
          "link": "url",
          "source": "TechCrunch AI | AWS News | ...",
          "summary": "one line on why it matters",
          "topic": "string",
          "company": "string",       // primary
          "secondaryCompanies": ["string"],
          "importance": 1,           // 1-5, 5 = must read
          "tags": ["launch", "funding", "..."],
          "publishedAt": "ISO date or null",
          "addedOn": "YYYY-MM-DD"    // the day this run wrote it
        }
      ]
    }
  ]
}
```

## Setup

The job needs one repository secret: `ANTHROPIC_API_KEY`
(Settings -> Secrets and variables -> Actions).

To run it by hand: Actions -> Daily Tech Digest -> Run workflow.

## Tweaking

Feeds, priorities, item count, lookback window, and model are all in the CONFIG
block at the top of `scripts/digest.js`.

Anything the "How it works" page claims must stay true to that file. See
`PRODUCT.md`.

## Development

```sh
bun install
bun run dev
```

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ea6db3e6-4cad-4ca3-8a70-104f031997d6).
Every change made in Lovable is committed straight to this repository, and
pushing to `main` syncs back into Lovable.
