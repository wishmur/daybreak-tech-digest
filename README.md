# Daybreak

Build a Next.js page called "Tech Digest" that displays a daily curated AI/tech news feed for a product manager.

DATA SOURCE

Fetch this JSON on page load (and refresh client-side every 10 minutes):

https://raw.githubusercontent.com/wishmur/tech-digest/main/data/digest.json

Shape:

{

  "lastUpdated": "ISO timestamp",

  "days": [

    {

      "date": "YYYY-MM-DD",

      "summary": "2-3 sentence brief on today's news",

      "items": [

        {

          "id": "string",

          "title": "string",

          "link": "url",

          "source": "TechCrunch AI | AWS News | etc.",

          "summary": "one-line why it matters",

          "topic": "string",

          "company": "string (primary)",

          "secondaryCompanies": ["array of strings"],

          "importance": 1-5,

          "tags": ["launch", "funding", "leadership", "regulation", "open-source", "competitive", "research", "product", "infra", "tooling"],

          "publishedAt": "ISO date or null",

          "addedOn": "YYYY-MM-DD"

        }

      ]

    }

  ]

}

days[0] is the most recent. Days are listed newest first.

LAYOUT

Top of page:

- Title "Tech Digest" with a smaller subtitle "Last updated: {lastUpdated, formatted as a friendly date and time}".

- A prominent "Today's Brief" card containing days[0].summary. Larger type, accent border. This is the first thing the user reads.

Sticky filter bar below the brief:

- Date range: segmented control with "Today" (default), "Last 7 days", "Last 30 days", "All time".

- Company: multi-select dropdown listing every unique company found (primary + secondary) within the current date range, sorted by frequency descending.

- Topic: multi-select dropdown listing unique topics.

- Tags: multi-select chip group (the tag vocabulary above).

- Source: multi-select dropdown.

- Importance: segmented control "All / 3+ / 4+ / Must-read (5)".

- Search: text input that matches against title and summary, case-insensitive.

- "Reset filters" link on the right.

Items list:

- Group items by addedOn date. Each group has a header like "Today", "Yesterday", or "Tuesday, May 28".

- Within each group, sort by importance descending, then company alphabetical.

- Each item is a card:

  - Top row: primary company badge (filled, colored), then up to 2 secondary-company badges (outlined, smaller), then on the right side, importance shown as 5 dots with the active count filled.

  - Title (link to item.link, bold, larger, opens in new tab).

  - Summary text (1-2 lines, regular weight).

  - Bottom row: source name (small, muted), topic pill, tag pills, addedOn date (small, muted, right aligned).

- Hover: subtle lift and shadow.

UX REQUIREMENTS

- Persist filter state in the URL query string so a filtered view is shareable and refreshable.

- Mirror filter state to localStorage so the last-used filters are remembered on revisit.

- Loading skeleton while the JSON fetches.

- If the fetch fails, show a small dismissable banner "Could not reach the digest" and fall back to a cached copy from localStorage if one exists.

- Empty state when filters return zero items: friendly "No matches. Try widening your filters." with a "Reset" button.

- Mobile: the filter bar collapses behind a "Filters" button that opens a bottom sheet.

- System-respecting dark mode with a manual toggle in the top right.

AESTHETIC

- Clean, content-first, dense like Linear or a good newsreader. Not a Bento-card portfolio look.

- Light theme: white background, near-black text.

- Single accent color: #2D55FF. Use it for the importance dots, the Today's Brief border, and primary buttons.

- Sans-serif body font like Inter.

- Compact, generous-but-not-airy spacing. Cards have a subtle border, not heavy shadow.

- No gradients, no animations beyond simple hover and transitions.

OUT OF SCOPE

- No auth, no comments, no save/star feature, no backend beyond the public JSON fetch. Just a great reader page.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://daybreak-tech-digest.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ea6db3e6-4cad-4ca3-8a70-104f031997d6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
