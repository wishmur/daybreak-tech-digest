import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Rss,
  Sparkles,
  GitBranch,
  MonitorSmartphone,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";

const DATA_URL =
  "https://raw.githubusercontent.com/wishmur/tech-digest/main/data/digest.json";
const ACCENT = "#B3261E";
const MONO = "JetBrains Mono, ui-monospace, monospace";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "System — How Daybreak works" },
      {
        name: "description",
        content:
          "The Daybreak pipeline: a GitHub Actions cron pulls feeds, Claude returns a schema-enforced JSON digest, the result is committed back to the repo, and the frontend renders it. Numbers are real.",
      },
      { property: "og:title", content: "How Daybreak works" },
      {
        property: "og:description",
        content:
          "GitHub Actions → sources → Claude structured JSON → committed artifact → frontend. A recruiting-facing walkthrough of the AI product engineering behind Daybreak.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorksPage,
});

type RawItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  summary: string;
  topic: string;
  company: string;
  secondaryCompanies: string[];
  importance: number;
  tags: string[];
  publishedAt: string | null;
  addedOn: string;
};

type Digest = { lastUpdated: string; days: { date: string; items: RawItem[] }[] };

const STAGES = [
  {
    key: "cron",
    icon: Clock,
    title: "GitHub Actions",
    caption: "Cron fires every morning at 09:30 ET",
    detail: "workflow_dispatch + schedule",
  },
  {
    key: "pull",
    icon: Rss,
    title: "Source pull",
    caption: "RSS + APIs across ~40 feeds",
    detail: "dedupe · normalize · truncate",
  },
  {
    key: "claude",
    icon: Sparkles,
    title: "Claude",
    caption: "Structured JSON via tool schema",
    detail: "temperature 0.2 · schema-locked",
  },
  {
    key: "commit",
    icon: GitBranch,
    title: "Commit artifact",
    caption: "digest.json pushed to main",
    detail: "signed bot commit · immutable log",
  },
  {
    key: "render",
    icon: MonitorSmartphone,
    title: "Frontend",
    caption: "TanStack Start reads the JSON",
    detail: "static fetch · no server DB",
  },
] as const;

const JSON_SCHEMA = `{
  "id":                 "string",           // stable slug
  "title":              "string",           // headline, plain text
  "link":               "string (URL)",     // canonical source URL
  "source":             "string",           // e.g. "The Information"
  "summary":            "string",           // 1–2 sentence PM-framed brief
  "topic":              "string",           // e.g. "agents", "chips"
  "company":            "string",           // primary company
  "secondaryCompanies": "string[]",         // also involved
  "importance":         "1 | 2 | 3 | 4 | 5",// 5 = must-read for a PM today
  "tags":               "string[]",         // launch|funding|leadership|
                                            // regulation|open-source|
                                            // competitive|research|product|
                                            // infra|tooling
  "publishedAt":        "ISO 8601 | null",  // source publish time
  "addedOn":            "ISO 8601"          // pipeline ingest time
}`;

