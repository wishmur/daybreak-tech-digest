import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  allItems,
  briefToMarkdown,
  buildCompanyHistory,
  companiesOf,
  daysInRange,
  longDate,
  momentumFor,
  relativeDayLabel,
  signalSentence,
  signalStats,
  sortByImportance,
  type Item,
  type RangeKey,
} from "@/lib/digest";
import { useDigest } from "@/lib/useDigest";
import { useReadState } from "@/lib/useReadState";
import { SiteFooter, TopBar, type NavKey } from "@/components/digest/Chrome";
import {
  ActiveFilterChips,
  DEFAULT_FILTERS,
  FilterControls,
  FilterSheet,
  hasActiveFilters,
  type Filters,
} from "@/components/digest/Filters";
import {
  EmptyState,
  StoryRow,
  StorySkeleton,
} from "@/components/digest/Story";
import {
  CoOccurrenceView,
  CompaniesView,
  TrendsView,
} from "@/components/digest/Analysis";
import { CommandPalette } from "@/components/digest/CommandPalette";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daybreak, the daily AI and tech brief for PMs" },
      {
        name: "description",
        content:
          "Ten stories that matter to a product manager, picked every morning and posted by 10 AM ET.",
      },
    ],
  }),
  component: TechDigestPage,
});

const PAGE_SIZE = 12;

/* ------------------------------------------------------------------ */
/* URL state                                                           */
/* ------------------------------------------------------------------ */

function readStateFromURL(): { filters: Partial<Filters>; view: NavKey } {
  if (typeof window === "undefined") return { filters: {}, view: "digest" };
  const p = new URLSearchParams(window.location.search);
  const f: Partial<Filters> = {};

  const range = p.get("range");
  if (range === "latest" || range === "7d" || range === "30d" || range === "all")
    f.range = range;

  const list = (k: string) => p.get(k)?.split(",").filter(Boolean);
  const c = list("companies");
  if (c) f.companies = c;
  const t = list("topics");
  if (t) f.topics = t;
  const s = list("sources");
  if (s) f.sources = s;
  const g = list("tags");
  if (g) f.tags = g;

  const imp = p.get("imp");
  if (imp === "3" || imp === "4" || imp === "5")
    f.minImportance = Number(imp) as 3 | 4 | 5;
  const q = p.get("q");
  if (q) f.q = q;

  const v = p.get("view");
  const view: NavKey =
    v === "companies" || v === "matrix" || v === "trends" ? v : "digest";

  return { filters: f, view };
}

function writeStateToURL(f: Filters, view: NavKey) {
  if (typeof window === "undefined") return;
  const p = new URLSearchParams();
  if (view !== "digest") p.set("view", view);
  if (f.range !== DEFAULT_FILTERS.range) p.set("range", f.range);
  if (f.companies.length) p.set("companies", f.companies.join(","));
  if (f.topics.length) p.set("topics", f.topics.join(","));
  if (f.sources.length) p.set("sources", f.sources.join(","));
  if (f.tags.length) p.set("tags", f.tags.join(","));
  if (f.minImportance) p.set("imp", String(f.minImportance));
  if (f.q.trim()) p.set("q", f.q.trim());
  const qs = p.toString();
  window.history.replaceState(
    null,
    "",
    qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
  );
}

