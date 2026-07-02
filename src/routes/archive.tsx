import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import daybreakLogo from "@/assets/daybreak-logo.png.asset.json";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Archive — Daybreak" },
      {
        name: "description",
        content: "Browse past daily briefs from Daybreak.",
      },
      { property: "og:title", content: "Archive — Daybreak" },
      {
        property: "og:description",
        content: "Browse past daily briefs from Daybreak.",
      },
    ],
  }),
  component: ArchivePage,
});

// ---------- Types ----------
type Item = {
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

type Day = {
  date: string;
  summary: string;
  items: Item[];
};

type Digest = {
  lastUpdated: string;
  days: Day[];
};

// ---------- Constants ----------
const DATA_URL =
  "https://raw.githubusercontent.com/wishmur/tech-digest/main/data/digest.json";
const LS_CACHE = "techDigest:cache";
const ACCENT = "#B3261E";
const MONO_STYLE: React.CSSProperties = {
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  letterSpacing: "0.02em",
};

// ---------- Helpers ----------
function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function friendlyDate(s: string): string {
  const d = parseYMD(s);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function shortDate(s: string): string {
  const d = parseYMD(s);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function itemTs(it: Item): number {
  const p = it.publishedAt ? new Date(it.publishedAt).getTime() : NaN;
  if (!Number.isNaN(p)) return p;
  return parseYMD(it.addedOn).getTime();
}

// ---------- Page ----------
function ArchivePage() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const fetchDigest = useCallback(async () => {
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as Digest;
      setDigest(json);
      try { localStorage.setItem(LS_CACHE, JSON.stringify(json)); } catch {}
    } catch {
      try {
        const cached = localStorage.getItem(LS_CACHE);
        if (cached) setDigest(JSON.parse(cached) as Digest);
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDigest();
  }, [fetchDigest]);

  const days = useMemo(() => {
    if (!digest) return [] as Day[];
    return [...digest.days].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [digest]);

  const toggleDay = (date: string) => {
    setExpandedDay((d) => (d === date ? null : date));
  };

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "Source Serif 4, ui-serif, Georgia, serif",
        backgroundColor: "#FAF7F2",
        color: "#1A1A1A",
      }}
    >
      {/* Editorial masthead */}
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-6 sm:px-6 sm:pt-10">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h1
              className="font-bold leading-[0.9] tracking-[-0.02em]"
              style={{
                fontFamily: "Source Serif 4, ui-serif, Georgia, serif",
                fontSize: "clamp(48px, 9vw, 96px)",
                color: "#1A1A1A",
              }}
            >
              Daybreak
            </h1>
            <p
              className="mt-4 max-w-2xl text-[15px] leading-[1.55] text-[#2E2A24]"
              style={{ fontFamily: "Source Serif 4, ui-serif, Georgia, serif" }}
            >
              A small script reads the feeds every morning, asks Claude what
              actually matters to a PM today, and posts the top ten by 10 AM ET.
              Built because I was losing mornings to the firehose.
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-4 sm:flex">
            <img
              src={daybreakLogo.url}
              alt=""
              aria-hidden="true"
              className="h-14 w-14 rounded-lg opacity-90"
            />
            <Link
              to="/how-it-works"
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#56504A] underline-offset-[6px] hover:text-[#1A1A1A] hover:underline"
              style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
            >
              System
            </Link>
          </div>
        </div>
        {/* thin editorial rule */}
        <div className="mt-6 h-px w-full" style={{ backgroundColor: "#DDD8CC" }} />
      </header>

      {/* View tabs */}
      <nav className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-800">
          {[
            { to: "/", label: "Digest" },
            { to: "/", label: "Companies", search: { view: "companies" } },
            { to: "/", label: "Competitive matrix", search: { view: "matrix" } },
            { to: "/", label: "Trends", search: { view: "trends" } },
          ].map((t) => (
            <Link
              key={t.label}
              to={t.to}
              search={t.search as any}
              className="relative -mb-px px-3 py-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              {t.label}
            </Link>
          ))}
          <span className="relative -mb-px px-3 py-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Archive
            <span
              className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
              style={{ backgroundColor: ACCENT }}
            />
          </span>
        </div>
      </nav>

      {/* Archive content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex items-baseline justify-between border-b border-[#E8E2D2] pb-3 dark:border-neutral-800">
          <h2
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 dark:text-neutral-400"
            style={MONO_STYLE}
          >
            Past briefs
          </h2>
          <span
            className="text-[11px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-500"
            style={MONO_STYLE}
          >
            {days.length} issue{days.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading && !digest ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 w-32 rounded bg-neutral-200" />
                <div className="mt-2 h-3 w-full max-w-xl rounded bg-neutral-200" />
                <div className="mt-1 h-3 w-2/3 rounded bg-neutral-200" />
              </div>
            ))}
          </div>
        ) : days.length === 0 ? (
          <p className="text-sm text-neutral-500" style={MONO_STYLE}>
            No briefs available.
          </p>
        ) : (
          <div className="space-y-0">
            {days.map((day) => {
              const isOpen = expandedDay === day.date;
              return (
                <div
                  key={day.date}
                  className="group border-b border-[#E8E2D2] transition-colors duration-150 hover:bg-[#F1ECDF]/40 dark:border-neutral-800"
                >
                  <button
                    onClick={() => toggleDay(day.date)}
                    className="flex w-full flex-col items-start gap-2 py-5 text-left sm:flex-row sm:items-center sm:gap-6"
                  >
                    <span
                      className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500 dark:text-neutral-400"
                      style={MONO_STYLE}
                    >
                      {friendlyDate(day.date)}
                    </span>
                    <p
                      className="flex-1 text-[15px] leading-[1.5] text-[#2E2A24]"
                      style={{ fontFamily: "Source Serif 4, ui-serif, Georgia, serif" }}
                    >
                      {day.summary || "No summary available."}
                    </p>
                    <span
                      className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-500"
                      style={MONO_STYLE}
                    >
                      {day.items.length} item{day.items.length === 1 ? "" : "s"}
                      <span
                        className="ml-2 inline-block transition-transform duration-200"
                        style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      >
                        ▼
                      </span>
                    </span>
                  </button>

                  {isOpen && (
                    <div className="pb-6 pl-0 sm:pl-[200px]">
                      <ol className="divide-y divide-[#E8E2D2] dark:divide-neutral-800">
                        {[...day.items]
                          .sort((a, b) => b.importance - a.importance || itemTs(b) - itemTs(a))
                          .map((item) => (
                            <li key={item.id} className="py-4">
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/link block"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <h4
                                    className="text-base font-semibold leading-snug text-[#1A1A1A] transition-colors group-hover/link:text-[#B3261E]"
                                    style={{ fontFamily: "Source Serif 4, ui-serif, Georgia, serif" }}
                                  >
                                    {item.title}
                                  </h4>
                                  {item.importance >= 4 && (
                                    <span
                                      className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white"
                                      style={{
                                        ...MONO_STYLE,
                                        backgroundColor: ACCENT,
                                        padding: "2px 8px",
                                        borderRadius: 4,
                                      }}
                                    >
                                      {item.importance === 5 ? "Must-read" : "Important"}
                                    </span>
                                  )}
                                </div>
                                <p
                                  className="mt-1 text-sm leading-relaxed text-[#56504A]"
                                  style={{ fontFamily: "Source Serif 4, ui-serif, Georgia, serif" }}
                                >
                                  {item.summary}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span
                                    className="text-[11px] text-neutral-500 dark:text-neutral-500"
                                    style={MONO_STYLE}
                                  >
                                    {item.source}
                                  </span>
                                  {item.company && (
                                    <span
                                      className="text-[11px] text-neutral-500 dark:text-neutral-500"
                                      style={MONO_STYLE}
                                    >
                                      · {item.company}
                                    </span>
                                  )}
                                  <span
                                    className="text-[11px] text-neutral-500 dark:text-neutral-500"
                                    style={MONO_STYLE}
                                  >
                                    · {shortDate(item.addedOn)}
                                  </span>
                                </div>
                              </a>
                            </li>
                          ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
        <div
          className="flex flex-col gap-2 border-t border-neutral-200 pt-4 text-[11px] text-neutral-500 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:text-neutral-500"
          style={MONO_STYLE}
        >
          <span className="uppercase tracking-wider">
            Built by{" "}
            <a
              href="https://shailvikumar.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-700 underline decoration-dotted underline-offset-4 hover:text-[#B3261E] dark:text-neutral-200 dark:hover:text-[#B3261E]"
            >
              Shailvi Kumar
            </a>
            {" "}— GitHub Actions + Claude API + Supabase + Lovable
          </span>
          <span className="uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
            Auto-refresh 10m
          </span>
        </div>
      </footer>
    </div>
  );
}
