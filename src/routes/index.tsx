import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import daybreakLogo from "@/assets/daybreak-logo.png.asset.json";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700&display=swap",
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

// Editorial tag styling — no colored chips; hairline uppercase labels.
// The single accent (masthead red) is reserved for Must-read badges only.
const TAG_STYLES: Record<string, { dot: string; chip: string; label?: string }> = {
  launch:        { dot: "#1A1A1A", chip: "border border-[#DDD8CC] text-[#2E2A24]", label: "Launch" },
  funding:       { dot: "#1A1A1A", chip: "border border-[#DDD8CC] text-[#2E2A24]", label: "Funding" },
  leadership:    { dot: "#1A1A1A", chip: "border border-[#DDD8CC] text-[#2E2A24]", label: "Leadership" },
  regulation:    { dot: "#1A1A1A", chip: "border border-[#DDD8CC] text-[#2E2A24]", label: "Regulation" },
  "open-source": { dot: "#1A1A1A", chip: "border border-[#DDD8CC] text-[#2E2A24]", label: "Open source" },
  competitive:   { dot: "#1A1A1A", chip: "border border-[#DDD8CC] text-[#2E2A24]", label: "Competitive" },
  research:      { dot: "#1A1A1A", chip: "border border-[#DDD8CC] text-[#2E2A24]", label: "Research" },
  product:       { dot: "#1A1A1A", chip: "border border-[#DDD8CC] text-[#2E2A24]", label: "Product" },
  infra:         { dot: "#1A1A1A", chip: "border border-[#DDD8CC] text-[#2E2A24]", label: "Infra" },
  tooling:       { dot: "#1A1A1A", chip: "border border-[#DDD8CC] text-[#2E2A24]", label: "Tooling" },
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
const ACCENT = "#B3261E";

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
  "#3F3A2E", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
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
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [view, setView] = useState<ViewKey>("digest");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [kbdIdx, setKbdIdx] = useState<number>(-1);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const hydrated = useRef(false);

  // Cmd/Ctrl+K palette + j/k keyboard navigation across visible stories
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
        return;
      }
      if (paletteOpen) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === "j" || e.key === "k") {
        const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-story]"));
        if (!nodes.length) return;
        e.preventDefault();
        setKbdIdx((i) => {
          const next = e.key === "j" ? Math.min(nodes.length - 1, i + 1) : Math.max(0, i - 1);
          const target = nodes[next];
          if (target) {
            nodes.forEach((n, ni) => n.setAttribute("data-kbd-active", ni === next ? "true" : "false"));
            target.scrollIntoView({ block: "center", behavior: "smooth" });
          }
          return next;
        });
      } else if (e.key === "Enter" && kbdIdx >= 0) {
        const nodes = document.querySelectorAll<HTMLElement>("[data-story]");
        const target = nodes[kbdIdx];
        const link = target?.getAttribute("data-story-link");
        if (link) {
          e.preventDefault();
          window.open(link, "_blank", "noopener,noreferrer");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, kbdIdx]);


  // Theme — editorial light is the default; night edition can be toggled later.
  useEffect(() => {
    setTheme("light");
    document.documentElement.classList.remove("dark");
    try { localStorage.setItem(LS_THEME, "light"); } catch {}
  }, []);
  const toggleTheme = () => { /* night edition disabled for now */ };

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

  // Editorial lede pulled directly from the day's JSON `summary` field.
  const latestDay = digest?.days?.[0];
  const generatedBrief = useMemo(() => {
    if (!latestDay) return null;
    const s = (latestDay.summary || "").trim();
    if (s) return s;
    // Fallback: synthesize a one-liner from top items if the day is missing a summary.
    const top = [...latestDay.items]
      .sort((a, b) => b.importance - a.importance || itemTs(b) - itemTs(a))
      .slice(0, 3);
    if (top.length === 0) return null;
    return top
      .map((it) => `${it.company || it.source}: ${it.title.replace(/[.!?]+$/, "")}`)
      .join(" · ");
  }, [latestDay]);

  // Top stories for the latest day: importance 4-5, or top 10 by importance if fewer than 10 qualify.
  const topStories = useMemo<Item[]>(() => {
    if (!latestDay) return [];
    const sorted = [...latestDay.items].sort(
      (a, b) => b.importance - a.importance || itemTs(b) - itemTs(a),
    );
    const high = sorted.filter((it) => (it.importance ?? 0) >= 4);
    const pool = high.length > 0 ? high : sorted;
    return pool.slice(0, 10);
  }, [latestDay]);

  // Brief automation caption metadata: unique sources in latest day + last generation time
  const briefMeta = useMemo(() => {
    if (!latestDay) return { sourceCount: 0, generatedAt: "" };
    const sources = new Set<string>();
    for (const it of latestDay.items) if (it.source) sources.add(it.source);
    let generatedAt = "";
    const iso = digest?.lastUpdated;
    if (iso) {
      try {
        generatedAt = new Date(iso).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        });
      } catch {
        generatedAt = "";
      }
    }
    return { sourceCount: sources.size, generatedAt };
  }, [latestDay, digest?.lastUpdated]);

  // Full editorial-style date header for the latest brief
  const latestDayLongDate = useMemo(() => {
    if (!latestDay) return "";
    const d = parseYMD(latestDay.date);
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
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
      className="min-h-screen"
      style={{ fontFamily: 'Source Serif 4, ui-serif, Georgia, serif', backgroundColor: '#FAF7F2', color: '#1A1A1A' }}
    >
      {/* Editorial masthead */}
      <StatusBar
        lastUpdated={digest?.lastUpdated}
        totalItems={allItems.length}
        dayN={digest?.days?.length ?? 0}
        loading={loading && !digest}
      />

      <header className="mx-auto max-w-6xl px-4 pt-8 pb-6 sm:px-6 sm:pt-10">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <h1
              className="font-bold leading-[0.9] tracking-[-0.02em]"
              style={{ fontFamily: 'Source Serif 4, ui-serif, Georgia, serif', fontSize: 'clamp(48px, 9vw, 96px)', color: '#1A1A1A' }}
            >
              Daybreak
            </h1>
            <p
              className="mt-4 max-w-2xl text-[15px] leading-[1.55] text-[#2E2A24]"
              style={{ fontFamily: 'Source Serif 4, ui-serif, Georgia, serif' }}
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
              className="h-14 w-14 rounded-sm opacity-90"
            />
            <Link
              to="/how-it-works"
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#56504A] underline-offset-[6px] hover:text-[#1A1A1A] hover:underline"
              style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}
            >
              System
            </Link>
          </div>
        </div>
        {/* thin editorial rule */}
        <div className="mt-6 h-px w-full" style={{ backgroundColor: '#DDD8CC' }} />
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
          <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
            {loading && !digest ? (
              <BriefSkeleton />
            ) : latestDay ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400"
                    style={MONO_STYLE}
                  >
                    <span
                      className="mr-2 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full align-middle"
                      style={{ backgroundColor: ACCENT }}
                    />
                    LATEST BRIEF
                  </span>
                </div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-5xl">
                  {latestDayLongDate}
                </h1>

                <figure
                  className="relative mt-6 border-l bg-transparent pl-5 sm:mt-8 sm:pl-8"
                  style={{ borderLeftColor: ACCENT, borderLeftWidth: 3 }}
                >
                  <blockquote
                    className="text-[22px] font-normal leading-[1.45] text-neutral-900 dark:text-neutral-100 sm:text-[30px] sm:leading-[1.35]"
                    style={{ fontFamily: "Inter, ui-sans-serif, system-ui", letterSpacing: "-0.01em" }}
                  >
                    <TypedBrief text={generatedBrief ?? ""} />
                  </blockquote>
                  <figcaption
                    className="mt-4 text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-500"
                    style={MONO_STYLE}
                  >
                    Generated by Claude
                    {briefMeta.generatedAt ? ` at ${briefMeta.generatedAt}` : ""}
                    {briefMeta.sourceCount ? ` from ${briefMeta.sourceCount} source${briefMeta.sourceCount === 1 ? "" : "s"}` : ""}
                  </figcaption>
                </figure>

                {storylines.length > 0 && (
                  <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                    <div
                      className="text-[11px] font-semibold uppercase tracking-[0.15em] text-neutral-500 dark:text-neutral-400"
                      style={MONO_STYLE}
                    >
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

                {topStories.length > 0 && (
                  <div className="mt-10">
                    <div className="mb-4 flex items-baseline justify-between border-b border-[#DDD8CC] pb-2 dark:border-neutral-800">
                      <h2
                        className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400"
                        style={MONO_STYLE}
                      >
                        Top stories · {topStories.length} item{topStories.length === 1 ? "" : "s"} today
                      </h2>
                    </div>
                    <ol className="divide-y divide-[#DDD8CC] dark:divide-neutral-800">
                      {topStories.map((it, i) => (
                        <FeaturedStoryCard key={it.id} item={it} rank={i + 1} />
                      ))}
                    </ol>
                  </div>
                )}
              </>
            ) : null}
          </section>



          {/* Sticky filter bar */}
          {showFilterBar && (
            <div className="sticky top-[30px] z-20 mt-6 border-y border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
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

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6">
        <div className="flex flex-col gap-2 border-t border-neutral-200 pt-4 text-[11px] text-neutral-500 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:text-neutral-500" style={MONO_STYLE}>
          <span className="uppercase tracking-wider">
            Built by{" "}
            <a
              href="https://shailvi.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-700 underline decoration-dotted underline-offset-4 hover:text-[#B3261E] dark:text-neutral-200 dark:hover:text-[#B3261E]"
            >
              Shailvi Kumar
            </a>
            {" "}— GitHub Actions + Claude API + Supabase + Lovable
          </span>
          <span className="uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
            <kbd className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] dark:border-neutral-700">⌘K</kbd> palette · <kbd className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] dark:border-neutral-700">j</kbd>/<kbd className="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] dark:border-neutral-700">k</kbd> nav · auto-refresh 10m
          </span>
        </div>
      </footer>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={allItems}
        companyOptions={companyOptions}
        topicOptions={topicOptions}
        onSelectCompany={(c) => { setFilters({ ...DEFAULT_FILTERS, range: "30d", companies: [c] }); setView("digest"); setPaletteOpen(false); }}
        onSelectTopic={(t) => { setFilters({ ...DEFAULT_FILTERS, range: "30d", topics: [t] }); setView("digest"); setPaletteOpen(false); }}
        onSelectRange={(r) => { setFilters({ ...filters, range: r }); setView("digest"); setPaletteOpen(false); }}
        onSelectView={(v) => { setView(v); setPaletteOpen(false); }}
      />
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

// ---------- Item Card (importance-tiered) ----------
const MONO_STYLE: React.CSSProperties = {
  fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace",
};

// Typing / reveal animation for the daily brief. Runs once per unique text.
function TypedBrief({ text }: { text: string }) {
  const [count, setCount] = useState(0);
  const lastText = useRef<string>("");
  useEffect(() => {
    if (!text) return;
    if (lastText.current === text) return;
    lastText.current = text;
    setCount(0);
    const total = text.length;
    // Duration scales with length but capped so long briefs don't drag.
    const perChar = Math.max(8, Math.min(22, 1400 / Math.max(1, total)));
    let i = 0;
    const id = window.setInterval(() => {
      i += Math.max(1, Math.round(total / 180)); // step multiple chars for smoothness
      if (i >= total) {
        setCount(total);
        window.clearInterval(id);
      } else {
        setCount(i);
      }
    }, perChar);
    return () => window.clearInterval(id);
  }, [text]);
  const shown = text.slice(0, count);
  const done = count >= text.length;
  return (
    <>
      <span>{shown}</span>
      {!done && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[0.9em] w-[2px] translate-y-[0.1em] animate-pulse align-middle"
          style={{ backgroundColor: ACCENT }}
        />
      )}
    </>
  );
}

// Featured card for the top stories of the day
function FeaturedStoryCard({ item, rank }: { item: Item; rank: number }) {
  const label = (item.company || item.source || "?").trim();
  const initial = label.charAt(0).toUpperCase();
  const imp = Math.max(0, Math.min(5, item.importance || 0));
  const isTop = imp >= 5;
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex h-full flex-col gap-3 border border-neutral-200 bg-white p-4 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[#B3261E] dark:border-neutral-800 dark:bg-neutral-900"
      style={{
        borderRadius: 6,
        ...(isTop
          ? {
              borderLeft: `2px solid ${ACCENT}`,
              boxShadow: `0 0 0 1px ${ACCENT}22, 0 0 24px -8px ${ACCENT}55`,
            }
          : {}),
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center text-[15px] font-semibold text-white"
          style={{
            backgroundColor: ACCENT,
            borderRadius: 4,
            fontFamily: "Inter, ui-sans-serif, system-ui",
          }}
          aria-hidden
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-[11px] font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-200"
            style={MONO_STYLE}
          >
            {label}
          </div>
          <div
            className="truncate text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
            style={MONO_STYLE}
          >
            {item.topic || item.source}
          </div>
        </div>
        <span
          className="shrink-0 text-[10px] tabular-nums text-neutral-400 dark:text-neutral-600"
          style={MONO_STYLE}
        >
          {String(rank).padStart(2, "0")}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold leading-snug text-neutral-900 group-hover:underline dark:text-neutral-50">
        {item.title}
      </h3>
      {item.summary && (
        <p className="line-clamp-3 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">
          {item.summary}
        </p>
      )}
      <div className="mt-auto flex items-center justify-between pt-1">
        <span
          className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
          style={MONO_STYLE}
        >
          {item.source}
        </span>
        <ImportanceBadge value={item.importance} />
      </div>
    </a>
  );
}


function ItemCard({ item }: { item: Item }) {
  const v = Math.max(0, Math.min(5, item.importance || 0));
  if (v <= 2) return <ItemRow item={item} />;
  return <ItemCardFull item={item} tier={v >= 5 ? "hero" : "standard"} />;
}

function ItemRow({ item }: { item: Item }) {
  const tags = (item.tags ?? []).slice(0, 2);
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      data-story
      data-story-link={item.link}
      className="group flex items-center gap-3 border border-neutral-200 bg-white px-3 py-2 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[#B3261E] focus:outline-none focus-visible:border-[#B3261E] data-[kbd-active=true]:border-[#B3261E] data-[kbd-active=true]:shadow-[0_0_0_1px_#B3261E] dark:border-neutral-800 dark:bg-neutral-900"
      style={{ borderRadius: 4 }}
    >

      <span
        className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
        style={MONO_STYLE}
      >
        {shortDate(item.addedOn)}
      </span>
      {item.company && (
        <span
          className="shrink-0 text-[11px] font-semibold text-neutral-700 dark:text-neutral-200"
          style={MONO_STYLE}
        >
          {item.company}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-800 group-hover:underline dark:text-neutral-200">
        {item.title}
      </span>
      <span
        className="hidden shrink-0 text-[10px] uppercase tracking-wider text-neutral-400 sm:inline dark:text-neutral-500"
        style={MONO_STYLE}
      >
        {item.source}
      </span>
      {tags.map((t) => {
        const st = tagStyle(t);
        return (
          <span
            key={t}
            className="hidden shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider text-neutral-500 sm:inline-flex dark:text-neutral-400"
            style={MONO_STYLE}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
            {tagLabel(t)}
          </span>
        );
      })}
      <span
        className="shrink-0 text-[10px] tabular-nums text-neutral-400 dark:text-neutral-600"
        style={MONO_STYLE}
      >
        #{item.id.slice(0, 6)}
      </span>
    </a>
  );
}

function ItemCardFull({ item, tier }: { item: Item; tier: "hero" | "standard" }) {
  const secondary = (item.secondaryCompanies ?? []).slice(0, 3);
  const tags = item.tags ?? [];
  const isHero = tier === "hero";
  return (
    <article
      data-story
      data-story-link={item.link}
      className={
        "group relative flex gap-4 border bg-white transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[#B3261E] data-[kbd-active=true]:border-[#B3261E] data-[kbd-active=true]:shadow-[0_0_0_1px_#B3261E] dark:bg-neutral-900 " +
        (isHero
          ? "border-neutral-200 dark:border-neutral-800 p-5"
          : "border-neutral-200 dark:border-neutral-800 p-4")
      }
      style={{
        borderRadius: 6,
        ...(isHero
          ? {
              borderLeft: `2px solid ${ACCENT}`,
              boxShadow: `0 0 0 1px ${ACCENT}22, 0 0 24px -6px ${ACCENT}55`,
            }
          : {}),
      }}
    >

      <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
        <ImportanceBar value={item.importance} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {item.company && (
            <span
              className="text-[11px] font-semibold text-white"
              style={{
                ...MONO_STYLE,
                backgroundColor: ACCENT,
                padding: "2px 6px",
                borderRadius: 3,
                letterSpacing: "0.02em",
              }}
            >
              {item.company.toUpperCase()}
            </span>
          )}
          {secondary.map((c) => (
            <span
              key={c}
              className="border border-neutral-300 text-[10px] font-medium text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
              style={{ ...MONO_STYLE, padding: "1px 5px", borderRadius: 3 }}
            >
              {c.toUpperCase()}
            </span>
          ))}
          {item.topic && (
            <span
              className="text-[10px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
              style={MONO_STYLE}
            >
              · {item.topic}
            </span>
          )}
          <ImportanceBadge value={item.importance} />
          <span
            className="ml-auto text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
            style={MONO_STYLE}
          >
            {shortDate(item.addedOn)}
          </span>
        </div>
        <h4 className={"mt-2 font-semibold leading-snug " + (isHero ? "text-[18px]" : "text-[15px]")}>
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
          <p
            className={
              "mt-1 leading-relaxed text-neutral-600 dark:text-neutral-300 " +
              (isHero ? "text-[14px]" : "line-clamp-2 text-sm")
            }
          >
            {item.summary}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
            style={MONO_STYLE}
          >
            {item.source}
          </span>
          <span
            className="text-[10px] tabular-nums text-neutral-400 dark:text-neutral-600"
            style={MONO_STYLE}
          >
            #{item.id.slice(0, 8)}
          </span>
          <span className="flex flex-wrap items-center gap-1.5">
            {tags.map((t) => {
              const st = tagStyle(t);
              return (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-600 dark:text-neutral-300"
                  style={{
                    ...MONO_STYLE,
                    padding: "2px 6px",
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "currentColor",
                    opacity: 0.85,
                  }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: st.dot }}
                  />
                  {tagLabel(t)}
                </span>
              );
            })}
          </span>
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

// ---------- Status Bar ----------
function StatusBar({
  lastUpdated,
  totalItems,
  dayN,
  loading,
}: {
  lastUpdated?: string;
  totalItems: number;
  dayN: number;
  loading: boolean;
}) {
  const sync = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "—";
  const sansMeta = { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' } as const;
  return (
    <div
      className="sticky top-0 z-40 backdrop-blur"
      style={{ backgroundColor: 'rgba(250, 247, 242, 0.92)', borderBottom: '1px solid #DDD8CC' }}
    >
      <div
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 overflow-x-auto whitespace-nowrap px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#7A7568] sm:px-6"
        style={sansMeta}
      >
        <span className="flex items-center gap-2">
          <span
            className={"inline-block h-1.5 w-1.5 rounded-full " + (loading ? "" : "terminal-live-dot")}
            style={{ backgroundColor: loading ? '#B08A00' : '#B3261E' }}
            aria-hidden="true"
          />
          <span className="font-medium text-[#1A1A1A]">
            Issue No. <span className="tabular-nums">{dayN || '—'}</span>
          </span>
          <span aria-hidden="true" className="text-[#B4AE9C]">·</span>
          <span>Updated <span className="tabular-nums text-[#2E2A24]">{sync}</span> ET</span>
        </span>
        <span className="hidden items-center gap-2 sm:flex">
          <span>{totalItems.toLocaleString()} items indexed</span>
        </span>
      </div>
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
  const now = Date.now();
  const DAY_MS = 86400000;

  type ThreadDay = { date: string; items: Item[]; importance: number };
  type Thread = {
    key: string;
    title: string;
    topic: string;
    company: string;
    items: Item[];
    days: ThreadDay[];
    start: string;
    end: string;
    spanDays: number;
    uniqueDays: number;
    maxImportance: number;
    recent7: number;
    prev7: number;
    velocity: number; // -1..+1
    lastTs: number;
  };

  const threads = useMemo<Thread[]>(() => {
    const byKey = new Map<string, Item[]>();
    for (const it of items) {
      const key = `${it.topic || "—"}::${it.company || "—"}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push(it);
    }
    const list: Thread[] = [];
    for (const [key, arr] of byKey.entries()) {
      const sorted = [...arr].sort((a, b) => itemTs(a) - itemTs(b));
      const [topic, company] = key.split("::");
      // Group by day
      const dayMap = new Map<string, Item[]>();
      for (const it of sorted) {
        if (!dayMap.has(it.addedOn)) dayMap.set(it.addedOn, []);
        dayMap.get(it.addedOn)!.push(it);
      }
      const days: ThreadDay[] = [...dayMap.entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .map(([date, its]) => ({
          date,
          items: its,
          importance: its.reduce((s, i) => s + (i.importance || 0), 0),
        }));
      const start = days[0].date;
      const end = days[days.length - 1].date;
      const spanDays =
        Math.round(
          (parseYMD(end).getTime() - parseYMD(start).getTime()) / DAY_MS,
        ) + 1;
      // Velocity: last 7 days vs previous 7 days by item count
      let recent7 = 0;
      let prev7 = 0;
      for (const it of sorted) {
        const age = now - itemTs(it);
        if (age <= 7 * DAY_MS) recent7 += 1;
        else if (age <= 14 * DAY_MS) prev7 += 1;
      }
      const denom = Math.max(1, recent7 + prev7);
      const velocity = (recent7 - prev7) / denom; // -1..+1
      list.push({
        key,
        title: `${company !== "—" ? company : "Various"} · ${topic !== "—" ? topic : "Unclassified"}`,
        topic,
        company,
        items: sorted,
        days,
        start,
        end,
        spanDays,
        uniqueDays: days.length,
        maxImportance: Math.max(...sorted.map((i) => i.importance || 0)),
        recent7,
        prev7,
        velocity,
        lastTs: itemTs(sorted[sorted.length - 1]),
      });
    }
    return list
      .filter((t) => t.uniqueDays >= 2)
      .sort(
        (a, b) =>
          b.recent7 - a.recent7 ||
          b.spanDays - a.spanDays ||
          b.lastTs - a.lastTs,
      );
  }, [items, now]);

  if (loading)
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <ListSkeleton />
      </div>
    );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">
        Auto-detected running storylines — each node is a day the thread appeared, sized by that day's importance.
      </p>
      {threads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          No multi-day threads yet.
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((t) => (
            <ThreadTrack key={t.key} thread={t} />
          ))}
        </div>
      )}
    </main>
  );
}

function ThreadTrack({
  thread: t,
}: {
  thread: {
    key: string;
    title: string;
    company: string;
    topic: string;
    items: Item[];
    days: { date: string; items: Item[]; importance: number }[];
    start: string;
    end: string;
    spanDays: number;
    uniqueDays: number;
    maxImportance: number;
    recent7: number;
    prev7: number;
    velocity: number;
    lastTs: number;
  };
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const isMajor = t.spanDays > 14;
  const DAY_MS = 86400000;
  const PX_PER_DAY = 22;
  const startMs = parseYMD(t.start).getTime();
  const trackWidth = Math.max(120, (t.spanDays - 1) * PX_PER_DAY + 40);
  const maxDayImp = Math.max(1, ...t.days.map((d) => d.importance));

  const velocityLabel =
    t.velocity > 0.15 ? "up" : t.velocity < -0.15 ? "down" : "flat";
  const velocityColor =
    velocityLabel === "up"
      ? "#16A34A"
      : velocityLabel === "down"
        ? "#DC2626"
        : "#737373";
  const velocityArrow =
    velocityLabel === "up" ? "▲" : velocityLabel === "down" ? "▼" : "▬";

  const selectedDay = selectedDate
    ? t.days.find((d) => d.date === selectedDate)
    : null;

  return (
    <section
      className="border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
      style={{
        borderRadius: 6,
        ...(isMajor
          ? {
              borderLeft: `2px solid ${ACCENT}`,
              boxShadow: `0 0 0 1px ${ACCENT}22`,
            }
          : {}),
      }}
    >
      <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">
          {t.title}
        </h3>
        <span
          className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
          style={MONO_STYLE}
        >
          Day {t.spanDays}
        </span>
        {isMajor && (
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white"
            style={{
              ...MONO_STYLE,
              backgroundColor: ACCENT,
              padding: "2px 6px",
              borderRadius: 3,
            }}
          >
            Major storyline
          </span>
        )}
        <span
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider"
          style={{ ...MONO_STYLE, color: velocityColor }}
          title={`Recent 7d: ${t.recent7} · Prev 7d: ${t.prev7}`}
        >
          <span>{velocityArrow}</span>
          <span>
            {velocityLabel === "up"
              ? "Accelerating"
              : velocityLabel === "down"
                ? "Cooling"
                : "Steady"}
          </span>
        </span>
        <span
          className="ml-auto text-[11px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
          style={MONO_STYLE}
        >
          {shortDate(t.start)} – {shortDate(t.end)} · {t.items.length} items
        </span>
      </header>

      <div className="relative overflow-x-auto pb-2">
        <div
          className="relative h-16"
          style={{ width: `${trackWidth}px`, minWidth: "100%" }}
        >
          {/* Connecting line */}
          <div
            className="absolute left-5 right-5 top-1/2 h-px -translate-y-1/2 bg-neutral-300 dark:bg-neutral-700"
            aria-hidden
          />
          {/* Nodes */}
          {t.days.map((d) => {
            const offset =
              (parseYMD(d.date).getTime() - startMs) / DAY_MS;
            const left = offset * PX_PER_DAY + 20;
            const sizeRatio = d.importance / maxDayImp;
            const size = Math.round(8 + sizeRatio * 16); // 8..24
            const isSelected = selectedDate === d.date;
            return (
              <button
                key={d.date}
                onClick={() =>
                  setSelectedDate(isSelected ? null : d.date)
                }
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition hover:scale-110 focus:outline-none"
                style={{
                  left: `${left}px`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: isSelected ? ACCENT : "transparent",
                  border: `2px solid ${ACCENT}`,
                  boxShadow: isSelected
                    ? `0 0 0 3px ${ACCENT}33`
                    : "none",
                }}
                title={`${shortDate(d.date)} · ${d.items.length} item${d.items.length === 1 ? "" : "s"} · importance ${d.importance}`}
                aria-label={`${shortDate(d.date)}, ${d.items.length} items`}
              />
            );
          })}
        </div>
        {/* Axis labels: start / mid / end */}
        <div
          className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
          style={{ ...MONO_STYLE, width: `${trackWidth}px`, minWidth: "100%" }}
        >
          <span>{shortDate(t.start)}</span>
          <span>{shortDate(t.end)}</span>
        </div>
      </div>

      {selectedDay && (
        <div className="mt-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <div
            className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
            style={MONO_STYLE}
          >
            <span>
              {shortDate(selectedDay.date)} · {selectedDay.items.length} item
              {selectedDay.items.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            >
              Close ×
            </button>
          </div>
          <div className="space-y-2">
            {selectedDay.items.map((it) => (
              <a
                key={it.id}
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-neutral-200 p-3 transition hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                style={{ borderRadius: 4 }}
              >
                <div
                  className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
                  style={MONO_STYLE}
                >
                  {it.source}
                </div>
                <div className="mt-0.5 text-[14px] font-semibold leading-snug text-neutral-900 dark:text-neutral-50">
                  {it.title}
                </div>
                {it.summary && (
                  <p className="mt-1 line-clamp-2 text-[13px] text-neutral-600 dark:text-neutral-300">
                    {it.summary}
                  </p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
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
// ---------- Terminal-styled recharts tooltip ----------
function TerminalTooltip({ active, payload, label, valueFormatter }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string; stroke?: string; fill?: string }>;
  label?: string | number;
  valueFormatter?: (v: number) => string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-[11px] shadow-lg"
      style={{ background: "#FAF7F2", borderColor: "#DDD8CC", fontFamily: "var(--font-mono, JetBrains Mono, monospace)" }}
    >
      {label !== undefined && (
        <div className="mb-1 uppercase tracking-wide text-neutral-400">{String(label)}</div>
      )}
      <div className="space-y-0.5">
        {payload.filter((p) => p && (p.value ?? 0) !== 0).map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color ?? p.stroke ?? p.fill ?? "#666" }} />
            <span className="text-neutral-300">{p.name ?? p.dataKey}</span>
            <span className="ml-auto tabular-nums text-neutral-100">
              {valueFormatter ? valueFormatter(Number(p.value ?? 0)) : Number(p.value ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Competitive Matrix (heatmap) ----------
function MatrixView({ items, loading }: { items: Item[]; loading: boolean }) {
  const { companies, matrix, pairStories, maxVal } = useMemo(() => {
    const mentions = new Map<string, number>();
    for (const it of items) {
      const set = new Set<string>();
      if (it.company) set.add(it.company);
      for (const c of it.secondaryCompanies ?? []) if (c) set.add(c);
      for (const c of set) mentions.set(c, (mentions.get(c) ?? 0) + 1);
    }
    const companies = [...mentions.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([c]) => c);
    const idx = new Map(companies.map((c, i) => [c, i]));
    const size = companies.length;
    const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    const pairStories = new Map<string, Item[]>();
    for (const it of items) {
      const set = new Set<string>();
      if (it.company) set.add(it.company);
      for (const c of it.secondaryCompanies ?? []) if (c) set.add(c);
      const list = [...set].filter((c) => idx.has(c));
      for (let i = 0; i < list.length; i++) {
        const a = idx.get(list[i])!;
        matrix[a][a] += 1;
        for (let j = i + 1; j < list.length; j++) {
          const b = idx.get(list[j])!;
          matrix[a][b] += 1;
          matrix[b][a] += 1;
          const [x, y] = [list[i], list[j]].sort();
          const key = `${x}||${y}`;
          if (!pairStories.has(key)) pairStories.set(key, []);
          pairStories.get(key)!.push(it);
        }
      }
    }
    let maxVal = 0;
    for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (i !== j && matrix[i][j] > maxVal) maxVal = matrix[i][j];
    return { companies, matrix, pairStories, maxVal: Math.max(1, maxVal) };
  }, [items]);

  const [sel, setSel] = useState<{ a: string; b: string } | null>(null);

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><ListSkeleton /></div>;

  const cellColor = (v: number, isDiag: boolean) => {
    if (isDiag) return "#0F1620";
    if (v === 0) return "#0D0D0D";
    const t = Math.pow(v / maxVal, 0.6);
    const alpha = 0.08 + t * 0.92;
    return `rgba(0, 102, 255, ${alpha.toFixed(3)})`;
  };
  const textColor = (v: number) => (v / maxVal > 0.55 ? "#F5F7FF" : "#8A93A6");

  const selKey = sel ? [sel.a, sel.b].sort().join("||") : null;
  const selStories = selKey ? (pairStories.get(selKey) ?? []).slice().sort((x, y) => itemTs(y) - itemTs(x)) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Co-occurrence heatmap. Darkest blue = companies that show up together most often.
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-neutral-500" style={{ fontFamily: "var(--font-mono, JetBrains Mono, monospace)" }}>
            {companies.length} companies · max pair {maxVal}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-neutral-500" style={{ fontFamily: "var(--font-mono, JetBrains Mono, monospace)" }}>
          <span>low</span>
          <div className="h-2 w-32 rounded-sm" style={{ background: "linear-gradient(to right, rgba(0,102,255,0.08), rgba(0,102,255,1))" }} />
          <span>high</span>
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          No co-occurring companies yet.
        </div>
      ) : (
        <div className={`grid gap-4 ${sel ? "lg:grid-cols-[1fr_360px]" : ""}`}>
          <div className="overflow-auto rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <table className="border-separate" style={{ borderSpacing: 2, fontFamily: "var(--font-mono, JetBrains Mono, monospace)" }}>
              <thead>
                <tr>
                  <th />
                  {companies.map((c) => (
                    <th key={c} className="h-24 w-9 align-bottom">
                      <div className="mx-auto -rotate-45 origin-bottom-left whitespace-nowrap text-[10px] uppercase tracking-wide text-neutral-400" style={{ transformOrigin: "bottom left", translate: "8px" }}>
                        {c}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((rowC, i) => (
                  <tr key={rowC}>
                    <th className="pr-2 text-right text-[10px] uppercase tracking-wide text-neutral-400 whitespace-nowrap">{rowC}</th>
                    {companies.map((colC, j) => {
                      const v = matrix[i][j];
                      const isDiag = i === j;
                      const active = sel && !isDiag && ((sel.a === rowC && sel.b === colC) || (sel.a === colC && sel.b === rowC));
                      return (
                        <td key={colC} className="p-0">
                          <button
                            disabled={isDiag || v === 0}
                            onClick={() => setSel({ a: rowC, b: colC })}
                            title={isDiag ? `${rowC} · ${v} mentions` : `${rowC} × ${colC} · ${v} co-occurrences`}
                            className={"h-9 w-9 text-[10px] tabular-nums transition " + (active ? "outline outline-2 outline-offset-0" : "") + (isDiag || v === 0 ? " cursor-default" : " hover:brightness-125")}
                            style={{
                              background: cellColor(v, isDiag),
                              color: textColor(v),
                              outlineColor: active ? ACCENT : undefined,
                            }}
                          >
                            {v > 0 ? v : ""}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sel && (
            <aside className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500" style={{ fontFamily: "var(--font-mono, JetBrains Mono, monospace)" }}>
                    Shared stories
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-neutral-100">
                    {sel.a} <span className="text-neutral-500">×</span> {sel.b}
                  </div>
                  <div className="text-[11px] text-neutral-400" style={{ fontFamily: "var(--font-mono, JetBrains Mono, monospace)" }}>
                    {selStories.length} item{selStories.length === 1 ? "" : "s"}
                  </div>
                </div>
                <button onClick={() => setSel(null)} className="text-xs text-neutral-500 hover:text-neutral-200">
                  Close
                </button>
              </div>
              {selStories.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-500">No shared stories.</div>
              ) : (
                <ul className="space-y-3">
                  {selStories.map((it) => (
                    <li key={it.id} className="border-t border-neutral-800 pt-3 first:border-t-0 first:pt-0">
                      <div className="text-[10px] uppercase tracking-wide text-neutral-500" style={{ fontFamily: "var(--font-mono, JetBrains Mono, monospace)" }}>
                        {shortDate(it.addedOn)} · {it.source} · IMP {it.importance}
                      </div>
                      <a href={it.link} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-sm font-medium text-neutral-100 hover:underline">
                        {it.title}
                      </a>
                      {it.summary && <p className="mt-1 line-clamp-2 text-xs text-neutral-400">{it.summary}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          )}
        </div>
      )}
    </main>
  );
}

// ---------- Trends View (recharts) ----------
function TrendsView({ items, loading }: { items: Item[]; loading: boolean }) {
  const WINDOW_DAYS = 30;
  const { dailyByTag, tagKeys, importanceSeries, leaderboard, dayLabels } = useMemo(() => {
    const now = Date.now();
    const cutoff = now - WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const scoped = items.filter((it) => itemTs(it) >= cutoff);

    // build day buckets (YYYY-MM-DD)
    const dayKeys: string[] = [];
    const dayLabels: string[] = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dayKeys.push(key);
      dayLabels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }

    // top tags by frequency in window
    const tagCount = new Map<string, number>();
    for (const it of scoped) for (const t of it.tags ?? []) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const tagKeys = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);

    const dailyByTag = dayKeys.map((k, i) => {
      const row: Record<string, number | string> = { day: dayLabels[i], _key: k };
      for (const t of tagKeys) row[t] = 0;
      return row;
    });
    const indexByKey = new Map(dayKeys.map((k, i) => [k, i]));

    const impBuckets: { day: string; sum: number; n: number; max: number }[] = dayKeys.map((_, i) => ({ day: dayLabels[i], sum: 0, n: 0, max: 0 }));

    for (const it of scoped) {
      const dk = new Date(itemTs(it)).toISOString().slice(0, 10);
      const di = indexByKey.get(dk);
      if (di === undefined) continue;
      for (const t of it.tags ?? []) {
        if (tagKeys.includes(t)) dailyByTag[di][t] = (dailyByTag[di][t] as number) + 1;
      }
      const imp = it.importance || 0;
      impBuckets[di].sum += imp;
      impBuckets[di].n += 1;
      if (imp > impBuckets[di].max) impBuckets[di].max = imp;
    }

    const importanceSeries = impBuckets.map((b) => ({
      day: b.day,
      avg: b.n ? +(b.sum / b.n).toFixed(2) : 0,
      max: b.max,
      count: b.n,
    }));

    // leaderboard
    const perCompany = new Map<string, { count: number; impSum: number }>();
    for (const it of scoped) {
      const set = new Set<string>();
      if (it.company) set.add(it.company);
      for (const c of it.secondaryCompanies ?? []) if (c) set.add(c);
      for (const c of set) {
        const cur = perCompany.get(c) ?? { count: 0, impSum: 0 };
        cur.count += 1;
        cur.impSum += it.importance || 0;
        perCompany.set(c, cur);
      }
    }
    const leaderboard = [...perCompany.entries()].map(([company, v]) => ({
      company,
      mentions: v.count,
      avgImportance: v.count ? +(v.impSum / v.count).toFixed(2) : 0,
    }));

    return { dailyByTag, tagKeys, importanceSeries, leaderboard, dayLabels };
  }, [items]);

  const [sortBy, setSortBy] = useState<"mentions" | "avgImportance">("mentions");
  const sortedLeaderboard = useMemo(
    () => [...leaderboard].sort((a, b) => b[sortBy] - a[sortBy]).slice(0, 15),
    [leaderboard, sortBy],
  );

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6"><ListSkeleton /></div>;

  const axisStyle = { fontSize: 10, fill: "#8A93A6", fontFamily: "var(--font-mono, JetBrains Mono, monospace)" };
  const gridColor = "#DDD8CC";

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* Stacked area: stories per topic tag */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Daily stories by topic</h2>
            <p className="text-[11px] text-neutral-500" style={{ fontFamily: "var(--font-mono, JetBrains Mono, monospace)" }}>
              Last {WINDOW_DAYS} days · top {tagKeys.length} tags
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tagKeys.map((t) => {
              const s = tagStyle(t);
              return (
                <span key={t} className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-neutral-400" style={{ fontFamily: "var(--font-mono, JetBrains Mono, monospace)" }}>
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.dot }} />
                  {tagLabel(t)}
                </span>
              );
            })}
          </div>
        </header>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyByTag} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                {tagKeys.map((t) => {
                  const c = tagStyle(t).dot;
                  return (
                    <linearGradient id={`grad-${t}`} key={t} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.7} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.15} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} interval={Math.max(0, Math.floor(dayLabels.length / 10) - 1)} />
              <YAxis tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip content={<TerminalTooltip />} cursor={{ fill: "rgba(0,102,255,0.06)" }} />
              {tagKeys.map((t) => (
                <Area
                  key={t}
                  type="monotone"
                  dataKey={t}
                  name={tagLabel(t)}
                  stackId="1"
                  stroke={tagStyle(t).dot}
                  fill={`url(#grad-${t})`}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Avg importance line */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
        <header className="mb-3">
          <h2 className="text-sm font-semibold text-neutral-100">Signal strength</h2>
          <p className="text-[11px] text-neutral-500" style={{ fontFamily: "var(--font-mono, JetBrains Mono, monospace)" }}>
            Average importance per day — spikes mark high-signal days
          </p>
        </header>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={importanceSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis dataKey="day" tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} interval={Math.max(0, Math.floor(dayLabels.length / 10) - 1)} />
              <YAxis domain={[0, 5]} tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} width={28} />
              <Tooltip content={<TerminalTooltip valueFormatter={(v) => v.toFixed(2)} />} cursor={{ stroke: ACCENT, strokeOpacity: 0.3 }} />
              <Line type="monotone" dataKey="avg" name="Avg importance" stroke={ACCENT} strokeWidth={2} dot={{ r: 2, fill: ACCENT, stroke: ACCENT }} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="max" name="Peak" stroke="#64748B" strokeWidth={1} strokeDasharray="3 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Company leaderboard */}
      <section className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Company leaderboard</h2>
            <p className="text-[11px] text-neutral-500" style={{ fontFamily: "var(--font-mono, JetBrains Mono, monospace)" }}>
              Total mentions over last {WINDOW_DAYS} days
            </p>
          </div>
          <Segmented
            value={sortBy}
            onChange={(v) => setSortBy(v as "mentions" | "avgImportance")}
            options={[
              { value: "mentions", label: "Total mentions" },
              { value: "avgImportance", label: "Avg importance" },
            ]}
          />
        </header>
        <div style={{ height: Math.max(160, sortedLeaderboard.length * 26 + 40) }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedLeaderboard} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid stroke={gridColor} horizontal={false} />
              <XAxis type="number" tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} allowDecimals={sortBy === "avgImportance"} />
              <YAxis type="category" dataKey="company" tick={axisStyle} axisLine={{ stroke: gridColor }} tickLine={false} width={110} />
              <Tooltip content={<TerminalTooltip valueFormatter={(v) => (sortBy === "avgImportance" ? v.toFixed(2) : String(v))} />} cursor={{ fill: "rgba(0,102,255,0.08)" }} />
              <Bar dataKey={sortBy} name={sortBy === "mentions" ? "Mentions" : "Avg importance"} fill={ACCENT} radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}

// ---------- Command Palette ----------
function CommandPalette({
  open,
  onClose,
  items,
  companyOptions,
  topicOptions,
  onSelectCompany,
  onSelectTopic,
  onSelectRange,
  onSelectView,
}: {
  open: boolean;
  onClose: () => void;
  items: Item[];
  companyOptions: string[];
  topicOptions: string[];
  onSelectCompany: (c: string) => void;
  onSelectTopic: (t: string) => void;
  onSelectRange: (r: DateRange) => void;
  onSelectView: (v: ViewKey) => void;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  type Row =
    | { kind: "range"; label: string; hint: string; value: DateRange }
    | { kind: "view"; label: string; hint: string; value: ViewKey }
    | { kind: "company"; label: string; hint: string }
    | { kind: "topic"; label: string; hint: string }
    | { kind: "story"; label: string; hint: string; link: string };

  const rows = useMemo<Row[]>(() => {
    const query = q.trim().toLowerCase();
    const match = (s: string) => !query || s.toLowerCase().includes(query);
    const out: Row[] = [];
    (["latest", "7d", "30d", "all"] as DateRange[]).forEach((r) => {
      const label = r === "latest" ? "Latest" : r === "all" ? "All time" : `Last ${r}`;
      if (match(label) || match("range") || match("date")) out.push({ kind: "range", label, hint: "DATE RANGE", value: r });
    });
    (["digest", "threads", "companies", "matrix", "trends"] as ViewKey[]).forEach((v) => {
      const label = v.charAt(0).toUpperCase() + v.slice(1);
      if (match(label) || match("view") || match("go to")) out.push({ kind: "view", label: `Go to ${label}`, hint: "VIEW", value: v });
    });
    for (const c of companyOptions) if (match(c)) out.push({ kind: "company", label: c, hint: "COMPANY" });
    for (const t of topicOptions) if (match(t)) out.push({ kind: "topic", label: t, hint: "TOPIC" });
    if (query.length >= 2) {
      for (const it of items) {
        if (it.title.toLowerCase().includes(query)) {
          out.push({ kind: "story", label: it.title, hint: `${it.company || it.source} · ${shortDate(it.addedOn)}`, link: it.link });
          if (out.filter((r) => r.kind === "story").length >= 8) break;
        }
      }
    }
    return out.slice(0, 40);
  }, [q, items, companyOptions, topicOptions]);

  useEffect(() => { setIdx(0); }, [q]);

  if (!open) return null;

  const select = (r: Row) => {
    if (r.kind === "range") onSelectRange(r.value);
    else if (r.kind === "view") onSelectView(r.value);
    else if (r.kind === "company") onSelectCompany(r.label);
    else if (r.kind === "topic") onSelectTopic(r.label);
    else if (r.kind === "story") { window.open(r.link, "_blank", "noopener,noreferrer"); onClose(); }
  };

  const onKey = (e: import("react").KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(rows.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (rows[idx]) select(rows[idx]); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 shadow-2xl"
        style={{ boxShadow: `0 0 0 1px ${ACCENT}22, 0 20px 60px -10px rgba(0,0,0,0.8)` }}
      >
        <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2.5">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500" style={MONO_STYLE}>⌘K</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Jump to company, topic, story, or view…"
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            style={{ caretColor: ACCENT }}
          />
          <span className="text-[10px] uppercase tracking-wider text-neutral-500" style={MONO_STYLE}>ESC</span>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1">
          {rows.length === 0 ? (
            <li className="px-3 py-6 text-center text-xs text-neutral-500">No matches</li>
          ) : rows.map((r, i) => (
            <li key={`${r.kind}-${r.label}-${i}`}>
              <button
                onMouseEnter={() => setIdx(i)}
                onClick={() => select(r)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-neutral-200"
                style={{ background: i === idx ? "rgba(0,102,255,0.12)" : "transparent" }}
              >
                <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500" style={MONO_STYLE}>{r.hint}</span>
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                {i === idx && <span className="text-[10px] uppercase tracking-wider" style={{ ...MONO_STYLE, color: ACCENT }}>↵</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
