/**
 * Shared digest domain model.
 *
 * This file is the single source of truth for the digest shape and every
 * derived statistic the UI needs. Routes import from here rather than
 * redeclaring types and date helpers, which is how the three route files
 * drifted apart previously.
 */

export type Item = {
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

export type Day = {
  date: string;
  summary: string;
  items: Item[];
};

export type Digest = {
  lastUpdated: string | null;
  days: Day[];
};

export const DATA_URL = "/data/digest.json";

/** How often the client re-checks for a new digest, in ms. */
export const REFRESH_MS = 15 * 60 * 1000;

export const TAG_VOCAB = [
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
] as const;

const TAG_LABELS: Record<string, string> = {
  launch: "Launch",
  funding: "Funding",
  leadership: "Leadership",
  regulation: "Regulation",
  "open-source": "Open source",
  competitive: "Competitive",
  research: "Research",
  product: "Product",
  infra: "Infra",
  tooling: "Tooling",
};

export function tagLabel(tag: string): string {
  return TAG_LABELS[tag] ?? tag;
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

/** Parse a YYYY-MM-DD pipeline date as local midnight. */
export function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function shortDate(s: string): string {
  return parseYMD(s).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function longDate(s: string): string {
  return parseYMD(s).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * "Today" / "Yesterday" / weekday for a pipeline date, relative to the
 * viewer's local clock.
 */
export function relativeDayLabel(dateStr: string): string {
  const d = parseYMD(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / DAY_MS);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/**
 * Sort key for an item. Prefers the source's publish time and falls back to
 * the day the pipeline added it.
 */
export function itemTs(it: Item): number {
  if (it.publishedAt) {
    const t = new Date(it.publishedAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return parseYMD(it.addedOn).getTime();
}

/**
 * Render a timestamp in a fixed zone with the zone named, so the label is
 * never a lie for readers outside that zone.
 */
export function timeInZone(
  iso: string | null | undefined,
  timeZone = "America/New_York",
): string {
  if (!iso) return "not yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "not yet";
  try {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone,
      timeZoneName: "short",
    });
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
  }
}

/** Whole days between a pipeline date and today, local. */
export function daysAgo(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - parseYMD(dateStr).getTime()) / DAY_MS);
}

/* ------------------------------------------------------------------ */
/* Shaping                                                             */
/* ------------------------------------------------------------------ */

export function allItems(digest: Digest | null): Item[] {
  return digest ? digest.days.flatMap((d) => d.items) : [];
}

/** Every company named by an item, primary and secondary, deduped. */
export function companiesOf(it: Item): string[] {
  const set = new Set<string>();
  if (it.company) set.add(it.company);
  for (const c of it.secondaryCompanies ?? []) if (c) set.add(c);
  return [...set];
}

export function sortByImportance(items: Item[]): Item[] {
  return [...items].sort(
    (a, b) => b.importance - a.importance || itemTs(b) - itemTs(a),
  );
}

export type RangeKey = "latest" | "7d" | "30d" | "all";

export const RANGE_LABELS: Record<RangeKey, string> = {
  latest: "Latest brief",
  "7d": "Past 7 days",
  "30d": "Past 30 days",
  all: "All time",
};

/**
 * Select the days a range covers.
 *
 * "latest" means the newest day actually present in the file, not a rolling
 * wall-clock window. The pipeline publishes once a day and can skip a day, so
 * a 48-hour window silently empties the page whenever a run is missed. Anchor
 * on the data instead of the clock.
 */
export function daysInRange(digest: Digest | null, range: RangeKey): Day[] {
  if (!digest || digest.days.length === 0) return [];
  const sorted = [...digest.days].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (range === "latest") return sorted.slice(0, 1);
  if (range === "all") return sorted;

  const span = range === "7d" ? 7 : 30;
  const newest = parseYMD(sorted[0].date).getTime();
  const cutoff = newest - (span - 1) * DAY_MS;
  return sorted.filter((d) => parseYMD(d.date).getTime() >= cutoff);
}

/* ------------------------------------------------------------------ */
/* Derived intelligence                                                */
/* ------------------------------------------------------------------ */

export type Momentum = {
  /** Times this company appeared in the trailing window, including today. */
  count: number;
  /** True when the archive has never mentioned it before this item's day. */
  isFirst: boolean;
};

/**
 * Build a company -> sorted list of pipeline dates index, once, so momentum
 * lookups during render are cheap.
 */
export function buildCompanyHistory(items: Item[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const it of items) {
    for (const c of companiesOf(it)) {
      const arr = map.get(c);
      if (arr) arr.push(it.addedOn);
      else map.set(c, [it.addedOn]);
    }
  }
  for (const arr of map.values()) arr.sort();
  return map;
}

/**
 * How often this item's primary company has come up lately.
 *
 * This is the cheapest real intelligence on the page: the archive is already
 * in memory, so "fourth mention in seven days" costs nothing and tells the
 * reader something a raw feed never could.
 */
export function momentumFor(
  item: Item,
  history: Map<string, string[]>,
  windowDays = 7,
): Momentum | null {
  const company = item.company;
  if (!company) return null;
  const dates = history.get(company);
  if (!dates || dates.length === 0) return null;

  const anchor = parseYMD(item.addedOn).getTime();
  const cutoff = anchor - (windowDays - 1) * DAY_MS;

  let count = 0;
  let earlier = 0;
  for (const d of dates) {
    const t = parseYMD(d).getTime();
    if (t < anchor) earlier += 1;
    if (t >= cutoff && t <= anchor) count += 1;
  }

  return { count, isFirst: earlier === 0 };
}

export type SignalStats = {
  todayAvg: number;
  baselineAvg: number;
  /** Positive when the day runs hotter than the trailing baseline. */
  delta: number;
  todayCount: number;
  mustReads: number;
  baselineDays: number;
};

/**
 * Compare the newest day against the trailing baseline.
 *
 * One honest sentence about whether today actually matters is worth more than
 * another chart, and it is free: the numbers are already loaded.
 */
export function signalStats(
  digest: Digest | null,
  baselineDays = 30,
): SignalStats | null {
  const days = digest?.days ?? [];
  if (days.length === 0) return null;
  const sorted = [...days].sort((a, b) => (a.date < b.date ? 1 : -1));
  const today = sorted[0];
  if (!today.items.length) return null;

  const avg = (arr: Item[]) =>
    arr.length
      ? arr.reduce((s, it) => s + (it.importance || 0), 0) / arr.length
      : 0;

  const baselineSet = sorted.slice(1, 1 + baselineDays);
  const baselineItems = baselineSet.flatMap((d) => d.items);

  const todayAvg = avg(today.items);
  const baselineAvg = avg(baselineItems);

  return {
    todayAvg,
    baselineAvg,
    delta: baselineItems.length ? todayAvg - baselineAvg : 0,
    todayCount: today.items.length,
    mustReads: today.items.filter((it) => it.importance >= 5).length,
    baselineDays: baselineSet.length,
  };
}

/** Plain-language reading of the signal stats. No chart required. */
export function signalSentence(s: SignalStats): string {
  const strength =
    Math.abs(s.delta) < 0.15
      ? "in line with"
      : s.delta > 0
        ? "above"
        : "below";
  const base = s.baselineDays
    ? `, ${strength} the ${s.baselineDays}-day average of ${s.baselineAvg.toFixed(1)}`
    : "";
  const must =
    s.mustReads === 0
      ? "no must-reads"
      : s.mustReads === 1
        ? "1 must-read"
        : `${s.mustReads} must-reads`;
  return `${s.todayCount} stories, ${must}, averaging ${s.todayAvg.toFixed(1)} out of 5${base}.`;
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

/** Today's brief as markdown, for pasting into Slack or a doc. */
export function briefToMarkdown(day: Day): string {
  const lines: string[] = [];
  lines.push(`# Daybreak, ${longDate(day.date)}`);
  if (day.summary) lines.push("", day.summary);
  lines.push("");
  for (const it of sortByImportance(day.items)) {
    const flag = it.importance >= 5 ? " **[must read]**" : "";
    lines.push(`- [${it.title}](${it.link})${flag}`);
    const meta = [it.company, it.source].filter(Boolean).join(", ");
    if (it.summary) lines.push(`  ${it.summary}${meta ? ` (${meta})` : ""}`);
  }
  lines.push("", `Source: ${day.items.length} stories from daybreak.`);
  return lines.join("\n");
}
