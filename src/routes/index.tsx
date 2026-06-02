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
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: TechDigestPage,
});

// ---------- Types ----------
type Tag =
  | "launch"
  | "funding"
  | "leadership"
  | "regulation"
  | "open-source"
  | "competitive"
  | "research"
  | "product"
  | "infra"
  | "tooling";

const TAG_VOCAB: Tag[] = [
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

// Per-tag visual style: dot color + chip bg/text (light & dark).
// Keeps #2D55FF as the primary brand accent; tag colors are muted supporting hues.
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
const ACCENT = "#2D55FF";

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

function writeFiltersToURL(f: Filters) {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams();
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

// ---------- Helpers ----------
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
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

// ---------- Page ----------
function TechDigestPage() {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile sheet
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const hydrated = useRef(false);

  // Theme: respect system + manual override
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

  // Hydrate filters: URL > localStorage > defaults
  useEffect(() => {
    const fromUrl = readFiltersFromURL();
    let base: Filters = { ...DEFAULT_FILTERS };
    try {
      const ls = localStorage.getItem(LS_FILTERS);
      if (ls) base = { ...base, ...JSON.parse(ls) };
    } catch {}
    const next = { ...base, ...fromUrl };
    setFilters(next);
    hydrated.current = true;
  }, []);

  // Persist filters
  useEffect(() => {
    if (!hydrated.current) return;
    writeFiltersToURL(filters);
    try {
      localStorage.setItem(LS_FILTERS, JSON.stringify(filters));
    } catch {}
  }, [filters]);

  // Fetch
  const fetchDigest = useCallback(async () => {
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as Digest;
      setDigest(json);
      setError(false);
      setErrorDismissed(false);
      try {
        localStorage.setItem(LS_CACHE, JSON.stringify(json));
      } catch {}
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

  // ---------- Derived ----------
  const allItems = useMemo<Item[]>(() => {
    if (!digest) return [];
    return digest.days.flatMap((d) => d.items);
  }, [digest]);

  const dateCutoff = useMemo<Date | null>(() => {
    const now = new Date();
    if (filters.range === "latest") {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    if (filters.range === "7d") {
      const d = new Date(midnight);
      d.setDate(d.getDate() - 6);
      return d;
    }
    if (filters.range === "30d") {
      const d = new Date(midnight);
      d.setDate(d.getDate() - 29);
      return d;
    }
    return null;
  }, [filters.range]);

  const itemsInRange = useMemo(() => {
    if (!dateCutoff) return allItems;
    if (filters.range === "latest") {
      return allItems.filter((it) => {
        const ts = it.publishedAt ? new Date(it.publishedAt).getTime() : NaN;
        if (!Number.isNaN(ts)) return ts >= dateCutoff.getTime();
        // fallback to addedOn date when publishedAt is missing
        return parseYMD(it.addedOn) >= dateCutoff;
      });
    }
    return allItems.filter((it) => parseYMD(it.addedOn) >= dateCutoff);
  }, [allItems, dateCutoff, filters.range]);

  // Filter option lists (derived from items-in-range, like the spec says)
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

  // Apply non-date filters
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
      if (filters.tags.length) {
        if (!filters.tags.some((t) => (it.tags ?? []).includes(t))) return false;
      }
      if (q) {
        const hay = `${it.title} ${it.summary}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [itemsInRange, filters]);

  // Group by addedOn
  const groups = useMemo(() => {
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
  }, [filteredItems]);

  const todayBrief = digest?.days?.[0];

  const resetFilters = () => setFilters(DEFAULT_FILTERS);
  const hasAnyFilter =
    filters.range !== "latest" ||
    filters.companies.length > 0 ||
    filters.topics.length > 0 ||
    filters.tags.length > 0 ||
    filters.sources.length > 0 ||
    filters.importance !== 0 ||
    filters.q !== "";

  return (
    <div
      className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100"
      style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* Top bar */}
      <header className="mx-auto max-w-5xl px-4 pt-8 pb-4 sm:px-6">
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
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Daybreak
              </h1>
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

      {/* Error banner */}
      {error && !errorDismissed && (
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            <span>
              Could not reach the digest
              {digest ? " — showing cached copy." : "."}
            </span>
            <button
              onClick={() => setErrorDismissed(true)}
              className="rounded px-2 py-0.5 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Today's brief */}
      <section className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        {loading && !digest ? (
          <BriefSkeleton />
        ) : todayBrief ? (
          <article
            className="rounded-lg border-l-4 border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900/50"
            style={{ borderLeftColor: ACCENT, borderLeftWidth: 4 }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Latest Brief · {shortDate(todayBrief.date)}
            </div>
            <p className="mt-2 text-lg leading-relaxed text-neutral-900 dark:text-neutral-100 sm:text-xl">
              {todayBrief.summary}
            </p>
          </article>
        ) : null}
      </section>

      {/* Sticky filter bar (desktop) */}
      <div className="sticky top-0 z-20 mt-6 border-y border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Mobile trigger */}
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
              className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-transparent px-3 py-1.5 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 dark:border-neutral-800"
              style={{ caretColor: ACCENT }}
            />
            {hasAnyFilter && (
              <button
                onClick={resetFilters}
                className="text-xs font-medium"
                style={{ color: ACCENT }}
              >
                Reset
              </button>
            )}
          </div>

          {/* Desktop filter bar */}
          <div className="hidden md:block">
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              companyOptions={companyOptions}
              sourceOptions={sourceOptions}
              onReset={resetFilters}
              showReset={hasAnyFilter}
            />
          </div>
        </div>
      </div>

      {/* Mobile filter sheet */}
      {filtersOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-xl border-t border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Filters</h2>
              <button
                className="text-sm font-medium"
                onClick={() => setFiltersOpen(false)}
                style={{ color: ACCENT }}
              >
                Done
              </button>
            </div>
            <FilterBar
              filters={filters}
              setFilters={setFilters}
              companyOptions={companyOptions}
              sourceOptions={sourceOptions}
              onReset={resetFilters}
              showReset={hasAnyFilter}
              stacked
            />
          </div>
        </div>
      )}

      {/* Items */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {loading && !digest ? (
          <ListSkeleton />
        ) : groups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              No matches. Try widening your filters.
            </p>
            <button
              onClick={resetFilters}
              className="mt-3 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-white"
              style={{ backgroundColor: ACCENT }}
            >
              Reset
            </button>
          </div>
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

      <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-xs text-neutral-400 sm:px-6">
        Auto-refreshes every 10 minutes.
      </footer>
    </div>
  );
}

// ---------- Components ----------

function FilterBar({
  filters,
  setFilters,
  companyOptions,
  sourceOptions,
  onReset,
  showReset,
  stacked = false,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  companyOptions: string[];
  sourceOptions: string[];
  onReset: () => void;
  showReset: boolean;
  stacked?: boolean;
}) {
  return (
    <div
      className={
        stacked
          ? "flex flex-col gap-3"
          : "flex flex-wrap items-center gap-2 py-2.5"
      }
    >
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
        label="Source"
        options={sourceOptions}
        value={filters.sources}
        onChange={(v) => setFilters({ ...filters, sources: v })}
      />
      <TagDropdown
        value={filters.tags}
        onChange={(v) => setFilters({ ...filters, tags: v })}
      />
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
      {showReset && (
        <button
          onClick={onReset}
          className="ml-auto text-xs font-medium underline-offset-2 hover:underline"
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
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  };

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

function TagDropdown({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (tag: string) => {
    onChange(value.includes(tag) ? value.filter((v) => v !== tag) : [...value, tag]);
  };

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

function ItemCard({ item }: { item: Item }) {
  const secondary = (item.secondaryCompanies ?? []).slice(0, 2);
  const tags = item.tags ?? [];
  return (
    <article className="group relative flex gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.12)] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
      {/* Left rail: vertical importance */}
      <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
        <ImportanceBar value={item.importance} />
      </div>

      <div className="min-w-0 flex-1">
        {/* Header row: company + secondary + date */}
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
            <span className="text-neutral-500 dark:text-neutral-400">
              · {item.topic}
            </span>
          )}
          <span className="ml-auto text-neutral-400 dark:text-neutral-500">
            {shortDate(item.addedOn)}
          </span>
        </div>

        {/* Title */}
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

        {/* Summary */}
        {item.summary && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {item.summary}
          </p>
        )}

        {/* Footer: source + colored tag chips */}
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
        <div
          key={i}
          className="animate-pulse rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <div className="h-3 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="mt-3 h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      ))}
    </div>
  );
}

// silence unused
void ymd;