const LS_FILTERS = "daybreak:filters:v2";

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function TechDigestPage() {
  const { digest, loading, stale } = useDigest();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [view, setView] = useState<NavKey>("digest");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const hydrated = useRef(false);

  const items = useMemo(() => allItems(digest), [digest]);
  const history = useMemo(() => buildCompanyHistory(items), [items]);
  const { seen, unreadCount, isFirstEverVisit, markRead, markAllRead, ready } =
    useReadState(items);

  /* ---- hydrate from URL, then localStorage ---- */
  useEffect(() => {
    const { filters: fromUrl, view: urlView } = readStateFromURL();
    let base = { ...DEFAULT_FILTERS };
    try {
      const raw = localStorage.getItem(LS_FILTERS);
      if (raw) base = { ...base, ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    setFilters({ ...base, ...fromUrl });
    setView(urlView);
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    writeStateToURL(filters, view);
    try {
      localStorage.setItem(LS_FILTERS, JSON.stringify(filters));
    } catch {
      /* ignore */
    }
  }, [filters, view]);

  useEffect(() => setPage(1), [filters, view]);

  /* ---- derived ---- */
  const scopedDays = useMemo(
    () => daysInRange(digest, filters.range),
    [digest, filters.range],
  );
  const scopedItems = useMemo(
    () => scopedDays.flatMap((d) => d.items),
    [scopedDays],
  );

  const options = useMemo(() => {
    const companies = new Map<string, number>();
    const topics = new Set<string>();
    const sources = new Set<string>();
    for (const it of scopedItems) {
      for (const c of companiesOf(it))
        companies.set(c, (companies.get(c) ?? 0) + 1);
      if (it.topic) topics.add(it.topic);
      if (it.source) sources.add(it.source);
    }
    const rankedCompanies = [...companies.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    return {
      companies: rankedCompanies.map(([n]) => n),
      companyCounts: rankedCompanies,
      topics: [...topics].sort(),
      sources: [...sources].sort(),
    };
  }, [scopedItems]);

  const matched = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return scopedItems.filter((it) => {
      if (filters.minImportance && it.importance < filters.minImportance)
        return false;
      if (filters.companies.length) {
        const involved = companiesOf(it);
        if (!filters.companies.some((c) => involved.includes(c))) return false;
      }
      if (filters.topics.length && !filters.topics.includes(it.topic))
        return false;
      if (filters.sources.length && !filters.sources.includes(it.source))
        return false;
      if (
        filters.tags.length &&
        !filters.tags.some((t) => (it.tags ?? []).includes(t))
      )
        return false;
      if (q && !`${it.title} ${it.summary}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [scopedItems, filters]);

  /* Grouped by pipeline day, newest first, importance-ordered inside a day. */
  const grouped = useMemo(() => {
    const byDay = new Map<string, Item[]>();
    for (const it of matched) {
      const arr = byDay.get(it.addedOn);
      if (arr) arr.push(it);
      else byDay.set(it.addedOn, [it]);
    }
    return [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([day, arr]) => [day, sortByImportance(arr)] as const);
  }, [matched]);

  const latestDay = scopedDays[0];
  const stats = useMemo(() => signalStats(digest), [digest]);

  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);
  const active = hasActiveFilters(filters);

  const toggleCompany = useCallback((c: string) => {
    setFilters((f) => ({
      ...f,
      companies: f.companies.includes(c)
        ? f.companies.filter((x) => x !== c)
        : [...f.companies, c],
    }));
  }, []);

  /* ---- keyboard ---- */
  useEffect(() => {
    const typing = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable);

    let cursor = -1;

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (paletteOpen || typing(e.target) || e.metaKey || e.ctrlKey) return;

      // j and k walk the visible list. This previously did nothing at all:
      // the handler looked for [data-story] but the main list rendered a card
      // that never set the attribute, while the footer advertised the
      // shortcut anyway.
      if (e.key === "j" || e.key === "k") {
        const nodes = Array.from(
          document.querySelectorAll<HTMLElement>("[data-story]"),
        );
        if (!nodes.length) return;
        e.preventDefault();
        cursor =
          e.key === "j"
            ? Math.min(nodes.length - 1, cursor + 1)
            : Math.max(0, cursor - 1);
        nodes.forEach((n, i) =>
          n.setAttribute("data-kbd", i === cursor ? "on" : "off"),
        );
        nodes[cursor]?.scrollIntoView({ block: "center", behavior: "smooth" });
        nodes[cursor]?.focus({ preventScroll: true });
      } else if (e.key === "Enter" && cursor >= 0) {
        const node = document.querySelectorAll<HTMLElement>("[data-story]")[
          cursor
        ];
        const link = node?.getAttribute("data-story-link");
        if (link) {
          e.preventDefault();
          window.open(link, "_blank", "noopener,noreferrer");
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen]);

  /* ---- copy ---- */
  const copyBrief = useCallback(async () => {
    if (!latestDay) return;
    try {
      await navigator.clipboard.writeText(briefToMarkdown(latestDay));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard blocked; nothing useful to say */
    }
  }, [latestDay]);

  const totalMatched = matched.length;
  const totalPages = Math.max(1, Math.ceil(totalMatched / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const from = (current - 1) * PAGE_SIZE;

  /* Slice the flat window across day groups so pagination does not break the
     day headings. */
  const pageGroups = useMemo(() => {
    const out: (readonly [string, Item[]])[] = [];
    let seenN = 0;
    for (const [day, arr] of grouped) {
      const gs = seenN;
      const ge = seenN + arr.length;
      seenN = ge;
      if (ge <= from || gs >= from + PAGE_SIZE) continue;
      out.push([
        day,
        arr.slice(Math.max(0, from - gs), Math.min(arr.length, from + PAGE_SIZE - gs)),
      ] as const);
    }
    return out;
  }, [grouped, from]);

  return (
    <div className="min-h-screen">
      <TopBar
        active={view}
        onChange={setView}
        lastUpdated={digest?.lastUpdated}
        latestDate={digest?.days?.[0]?.date}
        totalItems={items.length}
        loading={loading && !digest}
        stale={stale && !loading}
      />

      {view === "digest" && (
        <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
          {/* ---- Brief ----
              The day's synthesis, not a status line: this is the one
              thing on the page that outranks the board below it, set in
              its own flat field so the eye lands here first. */}
          <section className="mt-5">
            <div className="rounded-[6px] bg-inset px-5 py-5 sm:px-7 sm:py-6">
              {loading && !digest ? (
                <div className="animate-pulse">
                  <div className="h-8 w-64 bg-sunk" />
                  <div className="mt-3 h-4 w-full max-w-2xl bg-sunk" />
                  <div className="mt-2 h-4 w-2/3 max-w-xl bg-sunk" />
                </div>
              ) : latestDay ? (
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
                  <div className="min-w-0 lg:flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="font-display text-display font-extrabold leading-[1.05] tracking-[-0.015em] text-ink">
                        {["Today", "Yesterday"].includes(
                          relativeDayLabel(latestDay.date),
                        )
                          ? relativeDayLabel(latestDay.date)
                          : longDate(latestDay.date)}
                      </h2>
                      {["Today", "Yesterday"].includes(
                        relativeDayLabel(latestDay.date),
                      ) && (
                        <span className="font-ui text-meta text-ink-3">
                          {longDate(latestDay.date)}
                        </span>
                      )}
                    </div>

                    {latestDay.summary && (
                      <p className="measure mt-3 text-lede leading-[1.5] text-ink-2">
                        {latestDay.summary}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-3 lg:w-64 lg:items-end">
                    {stats && (
                      <p className="font-ui text-meta text-ink-2 lg:text-right">
                        {signalSentence(stats)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 no-print">
                      {ready && unreadCount > 0 && !isFirstEverVisit && (
                        <button onClick={markAllRead} className="ctl">
                          {unreadCount} unread
                        </button>
                      )}
                      <button
                        onClick={copyBrief}
                        className="ctl-primary inline-flex items-center gap-1.5"
                      >
                        {copied ? (
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                          >
                            <path
                              d="M3.5 8.5L6.5 11.5L12.5 4.5"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 16 16"
                            fill="none"
                            aria-hidden="true"
                          >
                            <rect
                              x="5.5"
                              y="5.5"
                              width="8"
                              height="8"
                              rx="1"
                              stroke="currentColor"
                              strokeWidth="1.4"
                            />
                            <path
                              d="M3.5 10.5V3.5a1 1 0 0 1 1-1H10.5"
                              stroke="currentColor"
                              strokeWidth="1.4"
                            />
                          </svg>
                        )}
                        {copied ? "Copied" : "Copy brief"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Nothing published yet"
                  body="The morning job has not written a brief. Once it runs, the day's stories land here."
                />
              )}
            </div>
          </section>

          {/* ---- Board: control rail, story lanes, companies panel ---- */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 py-6 lg:grid-cols-12">
            <aside className="lg:col-span-3 xl:col-span-2">
              <div className="flex items-center gap-2 no-print lg:hidden">
                <button
                  onClick={() => setSheetOpen(true)}
                  className="ctl shrink-0"
                  data-active={active}
                >
                  Filters
                </button>
                <div className="relative min-w-0 flex-1">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3"
                  >
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <input
                    value={filters.q}
                    onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                    placeholder="Search"
                    aria-label="Search stories"
                    className="search-field w-full"
                  />
                </div>
              </div>
              <div className="no-print hidden lg:block">
                <FilterControls
                  filters={filters}
                  setFilters={setFilters}
                  companyOptions={options.companies}
                  topicOptions={options.topics}
                  sourceOptions={options.sources}
                />
              </div>
            </aside>

            <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
              <FilterControls
                filters={filters}
                setFilters={setFilters}
                companyOptions={options.companies}
                topicOptions={options.topics}
                sourceOptions={options.sources}
              />
            </FilterSheet>

            <main className="lg:col-span-6 xl:col-span-7">
              <div className="no-print">
                <ActiveFilterChips
                  filters={filters}
                  setFilters={setFilters}
                  onReset={reset}
                />
              </div>

              {loading && !digest ? (
                <StorySkeleton />
              ) : totalMatched === 0 ? (
                <EmptyState
                  title={active ? "Nothing matches" : "No stories in this range"}
                  body={
                    active
                      ? "Every filter narrows the same list. Clearing one or two usually brings it back."
                      : "Try a wider range. The archive goes back further than the latest brief."
                  }
                  actionLabel={active ? "Clear filters" : undefined}
                  onAction={active ? reset : undefined}
                />
              ) : (
                <>
                  {pageGroups.map(([day, dayItems]) => {
                    // Priority lanes, translated for a flat paginated list:
                    // split each day's already importance-sorted items at
                    // the must-read line rather than re-deriving a topic
                    // hierarchy that would fight the existing sort and
                    // pagination. A day with no 5s renders as one lane.
                    const lead = dayItems.filter((it) => it.importance >= 5);
                    const rest = dayItems.filter((it) => it.importance < 5);
                    const split = lead.length > 0 && rest.length > 0;

                    const row = (it: Item, isLead: boolean) => (
                      <StoryRow
                        key={it.id}
                        item={it}
                        lead={isLead}
                        momentum={momentumFor(it, history)}
                        read={ready && seen.has(it.id)}
                        onOpen={markRead}
                        showDate={filters.range === "all"}
                      />
                    );

                    return (
                      <section key={day} className="mb-8 last:mb-0">
                        {filters.range !== "latest" && (
                          <h3 className="label-strong mb-1 border-b border-ink pb-2">
                            {relativeDayLabel(day)}
                          </h3>
                        )}
                        {split ? (
                          <>
                            <div className="band mb-1 mt-3 px-2.5 py-1.5">
                              <span className="chip text-signal">Lead</span>
                            </div>
                            <ul>{lead.map((it) => row(it, true))}</ul>
                            <div className="band mb-1 mt-4 px-2.5 py-1.5">
                              <span className="chip text-lane">
                                Also in the brief
                              </span>
                            </div>
                            <ul>{rest.map((it) => row(it, false))}</ul>
                          </>
                        ) : (
                          <ul>{dayItems.map((it) => row(it, lead.length > 0))}</ul>
                        )}
                      </section>
                    );
                  })}
                  {totalPages > 1 && (
                    <Pagination
                      page={current}
                      totalPages={totalPages}
                      total={totalMatched}
                      pageSize={PAGE_SIZE}
                      onChange={(p) => {
                        setPage(p);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    />
                  )}
                </>
              )}
            </main>

            <aside className="hidden lg:col-span-3 lg:block xl:col-span-3">
              <CompanyPanel
                companies={options.companyCounts.slice(0, 10)}
                active={filters.companies}
                onToggle={toggleCompany}
              />
            </aside>
          </div>
        </div>
      )}

      {view === "companies" && (
        <CompaniesView
          items={items}
          loading={loading && !digest}
          initial={filters.companies[0]}
        />
      )}
      {view === "matrix" && (
        <CoOccurrenceView items={items} loading={loading && !digest} />
      )}
      {view === "trends" && (
        <TrendsView items={items} loading={loading && !digest} />
      )}

      <SiteFooter hint="press j and k to move, enter to open" />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={items}
        companyOptions={options.companies}
        topicOptions={options.topics}
        onSelectCompany={(c) => {
          setFilters({ ...DEFAULT_FILTERS, range: "30d", companies: [c] });
          setView("digest");
          setPaletteOpen(false);
        }}
        onSelectTopic={(t) => {
          setFilters({ ...DEFAULT_FILTERS, range: "30d", topics: [t] });
          setView("digest");
          setPaletteOpen(false);
        }}
        onSelectRange={(r: RangeKey) => {
          setFilters({ ...filters, range: r });
          setView("digest");
          setPaletteOpen(false);
        }}
        onSelectView={(v) => {
          setView(v);
          setPaletteOpen(false);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

/**
 * Compact page list with gaps.
 *
 * Rewritten from a loop that reassigned its own counter mid-iteration to
 * jump to the end, which was very hard to reason about and one off-by-one
 * away from skipping the last page.
 */
function pageWindow(page: number, total: number): (number | "gap")[] {
  const span = 1;
  const keep = new Set<number>([1, total]);
  for (let i = page - span; i <= page + span; i++)
    if (i >= 1 && i <= total) keep.add(i);

  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (prev && n - prev > 1) out.push("gap");
    out.push(n);
    prev = n;
  }
  return out;
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6 no-print"
    >
      <span className="data">
        {from} to {to} of {total}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="ctl"
        >
          Previous
        </button>
        {pageWindow(page, totalPages).map((p, i) =>
          p === "gap" ? (
            <span key={`g${i}`} className="data px-1">
              &hellip;
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              data-active={p === page}
              aria-current={p === page ? "page" : undefined}
              className="ctl min-w-[2.25rem] tabular-nums"
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="ctl"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Companies panel                                                     */
/* ------------------------------------------------------------------ */

/**
 * The board's third column: who is showing up in the current range, ranked
 * by mentions. A click narrows the story lanes to that company, same as
 * the "Company" field in the control rail — this is a second way in, not a
 * second filter model.
 */
function CompanyPanel({
  companies,
  active,
  onToggle,
}: {
  companies: [string, number][];
  active: string[];
  onToggle: (c: string) => void;
}) {
  if (companies.length === 0) return null;
  return (
    <div className="no-print">
      <div className="band px-2.5 py-1.5">
        <p className="label-strong">Companies in range</p>
      </div>
      <ul className="mt-1">
        {companies.map(([name, count]) => (
          <li key={name}>
            <button
              onClick={() => onToggle(name)}
              data-active={active.includes(name)}
              className="flex w-full items-center justify-between gap-2 rounded-[3px] px-2.5 py-1.5 text-left font-ui text-meta font-medium text-ink-2 transition-colors hover:bg-inset data-[active=true]:bg-lane-wash data-[active=true]:text-lane-ink"
            >
              <span className="truncate">{name}</span>
              <span className="data shrink-0">{count}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
