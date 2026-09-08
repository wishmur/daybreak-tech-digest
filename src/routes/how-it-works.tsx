import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { allItems, parseYMD } from "@/lib/digest";
import { useDigest } from "@/lib/useDigest";
import { Masthead, SiteFooter, StatusBar } from "@/components/digest/Chrome";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How Daybreak works" },
      {
        name: "description",
        content:
          "The pipeline behind Daybreak: a scheduled GitHub Action, eight feeds, one Claude call a day, and a JSON file committed back to the repo.",
      },
    ],
  }),
  component: HowItWorksPage,
});

/* Every number and claim below is checked against scripts/digest.js. The
   previous version of this page advertised roughly forty feeds, a 09:30
   cron, temperature 0.2, a tool-schema-enforced response and an automatic
   retry on invalid output. None of those were true. On a page a hiring
   manager may read next to the repo itself, that is worse than saying
   nothing. */

const FEEDS = [
  "TechCrunch AI",
  "The Verge",
  "VentureBeat AI",
  "AWS News",
  "NVIDIA Blog",
  "Stratechery",
  "Lenny's Newsletter",
  "Hacker News",
];

const STEPS = [
  {
    n: "01",
    title: "A scheduled job wakes up",
    body: "A GitHub Action runs at 14:00 UTC, which is 10 AM Eastern in summer. It can also be triggered by hand from the Actions tab. Nothing is running the rest of the day: there is no server.",
  },
  {
    n: "02",
    title: "Eight feeds get pulled",
    body: "Each feed is parsed, items older than 36 hours are dropped, and anything already published in an earlier brief is removed by link. A keyword filter thins the rest, and at most 40 headlines go forward.",
  },
  {
    n: "03",
    title: "One model call ranks them",
    body: "A single Claude call picks the ten that matter to a product manager, writes one sentence on why for each, names the companies involved, scores importance from 1 to 5, tags the story, and writes the day's summary. One call a day is the entire model cost.",
  },
  {
    n: "04",
    title: "The result is committed",
    body: "The ten picks are merged into data/digest.json and pushed back to the repository by the job itself. The file's git history is the archive, which means every brief is diffable and nothing can quietly change after the fact.",
  },
  {
    n: "05",
    title: "This site reads the file",
    body: "The frontend fetches that same JSON as a static asset. No database, no API, no server rendering of the data. Everything you can filter, search, and chart here is computed in your browser from one file.",
  },
];

const SCHEMA = `{
  "id":                 string,      // stable short hash of the link
  "title":              string,
  "link":               string,
  "source":             string,      // which feed it came from
  "summary":            string,      // one sentence on why it matters
  "topic":              string,
  "company":            string,      // primary company
  "secondaryCompanies": string[],
  "importance":         1 | 2 | 3 | 4 | 5,
  "tags":               string[],    // from a fixed vocabulary of 10
  "publishedAt":        string|null, // from the feed
  "addedOn":            string       // the day this run wrote it
}`;

