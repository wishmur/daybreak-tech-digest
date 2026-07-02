import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import daybreakLogo from "@/assets/daybreak-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daybreak — Daily AI & tech digest for PMs" },
      {
        name: "description",
        content:
          "A small script reads my feeds every morning, asks Claude what actually matters to a PM today, and posts the top ten here by 10 AM ET.",
      },
      { property: "og:title", content: "Daybreak" },
      {
        property: "og:description",
        content:
          "Daily curated AI & tech news for product managers, posted by 10 AM ET.",
      },
      { property: "og:image", content: daybreakLogo.url },
      { name: "twitter:image", content: daybreakLogo.url },
    ],
    links: [
      { rel: "icon", type: "image/png", href: daybreakLogo.url },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: TechDigestPage,
});

// ---------- Types ----------
const TAG_VOCAB = [
  "launch",
  "funding",
  "leadership",
  "regulation",
  "open-source",
  "competitive",
  "research",
  "product",
  "infra",
  "tooling",
];

const TAG_STYLES: Record<string, { dot: string; chip: string; label?: string }> = {
  launch:       { dot: "#2D55FF", chip: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300", label: "Launch" },
  funding:      { dot: "#10B981", chip: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", label: "Funding" },
  leadership:   { dot: "#8B5CF6", chip: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300", label: "Leadership" },
  regulation:   { dot: "#F59E0B", chip: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300", label: "Regulation" },
  "open-source":{ dot: "#14B8A6", chip: "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300", label: "Open source" },
  competitive:  { dot: "#EF4444", chip: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", label: "Competitive" },
  research:     { dot: "#6366F1", chip: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300", label: "Research" },
  product:      { dot: "#0EA5E9", chip: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", label: "Product" },
  infra:        { dot: "#64748B", chip: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300", label: "Infra" },
  tooling:      { dot: "#A855F7", chip: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-300", label: "Tooling" },
};
function tagStyle(t: string) {
  return TAG_STYLES[t] ?? { dot: "#9CA3AF", chip: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300", label: t };
}
function tagLabel(t: string) {
  return tagStyle(t).label ?? t;
}

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

const DATA_URL =
  "https://raw.githubusercontent.com/wishmur/tech-digest/main/data/digest.json";
const REFRESH_MS = 10 * 60 * 1000;
const LS_CACHE = "techDigest:cache";
const LS_FILTERS = "techDigest:filters";
const LS_THEME = "techDigest:theme";
const LS_VIEWS = "techDigest:savedViews";
const ACCENT = "#0066FF";

type DateRange = "latest" | "7d" | "30d" | "all";
type ImportanceMin = 0 | 3 | 4 | 5;

type Filters = {
  range: DateRange;
  companies: string[];
  topics: string[];
  tags: string[];
  sources: string[];
  importance: ImportanceMin;
  q: string;
};

type SavedView = { name: string; filters: Filters };

type ViewKey = "digest" | "threads" | "companies" | "matrix" | "trends";

const DEFAULT_FILTERS: Filters = {
  range: "latest",
  companies: [],
  topics: [],
  tags: [],
  sources: [],
  importance: 0,
  q: "",
};

// ---------- URL <-> Filters ----------
function readFiltersFromURL(): Partial<Filters> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Partial<Filters> = {};
  const range = p.get("range");
  if (range === "latest" || range === "7d" || range === "30d" || range === "all")
    out.range = range;
  const multi = (k: string) => {
    const v = p.get(k);
    return v ? v.split(",").filter(Boolean) : undefined;
  };
  const c = multi("companies"); if (c) out.companies = c;
  const t = multi("topics"); if (t) out.topics = t;
  const tg = multi("tags"); if (tg) out.tags = tg;
  const s = multi("sources"); if (s) out.sources = s;
  const imp = p.get("imp");
  if (imp === "3" || imp === "4" || imp === "5") out.importance = Number(imp) as ImportanceMin;
  const q = p.get("q");
  if (q) out.q = q;
  return out;
}

function writeFiltersToURL(f: Filters, view: ViewKey) {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams();
  if (view !== "digest") p.set("view", view);
  if (f.range !== DEFAULT_FILTERS.range) p.set("range", f.range);
  if (f.companies.length) p.set("companies", f.companies.join(","));
  if (f.topics.length) p.set("topics", f.topics.join(","));
  if (f.tags.length) p.set("tags", f.tags.join(","));
  if (f.sources.length) p.set("sources", f.sources.join(","));
  if (f.importance) p.set("imp", String(f.importance));
  if (f.q) p.set("q", f.q);
  const qs = p.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

function readViewFromURL(): ViewKey {
  if (typeof window === "undefined") return "digest";
  const v = new URLSearchParams(window.location.search).get("view");
  if (v === "threads" || v === "companies" || v === "matrix" || v === "trends") return v;
  return "digest";
}

// ---------- Helpers ----------
function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function friendlyGroupLabel(dateStr: string): string {
  const d = parseYMD(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
function friendlyDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
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
// Recency + importance combined score for a rolling window (48h for Latest)
function combinedScore(it: Item, now: number, windowMs: number): number {
  const age = Math.max(0, now - itemTs(it));
  const recency = Math.max(0, 1 - age / windowMs); // 1 -> just now, 0 -> at window edge
  const imp = (it.importance || 0) / 5;
  // importance weighted heavier so a 5 published earlier beats a 2 published later
  return imp * 0.7 + recency * 0.3;
}

function isoWeek(d: Date): string {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// A stable palette used for trend chart / company chips
const COMPANY_PALETTE = [
  "#2D55FF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#0EA5E9", "#EC4899", "#14B8A6", "#F97316", "#6366F1",
];
function companyColor(idx: number) {
  return COMPANY_PALETTE[idx % COMPANY_PALETTE.length];
}

// ---------- Page ----------
function TechDigestPage() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [view, setView] = useState<ViewKey>("digest");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const hydrated = useRef(false);

  // Theme
  useEffect(() => {
    const stored = localStorage.getItem(LS_THEME) as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem(LS_THEME, next);
  };

  // Hydrate filters & view
  useEffect(() => {
    const fromUrl = readFiltersFromURL();
    let base: Filters = { ...DEFAULT_FILTERS };
    try {
      const ls = localStorage.getItem(LS_FILTERS);
      if (ls) base = { ...base, ...JSON.parse(ls) };
    } catch {}
    setFilters({ ...base, ...fromUrl });
    setView(readViewFromURL());
    try {
      const raw = localStorage.getItem(LS_VIEWS);
      if (raw) setSavedViews(JSON.parse(raw));
    } catch {}
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    writeFiltersToURL(filters, view);
    try {
      localStorage.setItem(LS_FILTERS, JSON.stringify(filters));
    } catch {}
  }, [filters, view]);

  // Fetch
  const fetchDigest = useCallback(async () => {
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as Digest;
      setDigest(json);
      setError(false);
      setErrorDismissed(false);
      try { localStorage.setItem(LS_CACHE, JSON.stringify(json)); } catch {}
    } catch {
      setError(true);
      try {
        const cached = localStorage.getItem(LS_CACHE);
        if (cached && !digest) setDigest(JSON.parse(cached) as Digest);
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [digest]);

  useEffect(() => {
    fetchDigest();
    const id = setInterval(fetchDigest, REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Derived: base data ----------
  const allItems = useMemo<Item[]>(
    () => (digest ? digest.days.flatMap((d) => d.items) : []),
    [digest],
  );

  // Latest brief regenerated from top 3 items by importance for the most recent day
  const latestDay = digest?.days?.[0];
  const generatedBrief = useMemo(() => {
    if (!latestDay) return null;
    const top = [...latestDay.items]
      .sort((a, b) => b.importance - a.importance || itemTs(b) - itemTs(a))
      .slice(0, 3);
    if (top.length === 0) return latestDay.summary || null;
    const parts = top.map((it) => {
      const who = it.company || it.source;
      const what = it.title.replace(/[.!?]+$/, "");
      return `${who}: ${what}`;
    });
    return parts.join(" · ");
  }, [latestDay]);

  // Storylines: same topic OR company on 3+ consecutive days
  const storylines = useMemo(() => {
    if (!digest) return [] as { key: string; label: string; days: number; kind: "company" | "topic"; latestDate: string }[];
    // Sort days ascending
    const days = [...digest.days].sort((a, b) => (a.date < b.date ? -1 : 1));
    // Build sets per day
    const perDay: { date: string; companies: Set<string>; topics: Set<string> }[] = days.map((d) => {
      const companies = new Set<string>();
      const topics = new Set<string>();
      for (const it of d.items) {
        if (it.company) companies.add(it.company);
        for (const c of it.secondaryCompanies ?? []) if (c) companies.add(c);
        if (it.topic) topics.add(it.topic);
      }
      return { date: d.date, companies, topics };
    });

    type Run = { key: string; kind: "company" | "topic"; startIdx: number; endIdx: number };
    const runs: Record<string, Run> = {};
    const finalized: Run[] = [];

    const step = (kind: "company" | "topic", getSet: (i: number) => Set<string>) => {
      const active: Record<string, Run> = {};
      for (let i = 0; i < perDay.length; i++) {
        const set = getSet(i);
        // Extend existing
        for (const key of Object.keys(active)) {
          if (set.has(key)) active[key].endIdx = i;
          else {
            if (active[key].endIdx - active[key].startIdx + 1 >= 3) finalized.push(active[key]);
            delete active[key];
          }
        }
        // Start new
        for (const key of set) {
          if (!active[key]) active[key] = { key, kind, startIdx: i, endIdx: i };
        }
      }
      for (const key of Object.keys(active)) {
        if (active[key].endIdx - active[key].startIdx + 1 >= 3) finalized.push(active[key]);
      }
    };
    step("company", (i) => perDay[i].companies);
    step("topic", (i) => perDay[i].topics);

    // Prefer the longest active-through-today runs
    const today = days[days.length - 1]?.date;
    const results = finalized
      .map((r) => {
        const dayCount = r.endIdx - r.startIdx + 1;
        const latestDate = perDay[r.endIdx].date;
        return {
          key: `${r.kind}:${r.key}`,
          label: r.key,
          kind: r.kind,
          days: dayCount,
          latestDate,
          active: latestDate === today,
        };
      })
      .filter((r) => r.days >= 3)
      .sort((a, b) => Number(b.active) - Number(a.active) || b.days - a.days)
      .slice(0, 6);

    void runs;
    return results;
  }, [digest]);

  // Date cutoff for filtering
  const dateCutoff = useMemo<Date | null>(() => {
    const now = new Date();
    if (filters.range === "latest") return new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
    if (filters.range === "7d") { const d = new Date(midnight); d.setDate(d.getDate() - 6); return d; }
    if (filters.range === "30d") { const d = new Date(midnight); d.setDate(d.getDate() - 29); return d; }
    return null;
  }, [filters.range]);

  const itemsInRange = useMemo(() => {
    if (!dateCutoff) return allItems;
    if (filters.range === "latest") {
      return allItems.filter((it) => itemTs(it) >= dateCutoff.getTime());
    }
    return allItems.filter((it) => parseYMD(it.addedOn) >= dateCutoff);
  }, [allItems, dateCutoff, filters.range]);

  // Option lists
  const companyOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of itemsInRange) {
      if (it.company) counts.set(it.company, (counts.get(it.company) ?? 0) + 1);
      for (const c of it.secondaryCompanies ?? [])
        if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
  }, [itemsInRange]);
  const topicOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of itemsInRange) if (it.topic) set.add(it.topic);
    return [...set].sort();
  }, [itemsInRange]);
  const sourceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of itemsInRange) if (it.source) set.add(it.source);
    return [...set].sort();
  }, [itemsInRange]);

  const filteredItems = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return itemsInRange.filter((it) => {
      if (filters.importance && it.importance < filters.importance) return false;
      if (filters.companies.length) {
        const involved = [it.company, ...(it.secondaryCompanies ?? [])];
        if (!filters.companies.some((c) => involved.includes(c))) return false;
      }
      if (filters.topics.length && !filters.topics.includes(it.topic)) return false;
      if (filters.sources.length && !filters.sources.includes(it.source)) return false;
      if (filters.tags.length && !filters.tags.some((t) => (it.tags ?? []).includes(t))) return false;
      if (q) {
        const hay = `${it.title} ${it.summary}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [itemsInRange, filters]);

  // Latest view: combined score sorting (48h window). Other ranges: group by day.
  const isLatest = filters.range === "latest";
  const latestSorted = useMemo(() => {
    if (!isLatest) return [] as Item[];
    const now = Date.now();
    const winMs = 48 * 60 * 60 * 1000;
    return [...filteredItems].sort(
      (a, b) => combinedScore(b, now, winMs) - combinedScore(a, now, winMs),
    );
  }, [filteredItems, isLatest]);

  const groups = useMemo(() => {
    if (isLatest) return [] as [string, Item[]][];
    const map = new Map<string, Item[]>();
    for (const it of filteredItems) {
      if (!map.has(it.addedOn)) map.set(it.addedOn, []);
      map.get(it.addedOn)!.push(it);
    }
    const ordered = [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
    for (const [, arr] of ordered) {
      arr.sort(
        (a, b) =>
          b.importance - a.importance ||
          (a.company || "").localeCompare(b.company || ""),
      );
    }
    return ordered;
  }, [filteredItems, isLatest]);

  const resetFilters = () => setFilters(DEFAULT_FILTERS);
  const hasAnyFilter =
    filters.range !== "latest" ||
    filters.companies.length > 0 ||
    filters.topics.length > 0 ||
    filters.tags.length > 0 ||
    filters.sources.length > 0 ||
    filters.importance !== 0 ||
    filters.q !== "";

  // Saved views
  const saveCurrentView = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = [...savedViews.filter((v) => v.name !== trimmed), { name: trimmed, filters }];
    setSavedViews(next);
    try { localStorage.setItem(LS_VIEWS, JSON.stringify(next)); } catch {}
  };
  const applyView = (v: SavedView) => setFilters(v.filters);
  const deleteView = (name: string) => {
    const next = savedViews.filter((v) => v.name !== name);
    setSavedViews(next);
    try { localStorage.setItem(LS_VIEWS, JSON.stringify(next)); } catch {}
  };

  const showFilterBar = view === "digest";

  return (
    <div
      className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* Top bar */}
      <header className="mx-auto max-w-6xl px-4 pt-8 pb-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <img
              src={daybreakLogo.url}
              alt="Daybreak logo"
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 rounded-lg sm:h-14 sm:w-14"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Daybreak</h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                A small script reads my feeds every morning, asks Claude what
                actually matters to a PM today, and posts the top ten here by
                10 AM ET. Built because I was losing mornings to the firehose.
              </p>
              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                {loading && !digest
                  ? "Loading…"
                  : digest?.lastUpdated
                    ? `Last updated: ${friendlyDateTime(digest.lastUpdated)}`
                    : "—"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="shrink-0 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            {theme === "dark" ? "Light" : "Dark"} mode
          </button>
        </div>
      </header>

      {/* View tabs */}
      <nav className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap gap-1 border-b border-neutral-200 dark:border-neutral-800">
          {[
            { k: "digest", label: "Digest" },
            { k: "threads", label: "Story threads" },
            { k: "companies", label: "Companies" },
            { k: "matrix", label: "Competitive matrix" },
            { k: "trends", label: "Trends" },
          ].map((t) => {
            const active = view === (t.k as ViewKey);
            return (
              <button
                key={t.k}
                onClick={() => setView(t.k as ViewKey)}
                className={
                  "relative -mb-px px-3 py-2 text-sm font-medium transition " +
                  (active
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200")
                }
              >
                {t.label}
                {active && (
                  <span
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                    style={{ backgroundColor: ACCENT }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Error banner */}
      {error && !errorDismissed && (
        <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
          <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <span>Could not reach the digest{digest ? " — showing cached copy." : "."}</span>
            <button
              onClick={() => setErrorDismissed(true)}
              className="rounded px-2 py-0.5 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Digest view */}
      {view === "digest" && (
        <>
          <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
            {loading && !digest ? (
              <BriefSkeleton />
            ) : latestDay ? (
              <article
                className="rounded-lg border-l-4 border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900/50"
                style={{ borderLeftColor: ACCENT, borderLeftWidth: 4 }}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Latest Brief · {shortDate(latestDay.date)}
                </div>
                <p className="mt-2 text-lg leading-relaxed text-neutral-900 dark:text-neutral-100 sm:text-xl">
                  {generatedBrief}
                </p>
                {storylines.length > 0 && (
                  <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Storylines in progress
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {storylines.map((s) => (
                        <li key={s.key}>
                          <button
                            onClick={() => {
                              if (s.kind === "company") {
                                setFilters({ ...DEFAULT_FILTERS, range: "30d", companies: [s.label] });
                                setView("companies");
                              } else {
                                setFilters({ ...DEFAULT_FILTERS, range: "30d", topics: [s.label] });
                                setView("digest");
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
                          >
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: ACCENT }}
                            />
                            {s.label}
                            <span className="text-neutral-400 dark:text-neutral-500">
                              · Day {s.days}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ) : null}
          </section>

          {/* Sticky filter bar */}
          {showFilterBar && (
            <div className="sticky top-0 z-20 mt-6 border-y border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
              <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className="flex items-center justify-between gap-2 py-2 md:hidden">
                  <button
                    onClick={() => setFiltersOpen(true)}
                    className="rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium dark:border-neutral-800"
                  >
                    Filters{hasAnyFilter ? " ·" : ""}
                  </button>
                  <input
                    value={filters.q}
                    onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    placeholder="Search…"
                    className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-transparent px-3 py-1.5 text-sm placeholder:text-neutral-400 focus:outline-none dark:border-neutral-800"
                    style={{ caretColor: ACCENT }}
                  />
                  {hasAnyFilter && (
                    <button onClick={resetFilters} className="text-xs font-medium" style={{ color: ACCENT }}>
                      Reset
                    </button>
                  )}
                </div>
                <div className="hidden md:block">
                  <FilterBar
                    filters={filters}
                    setFilters={setFilters}
                    companyOptions={companyOptions}
                    topicOptions={topicOptions}
                    sourceOptions={sourceOptions}
                    onReset={resetFilters}
                    showReset={hasAnyFilter}
                    savedViews={savedViews}
                    onSaveView={saveCurrentView}
                    onApplyView={applyView}
                    onDeleteView={deleteView}
                  />
                </div>
              </div>
            </div>
          )}

          {filtersOpen && (
            <div className="fixed inset-0 z-30 md:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
              <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-xl border-t border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold">Filters</h2>
                  <button className="text-sm font-medium" onClick={() => setFiltersOpen(false)} style={{ color: ACCENT }}>
                    Done
                  </button>
                </div>
                <FilterBar
                  filters={filters}
                  setFilters={setFilters}
                  companyOptions={companyOptions}
                  topicOptions={topicOptions}
                  sourceOptions={sourceOptions}
                  onReset={resetFilters}
                  showReset={hasAnyFilter}
                  savedViews={savedViews}
                  onSaveView={saveCurrentView}
                  onApplyView={applyView}
                  onDeleteView={deleteView}
                  stacked
                />
              </div>
            </div>
          )}

          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
            {loading && !digest ? (
              <ListSkeleton />
            ) : (isLatest ? latestSorted.length === 0 : groups.length === 0) ? (
              <EmptyState onReset={resetFilters} />
            ) : isLatest ? (
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Latest — ranked by importance & recency
                </h3>
                <div className="space-y-3">
                  {latestSorted.map((it) => (
                    <ItemCard key={it.id} item={it} />
                  ))}
                </div>
              </section>
            ) : (
              <div className="space-y-8">
                {groups.map(([day, items]) => (
                  <section key={day}>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      {friendlyGroupLabel(day)}
                    </h3>
                    <div className="space-y-3">
                      {items.map((it) => (
                        <ItemCard key={it.id} item={it} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {view === "threads" && (
        <ThreadsView items={allItems} loading={loading && !digest} />
      )}
      {view === "companies" && (
        <CompaniesView
          items={allItems}
          loading={loading && !digest}
          initialCompany={filters.companies[0]}
        />
      )}
      {view === "matrix" && (
        <MatrixView items={allItems} loading={loading && !digest} />
      )}
      {view === "trends" && (
        <TrendsView items={allItems} loading={loading && !digest} />
      )}

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs text-neutral-400 sm:px-6">
        Auto-refreshes every 10 minutes.
      </footer>
    </div>
  );
}

// ---------- Filter Bar ----------
function FilterBar({
  filters,
  setFilters,
  companyOptions,
  topicOptions,
  sourceOptions,
  onReset,
  showReset,
  savedViews,
  onSaveView,
  onApplyView,
  onDeleteView,
  stacked = false,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  companyOptions: string[];
  topicOptions: string[];
  sourceOptions: string[];
  onReset: () => void;
  showReset: boolean;
  savedViews: SavedView[];
  onSaveView: (name: string) => void;
  onApplyView: (v: SavedView) => void;
  onDeleteView: (name: string) => void;
  stacked?: boolean;
}) {
  return (
    <div className={stacked ? "flex flex-col gap-3" : "flex flex-wrap items-center gap-2 py-2.5"}>
      <Segmented
        value={filters.range}
        onChange={(v) => setFilters({ ...filters, range: v as DateRange })}
        options={[
          { value: "latest", label: "Latest" },
          { value: "7d", label: "Last 7 days" },
          { value: "30d", label: "Last 30 days" },
        ]}
      />
      <MultiSelect
        label="Company"
        options={companyOptions}
        value={filters.companies}
        onChange={(v) => setFilters({ ...filters, companies: v })}
      />
      <MultiSelect
        label="Topic"
        options={topicOptions}
        value={filters.topics}
        onChange={(v) => setFilters({ ...filters, topics: v })}
      />
      <MultiSelect
        label="Source"
        options={sourceOptions}
        value={filters.sources}
        onChange={(v) => setFilters({ ...filters, sources: v })}
      />
      <TagDropdown value={filters.tags} onChange={(v) => setFilters({ ...filters, tags: v })} />
      <input
        value={filters.q}
        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        placeholder="Search title & summary…"
        className={
          "min-w-[180px] flex-1 rounded-md border border-neutral-200 bg-transparent px-3 py-1.5 text-sm placeholder:text-neutral-400 focus:outline-none dark:border-neutral-800 " +
          (stacked ? "w-full" : "")
        }
        style={{ caretColor: ACCENT }}
      />
      <SavedViewsControl
        savedViews={savedViews}
        onSave={onSaveView}
        onApply={onApplyView}
        onDelete={onDeleteView}
      />
      {showReset && (
        <button
          onClick={onReset}
          className="text-xs font-medium underline-offset-2 hover:underline"
          style={{ color: ACCENT }}
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-md border border-neutral-200 p-0.5 dark:border-neutral-800">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={
              "rounded-[5px] px-2.5 py-1 text-xs font-medium transition " +
              (active
                ? "text-white"
                : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100")
            }
            style={active ? { backgroundColor: ACCENT } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function useOutsideClose(open: boolean, setOpen: (v: boolean) => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, setOpen]);
  return ref;
}

function MultiSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, setOpen);
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
      >
        {label}
        {value.length > 0 && (
          <span
            className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
            style={{ backgroundColor: ACCENT }}
          >
            {value.length}
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 max-h-72 w-60 overflow-y-auto rounded-md border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {options.length === 0 && (
            <div className="px-2 py-2 text-xs text-neutral-500">No options</div>
          )}
          {options.map((o) => {
            const checked = value.includes(o);
            return (
              <label
                key={o}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(o)}
                  className="h-3.5 w-3.5"
                  style={{ accentColor: ACCENT }}
                />
                <span className="truncate">{o}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TagDropdown({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, setOpen);
  const toggle = (t: string) =>
    onChange(value.includes(t) ? value.filter((v) => v !== t) : [...value, t]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
      >
        Tags
        {value.length > 0 && (
          <span
            className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
            style={{ backgroundColor: ACCENT }}
          >
            {value.length}
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-md border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {TAG_VOCAB.map((t) => {
            const checked = value.includes(t);
            const st = tagStyle(t);
            return (
              <label
                key={t}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(t)}
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ accentColor: ACCENT }}
                />
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: st.dot }}
                />
                <span>{tagLabel(t)}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SavedViewsControl({
  savedViews,
  onSave,
  onApply,
  onDelete,
}: {
  savedViews: SavedView[];
  onSave: (name: string) => void;
  onApply: (v: SavedView) => void;
  onDelete: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, setOpen);
  const [name, setName] = useState("");
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
      >
        Saved views
        {savedViews.length > 0 && (
          <span className="ml-1 text-neutral-400">({savedViews.length})</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-md border border-neutral-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-2 flex gap-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this filter combo"
              className="min-w-0 flex-1 rounded border border-neutral-200 bg-transparent px-2 py-1 text-xs dark:border-neutral-800"
            />
            <button
              onClick={() => {
                onSave(name);
                setName("");
              }}
              className="rounded px-2 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: ACCENT }}
            >
              Save
            </button>
          </div>
          {savedViews.length === 0 ? (
            <div className="px-1 py-1.5 text-xs text-neutral-500">No saved views yet.</div>
          ) : (
            <ul className="max-h-60 space-y-0.5 overflow-y-auto">
              {savedViews.map((v) => (
                <li key={v.name} className="flex items-center gap-1">
                  <button
                    onClick={() => onApply(v)}
                    className="flex-1 truncate rounded px-2 py-1 text-left text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    {v.name}
                  </button>
                  <button
                    onClick={() => onDelete(v.name)}
                    className="rounded px-2 py-1 text-[11px] text-neutral-400 hover:text-red-500"
                    aria-label={`Delete ${v.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Item Card ----------
function ItemCard({ item }: { item: Item }) {
  const secondary = (item.secondaryCompanies ?? []).slice(0, 2);
  const tags = item.tags ?? [];
  return (
    <article className="group relative flex gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.12)] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
      <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
        <ImportanceBar value={item.importance} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          {item.company && (
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-white"
              style={{ backgroundColor: ACCENT }}
            >
              {item.company}
            </span>
          )}
          {secondary.map((c) => (
            <span
              key={c}
              className="rounded-md border border-neutral-300 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
            >
              {c}
            </span>
          ))}
          {item.topic && (
            <span className="text-neutral-500 dark:text-neutral-400">· {item.topic}</span>
          )}
          <ImportanceBadge value={item.importance} />
          <span className="ml-auto text-neutral-400 dark:text-neutral-500">
            {shortDate(item.addedOn)}
          </span>
        </div>
        <h4 className="mt-2 text-[15px] font-semibold leading-snug">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="decoration-neutral-300 underline-offset-4 hover:underline dark:decoration-neutral-600"
          >
            {item.title}
          </a>
        </h4>
        {item.summary && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {item.summary}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {item.source}
          </span>
          {tags.map((t) => {
            const st = tagStyle(t);
            return (
              <span
                key={t}
                className={
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-medium " +
                  st.chip
                }
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: st.dot }}
                />
                {tagLabel(t)}
              </span>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function ImportanceBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, value || 0));
  return (
    <div
      className="flex flex-col-reverse items-center gap-1"
      aria-label={`Importance ${v} of 5`}
      title={`Importance ${v} / 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={
            "block h-1.5 w-1.5 rounded-full " +
            (i < v ? "" : "bg-neutral-200 dark:bg-neutral-700")
          }
          style={i < v ? { backgroundColor: ACCENT } : undefined}
        />
      ))}
    </div>
  );
}

function ImportanceBadge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, value || 0));
  if (v <= 2) return null;
  const label = v === 5 ? "Must-read" : v === 4 ? "High" : "Notable";
  const cls =
    v === 5
      ? "border-transparent text-white"
      : v === 4
        ? "border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-500/20 dark:text-blue-300 dark:bg-blue-500/10"
        : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300";
  return (
    <span
      className={"inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide " + cls}
      style={v === 5 ? { backgroundColor: ACCENT } : undefined}
    >
      {label}
    </span>
  );
}

function BriefSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900/50">
      <div className="h-3 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-3 h-4 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-2 h-4 w-5/6 rounded bg-neutral-200 dark:bg-neutral-800" />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="h-3 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="mt-3 h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        No matches. Try widening your filters.
      </p>
      <button
        onClick={onReset}
        className="mt-3 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-white"
        style={{ backgroundColor: ACCENT }}
      >
        Reset
      </button>
    </div>
  );
}

// ---------- Threads View ----------
function ThreadsView({ items, loading }: { items: Item[]; loading: boolean }) {
  const threads = useMemo(() => {
    // Group by topic + primary company. Merge threads where secondaryCompanies overlap with primary of another.
    const byKey = new Map<string, Item[]>();
    for (const it of items) {
      const key = `${it.topic || "—"}::${it.company || "—"}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(it);
    }
    const list = [...byKey.entries()].map(([key, arr]) => {
      const sorted = [...arr].sort((a, b) => itemTs(a) - itemTs(b));
      const [topic, company] = key.split("::");
      const dates = sorted.map((i) => i.addedOn);
      return {
        key,
        title: `${company !== "—" ? company : "Various"} — ${topic !== "—" ? topic : "Unclassified"}`,
        topic,
        company,
        items: sorted,
        start: dates[0],
        end: dates[dates.length - 1],
        maxImportance: Math.max(...sorted.map((i) => i.importance || 0)),
      };
    });
    return list
      .filter((t) => t.items.length >= 2)
      .sort((a, b) => b.items.length - a.items.length || b.maxImportance - a.maxImportance);
  }, [items]);

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><ListSkeleton /></div>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
        Auto-detected running storylines — items grouped by topic + primary company.
      </p>
      {threads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          No multi-item threads yet.
        </div>
      ) : (
        <div className="space-y-6">
          {threads.map((t) => (
            <section key={t.key} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-800">
                <h3 className="text-lg font-semibold">{t.title}</h3>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {shortDate(t.start)} – {shortDate(t.end)} · {t.items.length} items
                </div>
              </header>
              <ol className="relative ml-3 space-y-4 border-l border-neutral-200 pl-5 dark:border-neutral-800">
                {t.items.map((it) => (
                  <li key={it.id} className="relative">
                    <span
                      className="absolute -left-[26px] top-1.5 inline-block h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-neutral-900"
                      style={{ backgroundColor: ACCENT }}
                    />
                    <div className="text-[11px] uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                      {shortDate(it.addedOn)} · {it.source}
                    </div>
                    <a
                      href={it.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block text-[15px] font-semibold leading-snug hover:underline"
                    >
                      {it.title}
                    </a>
                    {it.summary && (
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                        {it.summary}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

// ---------- Companies View ----------
function CompaniesView({
  items,
  loading,
  initialCompany,
}: {
  items: Item[];
  loading: boolean;
  initialCompany?: string;
}) {
  const companies = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      if (it.company) counts.set(it.company, (counts.get(it.company) ?? 0) + 1);
      for (const c of it.secondaryCompanies ?? [])
        if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items]);

  const [selected, setSelected] = useState<string | undefined>(initialCompany ?? companies[0]?.[0]);
  useEffect(() => {
    if (!selected && companies.length) setSelected(companies[0][0]);
  }, [companies, selected]);

  const filtered = useMemo(() => {
    if (!selected) return [];
    return items
      .filter((it) => it.company === selected || (it.secondaryCompanies ?? []).includes(selected))
      .sort((a, b) => itemTs(b) - itemTs(a));
  }, [items, selected]);

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const avg = filtered.reduce((s, it) => s + (it.importance || 0), 0) / filtered.length;
    const topicCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();
    for (const it of filtered) {
      if (it.topic) topicCounts.set(it.topic, (topicCounts.get(it.topic) ?? 0) + 1);
      for (const t of it.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
    const top = (m: Map<string, number>, n: number) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
    return {
      total: filtered.length,
      avg,
      topics: top(topicCounts, 3),
      tags: top(tagCounts, 4),
    };
  }, [filtered]);

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><ListSkeleton /></div>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-4 md:self-start">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Companies
          </h3>
          <div className="max-h-[70vh] space-y-0.5 overflow-y-auto rounded-lg border border-neutral-200 p-1 dark:border-neutral-800">
            {companies.map(([name, count]) => {
              const active = selected === name;
              return (
                <button
                  key={name}
                  onClick={() => setSelected(name)}
                  className={
                    "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm " +
                    (active
                      ? "bg-neutral-100 font-semibold dark:bg-neutral-800"
                      : "hover:bg-neutral-50 dark:hover:bg-neutral-900")
                  }
                >
                  <span className="truncate">{name}</span>
                  <span className="text-[11px] text-neutral-400">{count}</span>
                </button>
              );
            })}
          </div>
        </aside>
        <div>
          {selected && stats ? (
            <>
              <header className="mb-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
                <h2 className="text-xl font-bold">{selected}</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <Stat label="Mentions" value={String(stats.total)} />
                  <Stat label="Avg importance" value={stats.avg.toFixed(1)} />
                  <Stat
                    label="Top topics"
                    value={stats.topics.map(([t]) => t).join(", ") || "—"}
                  />
                  <Stat
                    label="Top tags"
                    value={stats.tags.map(([t]) => tagLabel(t)).join(", ") || "—"}
                  />
                </div>
              </header>
              <div className="space-y-3">
                {filtered.map((it) => <ItemCard key={it.id} item={it} />)}
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
              Select a company to see its coverage.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
    </div>
  );
}

// ---------- Competitive Matrix ----------
function MatrixView({ items, loading }: { items: Item[]; loading: boolean }) {
  const pairs = useMemo(() => {
    const map = new Map<string, { a: string; b: string; items: Item[] }>();
    for (const it of items) {
      const all = new Set<string>();
      if (it.company) all.add(it.company);
      for (const c of it.secondaryCompanies ?? []) if (c) all.add(c);
      const list = [...all];
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const [a, b] = [list[i], list[j]].sort();
          const key = `${a}||${b}`;
          if (!map.has(key)) map.set(key, { a, b, items: [] });
          map.get(key)!.items.push(it);
        }
      }
    }
    return [...map.values()].sort((x, y) => y.items.length - x.items.length).slice(0, 40);
  }, [items]);

  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><ListSkeleton /></div>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
        Pairs of companies that show up in the same items — most contested rivalries first.
      </p>
      {pairs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          No co-occurring companies yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-2">Rivalry</th>
                <th className="px-4 py-2 w-24 text-right">Items</th>
                <th className="px-4 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {pairs.map(({ a, b, items: pi }) => {
                const key = `${a}||${b}`;
                const isOpen = expanded === key;
                return [
                  <tr key={key} className="border-t border-neutral-200 dark:border-neutral-800">
                    <td className="px-4 py-2 font-medium">
                      {a} <span className="text-neutral-400">vs</span> {b}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{pi.length}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => setExpanded(isOpen ? null : key)}
                        className="text-xs font-medium"
                        style={{ color: ACCENT }}
                      >
                        {isOpen ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>,
                  isOpen ? (
                    <tr key={key + ":d"} className="bg-neutral-50/50 dark:bg-neutral-900/50">
                      <td colSpan={3} className="px-4 py-3">
                        <ul className="space-y-2">
                          {pi
                            .sort((x, y) => itemTs(y) - itemTs(x))
                            .map((it) => (
                              <li key={it.id} className="text-sm">
                                <span className="text-[11px] uppercase tracking-wide text-neutral-400">
                                  {shortDate(it.addedOn)}
                                </span>{" "}
                                <a
                                  href={it.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium hover:underline"
                                >
                                  {it.title}
                                </a>
                              </li>
                            ))}
                        </ul>
                      </td>
                    </tr>
                  ) : null,
                ];

              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

// ---------- Trends View ----------
function TrendsView({ items, loading }: { items: Item[]; loading: boolean }) {
  const { weeks, byCompany, allCompanies } = useMemo(() => {
    const weekSet = new Set<string>();
    const perCompanyWeek = new Map<string, Map<string, Item[]>>();
    for (const it of items) {
      const ts = itemTs(it);
      const week = isoWeek(new Date(ts));
      weekSet.add(week);
      const cSet = new Set<string>();
      if (it.company) cSet.add(it.company);
      for (const c of it.secondaryCompanies ?? []) if (c) cSet.add(c);
      for (const c of cSet) {
        if (!perCompanyWeek.has(c)) perCompanyWeek.set(c, new Map());
        const wk = perCompanyWeek.get(c)!;
        if (!wk.has(week)) wk.set(week, []);
        wk.get(week)!.push(it);
      }
    }
    const weeksSorted = [...weekSet].sort();
    const totals = [...perCompanyWeek.entries()]
      .map(([c, wm]) => [c, [...wm.values()].reduce((s, a) => s + a.length, 0)] as const)
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c);
    return { weeks: weeksSorted, byCompany: perCompanyWeek, allCompanies: totals };
  }, [items]);

  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (selected.length === 0 && allCompanies.length) {
      setSelected(allCompanies.slice(0, 4));
    }
  }, [allCompanies, selected.length]);
  const [metric, setMetric] = useState<"count" | "importance">("count");

  const series = useMemo(() => {
    return selected.map((c, idx) => {
      const wk = byCompany.get(c);
      const points = weeks.map((w) => {
        const arr = wk?.get(w) ?? [];
        const v =
          metric === "count"
            ? arr.length
            : arr.length
              ? arr.reduce((s, i) => s + (i.importance || 0), 0) / arr.length
              : 0;
        return v;
      });
      return { company: c, color: companyColor(idx), points };
    });
  }, [selected, weeks, byCompany, metric]);

  const maxY = useMemo(() => {
    const m = Math.max(1, ...series.flatMap((s) => s.points));
    return metric === "importance" ? 5 : Math.ceil(m * 1.1);
  }, [series, metric]);

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><ListSkeleton /></div>;

  const W = 800, H = 260, PAD_L = 32, PAD_R = 12, PAD_T = 12, PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const xFor = (i: number) =>
    PAD_L + (weeks.length <= 1 ? innerW / 2 : (i * innerW) / (weeks.length - 1));
  const yFor = (v: number) => PAD_T + innerH - (v / maxY) * innerH;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Weekly {metric === "count" ? "item count" : "average importance"} per company.
        </p>
        <div className="ml-auto">
          <Segmented
            value={metric}
            onChange={(v) => setMetric(v as "count" | "importance")}
            options={[
              { value: "count", label: "Item count" },
              { value: "importance", label: "Avg importance" },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        {weeks.length === 0 ? (
          <div className="py-10 text-center text-sm text-neutral-500">No data.</div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            {/* y grid */}
            {Array.from({ length: 4 }).map((_, i) => {
              const y = PAD_T + (innerH * i) / 3;
              const val = maxY - (maxY * i) / 3;
              return (
                <g key={i}>
                  <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" strokeDasharray="3 4" />
                  <text x={4} y={y + 4} className="fill-neutral-400" fontSize="10">
                    {metric === "importance" ? val.toFixed(1) : Math.round(val)}
                  </text>
                </g>
              );
            })}
            {/* x labels */}
            {weeks.map((w, i) => {
              if (weeks.length > 10 && i % Math.ceil(weeks.length / 8) !== 0 && i !== weeks.length - 1) return null;
              return (
                <text
                  key={w}
                  x={xFor(i)}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize="10"
                  className="fill-neutral-400"
                >
                  {w.slice(5)}
                </text>
              );
            })}
            {/* lines */}
            {series.map((s) => {
              const d = s.points
                .map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`)
                .join(" ");
              return (
                <g key={s.company}>
                  <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {s.points.map((v, i) => (
                    <circle key={i} cx={xFor(i)} cy={yFor(v)} r={2.5} fill={s.color} />
                  ))}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Toggle companies
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {allCompanies.map((c) => {
            const idx = selected.indexOf(c);
            const active = idx !== -1;
            const color = active ? companyColor(idx) : "#9CA3AF";
            return (
              <button
                key={c}
                onClick={() =>
                  setSelected((prev) =>
                    prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                  )
                }
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition " +
                  (active
                    ? "border-neutral-300 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                    : "border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-500")
                }
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {c}
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
