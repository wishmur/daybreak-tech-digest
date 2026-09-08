import { useEffect, useRef, useState } from "react";
import { TAG_VOCAB, tagLabel, RANGE_LABELS, type RangeKey } from "@/lib/digest";

export type Filters = {
  range: RangeKey;
  companies: string[];
  topics: string[];
  sources: string[];
  tags: string[];
  minImportance: 0 | 3 | 4 | 5;
  q: string;
};

export const DEFAULT_FILTERS: Filters = {
  range: "latest",
  companies: [],
  topics: [],
  sources: [],
  tags: [],
  minImportance: 0,
  q: "",
};

export function hasActiveFilters(f: Filters): boolean {
  return (
    f.range !== DEFAULT_FILTERS.range ||
    f.companies.length > 0 ||
    f.topics.length > 0 ||
    f.sources.length > 0 ||
    f.tags.length > 0 ||
    f.minImportance !== 0 ||
    f.q.trim() !== ""
  );
}

/* ------------------------------------------------------------------ */
/* Dropdown plumbing                                                   */
/* ------------------------------------------------------------------ */

/**
 * Close on an outside click or Escape, and hand focus back to the trigger.
 * The previous dropdowns had neither, so a keyboard user could open one and
 * never get out of it.
 */
function useDismissable(open: boolean, close: () => void) {
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        wrap.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return wrap;
}

function Chevron() {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function MultiSelect({
  label,
  options,
  value,
  onChange,
  block = false,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useDismissable(open, () => setOpen(false));
  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);

  return (
    <div className={`relative ${block ? "w-full" : ""}`} ref={wrap}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        data-active={value.length > 0}
        className={`ctl inline-flex items-center gap-1.5 ${block ? "w-full justify-between" : ""}`}
      >
        <span>
          {label}
          {value.length > 0 && (
            <span className="ml-1.5 font-data text-micro">{value.length}</span>
          )}
        </span>
        <Chevron />
      </button>
      {open && (
        <div
          role="listbox"
          className="surface absolute left-0 z-30 mt-1 max-h-72 w-64 max-w-[85vw] overflow-y-auto p-1"
        >
          {options.length === 0 ? (
            <p className="label px-2 py-2">Nothing to filter yet.</p>
          ) : (
            options.map((o) => (
              <label
                key={o}
                className="flex cursor-pointer items-center gap-2.5 px-2 py-1.5 text-meta hover:bg-inset"
              >
                <input
                  type="checkbox"
                  checked={value.includes(o)}
                  onChange={() => toggle(o)}
                  className="h-3.5 w-3.5 shrink-0 accent-signal"
                />
                <span className="truncate">{o}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter bar                                                          */
/* ------------------------------------------------------------------ */

export function FilterControls({
  filters,
  setFilters,
  companyOptions,
  topicOptions,
  sourceOptions,
  stacked = false,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  companyOptions: string[];
  topicOptions: string[];
  sourceOptions: string[];
  stacked?: boolean;
}) {
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });

  // A hairline, not a box, groups the three clusters — scope, then
  // narrowing, then search — so the bar reads as one designed strip
  // instead of a loose run of form controls.
  const Divider = () =>
    stacked ? null : (
      <span aria-hidden="true" className="h-5 w-px shrink-0 bg-rule" />
    );

  return (
    <div
      className={
        stacked
          ? "flex flex-col gap-2.5"
          : "flex flex-wrap items-center gap-1.5 py-1.5"
      }
    >
      <div className={stacked ? "scroll-x flex gap-1.5 pb-1" : "flex gap-1.5"}>
        {(Object.keys(RANGE_LABELS) as RangeKey[]).map((r) => (
          <button
            key={r}
            onClick={() => set({ range: r })}
            data-active={filters.range === r}
            className="ctl shrink-0"
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      <Divider />

      <div
        className={
          stacked ? "flex flex-col gap-2.5" : "flex flex-wrap items-center gap-1.5"
        }
      >
        <MultiSelect
          label="Company"
          options={companyOptions}
          value={filters.companies}
          onChange={(v) => set({ companies: v })}
          block={stacked}
        />
        <MultiSelect
          label="Topic"
          options={topicOptions}
          value={filters.topics}
          onChange={(v) => set({ topics: v })}
          block={stacked}
        />
        <MultiSelect
          label="Source"
          options={sourceOptions}
          value={filters.sources}
          onChange={(v) => set({ sources: v })}
          block={stacked}
        />
        <MultiSelect
          label="Tag"
          options={[...TAG_VOCAB]}
          value={filters.tags}
          onChange={(v) => set({ tags: v })}
          block={stacked}
        />

        <button
          onClick={() =>
            set({ minImportance: filters.minImportance === 4 ? 0 : 4 })
          }
          data-active={filters.minImportance >= 4}
          className="ctl"
          title="Show only stories scored 4 or 5"
        >
          High signal only
        </button>
      </div>

      <Divider />

      <label className={stacked ? "w-full" : "min-w-[11rem] flex-1"}>
        <span className="sr-only">Search stories</span>
        <input
          value={filters.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Search headlines and summaries"
          className="w-full border border-rule bg-transparent px-2.5 py-[6px] font-ui text-meta placeholder:text-ink-3"
        />
      </label>
    </div>
  );
}

/** Chips describing what is currently on, each one removable. */
export function ActiveFilterChips({
  filters,
  setFilters,
  onReset,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  onReset: () => void;
}) {
  const chips: { key: string; label: string; clear: () => void }[] = [];
  const drop = (list: string[], v: string) => list.filter((x) => x !== v);

  for (const c of filters.companies)
    chips.push({
      key: `c-${c}`,
      label: c,
      clear: () => setFilters({ ...filters, companies: drop(filters.companies, c) }),
    });
  for (const t of filters.topics)
    chips.push({
      key: `t-${t}`,
      label: t,
      clear: () => setFilters({ ...filters, topics: drop(filters.topics, t) }),
    });
  for (const s of filters.sources)
    chips.push({
      key: `s-${s}`,
      label: s,
      clear: () => setFilters({ ...filters, sources: drop(filters.sources, s) }),
    });
  for (const g of filters.tags)
    chips.push({
      key: `g-${g}`,
      label: tagLabel(g),
      clear: () => setFilters({ ...filters, tags: drop(filters.tags, g) }),
    });
  if (filters.minImportance >= 4)
    chips.push({
      key: "imp",
      label: "High signal only",
      clear: () => setFilters({ ...filters, minImportance: 0 }),
    });
  if (filters.q.trim())
    chips.push({
      key: "q",
      label: `"${filters.q.trim()}"`,
      clear: () => setFilters({ ...filters, q: "" }),
    });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-2.5">
      {chips.map((c) => (
        <button
          key={c.key}
          onClick={c.clear}
          className="inline-flex items-center gap-1.5 border border-rule-2 px-2 py-1 font-ui text-micro text-ink-2 hover:border-ink hover:text-ink"
        >
          {c.label}
          <svg
            aria-hidden="true"
            width="8"
            height="8"
            viewBox="0 0 12 12"
            fill="none"
            className="shrink-0"
          >
            <path
              d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      <button
        onClick={onReset}
        className="px-1 font-ui text-micro text-ink-3 underline underline-offset-4 hover:text-ink"
      >
        Clear all
      </button>
    </div>
  );
}

/** Bottom sheet used below the md breakpoint. */
export function FilterSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto border-t border-rule-2 bg-paper px-5 pt-4"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-head font-semibold">Filters</h2>
          <button onClick={onClose} className="ctl" data-active="true">
            Done
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