function HowItWorksPage() {
  const { digest, loading, stale } = useDigest();
  const [showSchema, setShowSchema] = useState(false);
  const items = useMemo(() => allItems(digest), [digest]);

  const stats = useMemo(() => {
    const days = digest?.days ?? [];
    if (!days.length) return null;
    const dates = days.map((d) => parseYMD(d.date).getTime()).sort();
    const spanDays =
      Math.round((dates[dates.length - 1] - dates[0]) / 86_400_000) + 1;
    return {
      issues: days.length,
      items: items.length,
      perDay: items.length / days.length,
      spanDays,
      // Days in the span with no brief. Honest, and more interesting than
      // pretending the streak is unbroken.
      missed: Math.max(0, spanDays - days.length),
    };
  }, [digest, items]);

  return (
    <div className="min-h-screen">
      <StatusBar
        lastUpdated={digest?.lastUpdated}
        latestDate={digest?.days?.[0]?.date}
        totalItems={items.length}
        loading={loading && !digest}
        stale={stale && !loading}
      />
      <Masthead tagline={false} />

      <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <h2 className="text-display font-semibold">How it works</h2>
        <p className="measure mt-5 text-lede leading-[1.55] text-ink-2">
          Daybreak is a cron job, one model call, and a JSON file in a git
          repository. There is no backend to run and nothing to pay for beyond
          a few cents of tokens a day. The whole point is how little machinery
          it takes.
        </p>

        {/* ---- Real numbers ---- */}
        {stats && (
          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-y border-rule py-8 sm:grid-cols-4">
            <Metric label="Briefs published" value={String(stats.issues)} />
            <Metric label="Stories ranked" value={stats.items.toLocaleString()} />
            <Metric label="Average per brief" value={stats.perDay.toFixed(1)} />
            <Metric
              label="Days without a brief"
              value={String(stats.missed)}
              note={`out of ${stats.spanDays}`}
            />
          </dl>
        )}

        {/* ---- Pipeline ---- */}
        <section className="mt-16">
          <h3 className="label-strong border-b border-ink pb-2">
            The daily run
          </h3>
          <ol className="mt-2">
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="flex flex-col gap-2 border-b border-rule py-6 sm:flex-row sm:gap-8"
              >
                <span className="data shrink-0 pt-1 sm:w-12">{s.n}</span>
                <div className="min-w-0">
                  <h4 className="text-head font-semibold">{s.title}</h4>
                  <p className="measure mt-2 text-ink-2">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- Sources ---- */}
        <section className="mt-16">
          <h3 className="label-strong border-b border-ink pb-2">
            The eight feeds
          </h3>
          <ul className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {FEEDS.map((f) => (
              <li key={f} className="border-b border-rule py-2 font-ui text-meta">
                {f}
              </li>
            ))}
          </ul>
          <p className="measure mt-4 text-meta text-ink-3">
            Eight is a deliberate number. A wider net mostly adds duplicates of
            the same story, and every extra headline costs tokens in the one
            call that does the ranking.
          </p>
        </section>

        {/* ---- Schema ---- */}
        <section className="mt-16">
          <h3 className="label-strong border-b border-ink pb-2">
            What the model returns
          </h3>
          <p className="measure mt-4 text-ink-2">
            The prompt asks for raw JSON in a fixed shape. It is a prompt
            contract, not a tool schema: the response is trimmed of any code
            fence, sliced between the outer braces, and parsed. If that parse
            fails the run stops and the day is skipped rather than writing
            something malformed into the archive.
          </p>
          <button
            onClick={() => setShowSchema((v) => !v)}
            aria-expanded={showSchema}
            className="ctl mt-5"
          >
            {showSchema ? "Hide the shape" : "Show the shape"}
          </button>
          {showSchema && (
            <pre className="anim-in scroll-x mt-4 border border-rule bg-inset p-5 font-data text-micro leading-[1.7] text-ink-2">
              <code>{SCHEMA}</code>
            </pre>
          )}
        </section>

        {/* ---- Honesty ---- */}
        <section className="mt-16">
          <h3 className="label-strong border-b border-ink pb-2">
            What it does not do
          </h3>
          <ul className="measure mt-4 space-y-3 text-ink-2">
            <li className="border-b border-rule pb-3">
              It does not verify anything. The model ranks headlines and
              snippets, so a wrong headline produces a wrong summary.
            </li>
            <li className="border-b border-rule pb-3">
              It does not retry a bad response. One call, and a skipped day if
              it comes back unparseable.
            </li>
            <li className="border-b border-rule pb-3">
              It does not personalise. Everyone sees the same ten stories. What
              you have read is remembered in your browser and nowhere else.
            </li>
            <li>
              It does not run when the schedule is missed. GitHub pauses cron
              jobs on inactive repositories, so gaps in the archive are real
              gaps, and the status bar says so.
            </li>
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div>
      <dt className="label-strong">{label}</dt>
      <dd className="mt-2 font-display text-head-lg font-semibold tabular-nums">
        {value}
        {note && <span className="ml-2 font-ui text-meta font-normal text-ink-3">{note}</span>}
      </dd>
    </div>
  );
}
