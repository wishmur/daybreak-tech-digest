import { useMemo, useState } from "react";
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
import {
  buildCompanyHistory,
  companiesOf,
  itemTs,
  momentumFor,
  parseYMD,
  shortDate,
  sortByImportance,
  tagLabel,
  type Item,
} from "@/lib/digest";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { EmptyState, ImportanceMeter, StorySkeleton, StoryRow } from "./Story";

/* Board chart palette, matching the Strip Board token set in styles.css.
   SVG fills can't read CSS custom properties reliably across the
   export/print path, so the values are mirrored here rather than computed
   — keep these in step with --color-* by hand. Ink first, the two
   functional accents (signal, lane), then a short run of distinct but
   restrained series tones. No rainbow, no violet, no cyan. */
const INK = "#14161a";
const INK_2 = "#4a5057";
const INK_3 = "#6b7178";
const RULE = "#e2e2dc";
const SIGNAL = "#c22f16";
const LANE = "#2f5fb8";
const SERIES = [INK, SIGNAL, LANE, "#4f9169", "#c98a2e", "#9aa0a6"];

const axisTick = {
  fontSize: 12,
  fill: INK_3,
  fontFamily: "JetBrains Mono, ui-monospace, monospace",
};

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

function ChartTooltip({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    dataKey?: string;
    stroke?: string;
    fill?: string;
  }>;
  label?: string | number;
  format?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p && (p.value ?? 0) !== 0);
  if (!rows.length) return null;
  return (
    <div className="surface px-3 py-2">
      {label !== undefined && (
        <div className="data mb-1.5 text-ink-2">{String(label)}</div>
      )}
      <div className="space-y-1">
        {rows.map((p, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span
              className="block h-2 w-2 shrink-0"
              style={{ background: p.color ?? p.stroke ?? p.fill ?? INK_3 }}
            />
            <span className="font-ui text-micro text-ink-2">
              {p.name ?? p.dataKey}
            </span>
            <span className="data ml-auto text-ink">
              {format
                ? format(Number(p.value ?? 0))
                : Number(p.value ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHead({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule pb-3">
      <div>
        <h2 className="text-head font-semibold">{title}</h2>
        {note && <p className="label mt-1">{note}</p>}
      </div>
      {children}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Sparkline                                                           */
/* ------------------------------------------------------------------ */

/**
 * A daily-count sparkline drawn as plain SVG.
 *
 * Recharts for a 90 pixel strip would be absurd. This is twenty lines and no
 * runtime cost, and it is the fastest way to answer "is this company heating
 * up or cooling off" at a glance.
 */
function Sparkline({
  values,
  width = 96,
  height = 22,
  label,
}: {
  values: number[];
  width?: number;
  height?: number;
  label: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const step = width / (values.length - 1);
  const y = (v: number) => height - 1 - (v / max) * (height - 2);
  const d = values.map((v, i) => `${i ? "L" : "M"}${i * step},${y(v)}`).join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <path d={d} fill="none" stroke={INK_2} strokeWidth={1.25} />
      <circle
        cx={(values.length - 1) * step}
        cy={y(values[values.length - 1])}
        r={2}
        fill={SIGNAL}
      />
    </svg>
  );
}

function dailyCounts(items: Item[], days: number): number[] {
  const DAY = 86_400_000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = new Array(days).fill(0);
  for (const it of items) {
    const diff = Math.round(
      (today.getTime() - parseYMD(it.addedOn).getTime()) / DAY,
    );
    if (diff >= 0 && diff < days) buckets[days - 1 - diff] += 1;
  }
  return buckets;
}

/* ------------------------------------------------------------------ */
/* Companies                                                           */
/* ------------------------------------------------------------------ */

export function CompaniesView({
  items,
  loading,
  initial,
}: {
  items: Item[];
  loading: boolean;
  initial?: string;
}) {
  const ranked = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items)
      for (const c of companiesOf(it)) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [items]);

  const [selected, setSelected] = useState<string | undefined>(initial);
  const active = selected ?? ranked[0]?.[0];

  const history = useMemo(() => buildCompanyHistory(items), [items]);

  const stories = useMemo(() => {
    if (!active) return [];
    return items
      .filter((it) => companiesOf(it).includes(active))
      .sort((a, b) => itemTs(b) - itemTs(a));
  }, [items, active]);

  const stats = useMemo(() => {
    if (!stories.length) return null;
    const avg =
      stories.reduce((s, it) => s + (it.importance || 0), 0) / stories.length;
    const topics = new Map<string, number>();
    for (const it of stories)
      if (it.topic) topics.set(it.topic, (topics.get(it.topic) ?? 0) + 1);
    const partners = new Map<string, number>();
    for (const it of stories)
      for (const c of companiesOf(it))
        if (c !== active) partners.set(c, (partners.get(c) ?? 0) + 1);
    const top = (m: Map<string, number>, n: number) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
    return {
      total: stories.length,
      avg,
      first: stories[stories.length - 1]?.addedOn,
      last: stories[0]?.addedOn,
      topics: top(topics, 3),
      partners: top(partners, 3),
      spark: dailyCounts(stories, 30),
    };
  }, [stories, active]);

  if (loading)
    return (
      <div className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8">
        <StorySkeleton />
      </div>
    );

  if (!ranked.length)
    return (
      <div className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8">
        <EmptyState
          title="No companies yet"
          body="Once the morning job has run a few times, the companies it keeps naming will show up here."
        />
      </div>
    );

  return (
    <main className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8">
      {/* Below md this is a scrolling chip row. It used to be a list box 70%
          of the viewport tall, which pushed the actual content off screen. */}
      <div className="scroll-x -mx-5 mb-6 flex gap-1.5 px-5 pb-2 md:hidden">
        {ranked.slice(0, 24).map(([name, count]) => (
          <button
            key={name}
            onClick={() => setSelected(name)}
            data-active={active === name}
            className="ctl shrink-0"
          >
            {name} <span className="font-data text-micro">{count}</span>
          </button>
        ))}
      </div>

      <div className="md:grid md:grid-cols-[13rem_1fr] md:gap-10">
        <aside className="hidden md:block">
          <h2 className="label-strong mb-2">Companies</h2>
          <div className="max-h-[70vh] overflow-y-auto border-t border-rule">
            {ranked.map(([name, count]) => (
              <button
                key={name}
                onClick={() => setSelected(name)}
                className={`flex w-full items-baseline justify-between gap-3 border-b border-rule px-1 py-2 text-left font-ui text-meta transition-colors hover:bg-inset ${
                  active === name ? "font-semibold text-ink" : "text-ink-2"
                }`}
              >
                <span className="truncate">{name}</span>
                <span className="data shrink-0">{count}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          {active && stats ? (
            <>
              <div className="mb-8 border-b border-rule pb-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <h2 className="text-head-lg font-semibold">{active}</h2>
                  <div className="flex items-center gap-2.5">
                    <Sparkline
                      values={stats.spark}
                      label={`${active} mentions over the last 30 days`}
                    />
                    <span className="data">30d</span>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  <Stat label="Stories" value={String(stats.total)} />
                  <Stat
                    label="Avg importance"
                    value={stats.avg.toFixed(1)}
                    meter={stats.avg}
                  />
                  <Stat
                    label="First seen"
                    value={stats.first ? shortDate(stats.first) : "—"}
                  />
                  <Stat
                    label="Most often with"
                    value={stats.partners.map(([p]) => p).join(", ") || "—"}
                  />
                </dl>
              </div>
              <ul>
                {stories.map((it) => (
                  <StoryRow
                    key={it.id}
                    item={it}
                    momentum={momentumFor(it, history)}
                    showDate
                  />
                ))}
              </ul>
            </>
          ) : (
            <EmptyState
              title="Pick a company"
              body="Choose one from the list to see everything the digest has said about it."
            />
          )}
        </div>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  meter,
}: {
  label: string;
  value: string;
  meter?: number;
}) {
  return (
    <div>
      <dt className="label-strong">{label}</dt>
      <dd className="mt-1.5 flex items-center gap-2 font-ui text-meta font-medium text-ink">
        <span className="truncate">{value}</span>
        {meter !== undefined && <ImportanceMeter value={meter} />}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Co-occurrence                                                       */
/* ------------------------------------------------------------------ */

/**
 * Which companies keep showing up in the same story.
 *
 * Rebuilt from the old heatmap, which was a black panel of electric blue
 * cells dropped into the middle of a light editorial page, and unreadable on
 * a phone. Same data, drawn in ink, and it degrades to a plain ranked list
 * on narrow screens instead of a grid nobody can parse.
 */
export function CoOccurrenceView({
  items,
  loading,
}: {
  items: Item[];
  loading: boolean;
}) {
  const wide = useMediaQuery("(min-width: 900px)");

  const { companies, matrix, pairs, maxVal } = useMemo(() => {
    const mentions = new Map<string, number>();
    for (const it of items)
      for (const c of companiesOf(it))
        mentions.set(c, (mentions.get(c) ?? 0) + 1);

    const companies = [...mentions.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([c]) => c);
    const idx = new Map(companies.map((c, i) => [c, i]));
    const matrix: number[][] = Array.from({ length: companies.length }, () =>
      new Array(companies.length).fill(0),
    );
    const pairs = new Map<string, Item[]>();

    for (const it of items) {
      const list = companiesOf(it).filter((c) => idx.has(c));
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = idx.get(list[i])!;
          const b = idx.get(list[j])!;
          matrix[a][b] += 1;
          matrix[b][a] += 1;
          const key = [list[i], list[j]].sort().join(" || ");
          const arr = pairs.get(key);
          if (arr) arr.push(it);
          else pairs.set(key, [it]);
        }
      }
    }

    let maxVal = 0;
    for (let i = 0; i < companies.length; i++)
      for (let j = 0; j < companies.length; j++)
        if (i !== j && matrix[i][j] > maxVal) maxVal = matrix[i][j];

    return { companies, matrix, pairs, maxVal: Math.max(1, maxVal) };
  }, [items]);

  const [sel, setSel] = useState<[string, string] | null>(null);

  const rankedPairs = useMemo(
    () =>
      [...pairs.entries()]
        .map(([k, v]) => ({ pair: k.split(" || ") as [string, string], n: v.length }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 20),
    [pairs],
  );

  if (loading)
    return (
      <div className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8">
        <StorySkeleton />
      </div>
    );

  if (maxVal <= 1 && rankedPairs.length === 0)
    return (
      <div className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8">
        <EmptyState
          title="Not enough overlap yet"
          body="This fills in once the same companies start turning up in each other's stories."
        />
      </div>
    );

  const selStories = sel
    ? [...(pairs.get([...sel].sort().join(" || ")) ?? [])].sort(
        (a, b) => itemTs(b) - itemTs(a),
      )
    : [];

  // Density by ink weight rather than hue. One colour, varying presence.
  const shade = (v: number) => {
    if (v === 0) return "transparent";
    const t = Math.pow(v / maxVal, 0.65);
    return `rgb(20 22 26 / ${(0.06 + t * 0.82).toFixed(3)})`;
  };

  return (
    <main className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8">
      <SectionHead
        title="Who appears together"
        note={`Top ${companies.length} companies. The strongest pair shares ${maxVal} stories.`}
      />

      {wide ? (
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="scroll-x border border-rule p-4">
            <table className="border-separate" style={{ borderSpacing: 2 }}>
              <caption className="sr-only">
                Company co-occurrence counts. Darker cells share more stories.
              </caption>
              <thead>
                <tr>
                  <th />
                  {companies.map((c) => (
                    <th key={c} className="h-28 w-8 align-bottom">
                      <div
                        className="data origin-bottom-left -rotate-45 whitespace-nowrap pl-2 text-left"
                        style={{ width: 24 }}
                      >
                        {c}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {companies.map((rowC, i) => (
                  <tr key={rowC}>
                    <th className="data whitespace-nowrap pr-2.5 text-right font-normal">
                      {rowC}
                    </th>
                    {companies.map((colC, j) => {
                      const v = matrix[i][j];
                      const diag = i === j;
                      const on =
                        sel &&
                        ((sel[0] === rowC && sel[1] === colC) ||
                          (sel[0] === colC && sel[1] === rowC));
                      return (
                        <td key={colC} className="p-0">
                          <button
                            disabled={diag || v === 0}
                            onClick={() => setSel([rowC, colC])}
                            title={
                              diag
                                ? rowC
                                : `${rowC} and ${colC}: ${v} shared ${v === 1 ? "story" : "stories"}`
                            }
                            className={`block h-8 w-8 font-data text-micro tabular-nums transition ${
                              diag
                                ? "cursor-default bg-inset"
                                : v === 0
                                  ? "cursor-default"
                                  : "hover:outline hover:outline-1 hover:outline-ink"
                            } ${on ? "outline outline-2 outline-signal" : ""}`}
                            style={{
                              background: diag ? undefined : shade(v),
                              color: v / maxVal > 0.5 ? "#fff" : INK_2,
                            }}
                          >
                            {diag ? "" : v > 0 ? v : ""}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* The board's freed width does real work: the same ranked pairs
              that carry the whole view on a narrow screen sit beside the
              matrix here, not hidden behind it. */}
          <div className="lg:w-80 lg:shrink-0">
            <div className="band px-2.5 py-1.5">
              <p className="label-strong">Strongest pairs</p>
            </div>
            <ul className="mt-1">
              {rankedPairs.slice(0, 12).map(({ pair, n }) => {
                const on =
                  sel &&
                  ((sel[0] === pair[0] && sel[1] === pair[1]) ||
                    (sel[0] === pair[1] && sel[1] === pair[0]));
                return (
                  <li key={pair.join()}>
                    <button
                      onClick={() => setSel(pair)}
                      data-active={!!on}
                      className="flex w-full items-baseline justify-between gap-3 rounded-[3px] px-2.5 py-1.5 text-left font-ui text-meta transition-colors hover:bg-inset data-[active=true]:bg-lane-wash data-[active=true]:text-lane-ink"
                    >
                      <span className="truncate">
                        {pair[0]} <span className="text-ink-3">+</span> {pair[1]}
                      </span>
                      <span className="data shrink-0">{n}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <ul className="border-t border-rule">
          {rankedPairs.map(({ pair, n }) => (
            <li key={pair.join()}>
              <button
                onClick={() => setSel(pair)}
                className="flex w-full items-baseline justify-between gap-4 border-b border-rule py-3 text-left"
              >
                <span className="font-ui text-meta">
                  {pair[0]} <span className="text-ink-3">and</span> {pair[1]}
                </span>
                <span className="data shrink-0">{n}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {sel && (
        <section className="mt-10 border-t-2 border-ink pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-head font-semibold">
              {sel[0]} <span className="font-normal text-ink-3">and</span>{" "}
              {sel[1]}
            </h3>
            <button
              onClick={() => setSel(null)}
              className="font-ui text-meta text-ink-3 underline underline-offset-4 hover:text-ink"
            >
              Close
            </button>
          </div>
          <p className="label mt-1">
            {selStories.length} shared{" "}
            {selStories.length === 1 ? "story" : "stories"}
          </p>
          <ul className="mt-4">
            {selStories.map((it) => (
              <StoryRow key={it.id} item={it} showDate />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Trends                                                              */
/* ------------------------------------------------------------------ */

type TrendRange = "7d" | "30d" | "90d" | "all";

export function TrendsView({
  items,
  loading,
}: {
  items: Item[];
  loading: boolean;
}) {
  const [range, setRange] = useState<TrendRange>("30d");
  const [sortBy, setSortBy] = useState<"mentions" | "avgImportance">("mentions");
  const narrow = useMediaQuery("(max-width: 640px)");

  const model = useMemo(() => {
    const DAY = 86_400_000;
    // Anchor on the last day the pipeline actually published, not on today.
    // Anchoring on the clock draws a flat run of zeros from the last brief to
    // now, which looks like the product broke rather than like the job was
    // simply not due to run again yet.
    let end = 0;
    for (const it of items) {
      const t = parseYMD(it.addedOn).getTime();
      if (t > end) end = t;
    }
    if (!end) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      end = today.getTime();
    }

    let windowDays: number;
    if (range === "7d") windowDays = 7;
    else if (range === "30d") windowDays = 30;
    else if (range === "90d") windowDays = 90;
    else {
      let earliest = end;
      for (const it of items) {
        const t = parseYMD(it.addedOn).getTime();
        if (t < earliest) earliest = t;
      }
      windowDays = Math.max(1, Math.round((end - earliest) / DAY) + 1);
    }

    const cutoff = end - (windowDays - 1) * DAY;
    const scoped = items.filter((it) => parseYMD(it.addedOn).getTime() >= cutoff);

    const keys: string[] = [];
    const labels: string[] = [];
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(end - i * DAY);
      keys.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      );
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
    const at = new Map(keys.map((k, i) => [k, i]));

    const tagTotals = new Map<string, number>();
    for (const it of scoped)
      for (const t of it.tags ?? [])
        tagTotals.set(t, (tagTotals.get(t) ?? 0) + 1);
    const tagKeys = [...tagTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    const byTag = keys.map((k, i) => {
      const row: Record<string, number | string> = { day: labels[i], _k: k };
      for (const t of tagKeys) row[t] = 0;
      return row;
    });
    const buckets = keys.map((_, i) => ({
      day: labels[i],
      sum: 0,
      n: 0,
    }));

    for (const it of scoped) {
      const i = at.get(it.addedOn);
      if (i === undefined) continue;
      for (const t of it.tags ?? [])
        if (tagKeys.includes(t)) byTag[i][t] = (byTag[i][t] as number) + 1;
      const imp = it.importance || 0;
      buckets[i].sum += imp;
      buckets[i].n += 1;
    }

    const signal = buckets.map((b) => ({
      day: b.day,
      avg: b.n ? +(b.sum / b.n).toFixed(2) : null,
    }));

    const perCompany = new Map<string, { n: number; sum: number }>();
    for (const it of scoped)
      for (const c of companiesOf(it)) {
        const cur = perCompany.get(c) ?? { n: 0, sum: 0 };
        cur.n += 1;
        cur.sum += it.importance || 0;
        perCompany.set(c, cur);
      }
    const leaderboard = [...perCompany.entries()]
      // A company with one mention and a lucky 5 should not top an average
      // ranking. Require a little evidence first.
      .filter(([, v]) => (sortBy === "avgImportance" ? v.n >= 3 : true))
      .map(([company, v]) => ({
        company,
        mentions: v.n,
        avgImportance: +(v.sum / v.n).toFixed(2),
      }));

    return {
      byTag,
      tagKeys,
      signal,
      leaderboard,
      dayCount: labels.length,
      windowLabel:
        range === "all" ? `All ${windowDays} days` : `Last ${windowDays} days`,
    };
  }, [items, range, sortBy]);

  const board = useMemo(
    () =>
      [...model.leaderboard]
        .sort((a, b) => b[sortBy] - a[sortBy])
        .slice(0, narrow ? 8 : 14),
    [model.leaderboard, sortBy, narrow],
  );

  if (loading)
    return (
      <div className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8">
        <StorySkeleton />
      </div>
    );

  // Thin the axis out so labels never collide on a phone.
  const tickEvery = Math.max(
    0,
    Math.ceil(model.dayCount / (narrow ? 5 : 12)) - 1,
  );

  return (
    <main className="mx-auto max-w-[100rem] space-y-14 px-5 py-8 sm:px-8">
      <div className="scroll-x -mx-5 px-5 pb-1">
        <div className="seg inline-flex">
          {(["7d", "30d", "90d", "all"] as TrendRange[]).map((r) => (
            <button key={r} onClick={() => setRange(r)} data-active={range === r}>
              {r === "all" ? "All time" : `Last ${r.replace("d", " days")}`}
            </button>
          ))}
        </div>
      </div>

      <section>
        <SectionHead
          title="What the coverage is about"
          note={`${model.windowLabel}, top ${model.tagKeys.length} tags`}
        >
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {model.tagKeys.map((t, i) => (
              <span key={t} className="label flex items-center gap-1.5">
                <span
                  className="block h-2.5 w-2.5"
                  style={{ background: SERIES[i % SERIES.length] }}
                />
                {tagLabel(t)}
              </span>
            ))}
          </div>
        </SectionHead>
        <div className="h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={model.byTag}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={RULE} vertical={false} />
              <XAxis
                dataKey="day"
                tick={axisTick}
                axisLine={{ stroke: RULE }}
                tickLine={false}
                interval={tickEvery}
                minTickGap={8}
              />
              <YAxis
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={30}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f4f3ef" }} />
              {model.tagKeys.map((t, i) => (
                <Area
                  key={t}
                  type="monotone"
                  dataKey={t}
                  name={tagLabel(t)}
                  stackId="1"
                  stroke={SERIES[i % SERIES.length]}
                  fill={SERIES[i % SERIES.length]}
                  fillOpacity={0.14}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <SectionHead
          title="How strong the news was"
          note={`${model.windowLabel}, average importance per day. Gaps are days the job did not run.`}
        />
        <div className="h-56 w-full sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={model.signal}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke={RULE} vertical={false} />
              <XAxis
                dataKey="day"
                tick={axisTick}
                axisLine={{ stroke: RULE }}
                tickLine={false}
                interval={tickEvery}
                minTickGap={8}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={axisTick}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                content={<ChartTooltip format={(v) => v.toFixed(2)} />}
                cursor={{ stroke: RULE }}
              />
              <Line
                type="monotone"
                dataKey="avg"
                name="Average"
                stroke={SIGNAL}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <SectionHead
          title="Who is getting written about"
          note={
            sortBy === "avgImportance"
              ? `${model.windowLabel}, companies with at least 3 mentions`
              : model.windowLabel
          }
        >
          <div className="seg">
            <button
              onClick={() => setSortBy("mentions")}
              data-active={sortBy === "mentions"}
            >
              By volume
            </button>
            <button
              onClick={() => setSortBy("avgImportance")}
              data-active={sortBy === "avgImportance"}
            >
              By importance
            </button>
          </div>
        </SectionHead>
        {board.length === 0 ? (
          <EmptyState
            title="Nothing in this window"
            body="Widen the range to see companies here."
          />
        ) : (
          <div style={{ height: board.length * 30 + 36 }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={board}
                layout="vertical"
                margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke={RULE} horizontal={false} />
                <XAxis
                  type="number"
                  tick={axisTick}
                  axisLine={{ stroke: RULE }}
                  tickLine={false}
                  allowDecimals={sortBy === "avgImportance"}
                  domain={sortBy === "avgImportance" ? [0, 5] : undefined}
                />
                <YAxis
                  type="category"
                  dataKey="company"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  width={narrow ? 84 : 130}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      format={(v) =>
                        sortBy === "avgImportance" ? v.toFixed(2) : String(v)
                      }
                    />
                  }
                  cursor={{ fill: "#f4f3ef" }}
                />
                <Bar
                  dataKey={sortBy}
                  name={sortBy === "mentions" ? "Stories" : "Avg importance"}
                  fill={INK}
                  barSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </main>
  );
}

export { sortByImportance };