function HowItWorksPage() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const [runAnim, setRunAnim] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(DATA_URL, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setDigest(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // trigger initial animation
  useEffect(() => {
    const t = setTimeout(() => setRunAnim(1), 100);
    return () => clearTimeout(t);
  }, []);

  const stats = useMemo(() => {
    const days = digest?.days ?? [];
    const totalItems = days.reduce((s, d) => s + d.items.length, 0);
    const totalDays = days.length;
    const avg = totalDays ? totalItems / totalDays : 0;
    return {
      totalDays,
      totalItems,
      avgPerDay: avg,
      schemaFields: 12,
    };
  }, [digest]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* Top bar */}
      <div
        className="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80"
        style={{ fontFamily: MONO }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-[10px] uppercase tracking-widest text-neutral-500 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to digest
          </Link>
          <span>
            SYS · <span style={{ color: ACCENT }}>OPERATIONAL</span>
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Hero */}
        <header className="mb-10">
          <p
            className="mb-2 text-[11px] uppercase tracking-widest text-neutral-500"
            style={{ fontFamily: MONO }}
          >
            /how-it-works
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            The Daybreak pipeline
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            A cron job wakes up every morning, pulls a wide net of AI/tech
            sources, asks Claude to score and structure them under a strict
            JSON schema, and commits the result back to the repo. The
            frontend just reads that file. No servers, no database — the
            pipeline itself is the product.
          </p>
        </header>

        {/* Stats */}
        <section className="mb-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Days running" value={stats.totalDays} />
          <StatCard label="Items processed" value={stats.totalItems} />
          <StatCard
            label="Avg / day"
            value={stats.avgPerDay.toFixed(1)}
          />
          <StatCard label="Schema fields" value={stats.schemaFields} />
        </section>

        {/* Pipeline diagram */}
        <section className="mb-12">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500" style={{ fontFamily: MONO }}>
              Daily run
            </h2>
            <button
              onClick={() => setRunAnim((n) => n + 1)}
              className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              style={{ fontFamily: MONO }}
            >
              ▶ replay
            </button>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40 sm:p-6">
            {/* Desktop pipeline */}
            <div className="hidden md:block">
              <div className="relative">
                {/* Track */}
                <div className="absolute left-[6%] right-[6%] top-[46px] h-px bg-neutral-300 dark:bg-neutral-700" />
                {/* Particle */}
                <div
                  key={runAnim}
                  className="pointer-events-none absolute top-[42px] h-2 w-2 rounded-full"
                  style={{
                    left: "6%",
                    background: ACCENT,
                    boxShadow: `0 0 12px ${ACCENT}, 0 0 24px ${ACCENT}`,
                    animation: "daybreak-flow 3.6s cubic-bezier(0.4,0,0.2,1) forwards",
                  }}
                />
                <div className="grid grid-cols-5 gap-2">
                  {STAGES.map((s, i) => (
                    <StageNode key={s.key} stage={s} index={i} runKey={runAnim} />
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile pipeline */}
            <ol className="space-y-3 md:hidden">
              {STAGES.map((s, i) => {
                const Icon = s.icon;
                return (
                  <li
                    key={s.key}
                    className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-800"
                      style={{ color: ACCENT }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-[10px] uppercase tracking-widest text-neutral-500"
                          style={{ fontFamily: MONO }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm font-semibold">{s.title}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300">
                        {s.caption}
                      </p>
                      <p
                        className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500"
                        style={{ fontFamily: MONO }}
                      >
                        {s.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <p
            className="mt-3 text-[11px] text-neutral-500"
            style={{ fontFamily: MONO }}
          >
            The whole thing runs in under 90 seconds — most of that is model latency, not IO.
          </p>
        </section>

        {/* Schema */}
        <section className="mb-12">
          <button
            onClick={() => setShowSchema((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
          >
            <div>
              <div
                className="text-[10px] uppercase tracking-widest text-neutral-500"
                style={{ fontFamily: MONO }}
              >
                Structured output
              </div>
              <div className="mt-0.5 text-sm font-semibold">
                See the actual JSON schema Claude fills in
              </div>
            </div>
            <ChevronDown
              className={
                "h-4 w-4 text-neutral-500 transition-transform " +
                (showSchema ? "rotate-180" : "")
              }
            />
          </button>

          {showSchema && (
            <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-950 dark:border-neutral-800">
              <div
                className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 text-[10px] uppercase tracking-widest text-neutral-400"
                style={{ fontFamily: MONO }}
              >
                <span>item.schema — one per story</span>
                <span style={{ color: ACCENT }}>enforced</span>
              </div>
              <pre
                className="overflow-x-auto px-4 py-4 text-[12px] leading-relaxed text-neutral-200"
                style={{ fontFamily: MONO }}
              >
                <code>{JSON_SCHEMA}</code>
              </pre>
              <div
                className="border-t border-neutral-800 px-4 py-2 text-[11px] text-neutral-400"
                style={{ fontFamily: MONO }}
              >
                Passed to Anthropic as a tool definition — model output that
                doesn't validate is rejected and the pipeline retries.
              </div>
            </div>
          )}
        </section>

        <footer
          className="border-t border-neutral-200 pt-6 text-[11px] text-neutral-500 dark:border-neutral-800"
          style={{ fontFamily: MONO }}
        >
          Source of truth: <span className="text-neutral-700 dark:text-neutral-300">wishmur/tech-digest</span> · digest.json is regenerated in place, so its git history <em>is</em> the archive.
        </footer>
      </main>

      <style>{`
        @keyframes daybreak-flow {
          0%   { left: 6%;  opacity: 0; transform: scale(0.6); }
          8%   { opacity: 1; transform: scale(1); }
          92%  { opacity: 1; transform: scale(1); }
          100% { left: 94%; opacity: 0; transform: scale(0.6); }
        }
        @keyframes daybreak-pop {
          0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,102,255,0); }
          50%  { transform: scale(1.06); box-shadow: 0 0 0 6px rgba(0,102,255,0.18); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,102,255,0); }
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div
        className="text-[10px] uppercase tracking-widest text-neutral-500"
        style={{ fontFamily: MONO }}
      >
        {label}
      </div>
      <div
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{ fontFamily: MONO, color: ACCENT }}
      >
        {value}
      </div>
    </div>
  );
}

function StageNode({
  stage,
  index,
  runKey,
}: {
  stage: (typeof STAGES)[number];
  index: number;
  runKey: number;
}) {
  const Icon = stage.icon;
  // rough timing: particle spends ~3.6s traversing 5 stages
  const delay = 200 + index * 700;

  return (
    <div className="flex flex-col items-center text-center">
      <div
        key={runKey}
        className="relative z-10 flex h-[92px] w-[92px] items-center justify-center rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"
        style={{
          animation: `daybreak-pop 0.5s ease-out ${delay}ms both`,
        }}
      >
        <Icon className="h-6 w-6" style={{ color: ACCENT }} />
        <span
          className="absolute -top-2 -left-2 rounded-full border border-neutral-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950"
          style={{ fontFamily: MONO }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-3 min-h-[64px]">
        <div className="text-sm font-semibold">{stage.title}</div>
        <p className="mt-0.5 text-[11px] leading-snug text-neutral-600 dark:text-neutral-300">
          {stage.caption}
        </p>
        <p
          className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500"
          style={{ fontFamily: MONO }}
        >
          {stage.detail}
        </p>
      </div>
    </div>
  );
}
