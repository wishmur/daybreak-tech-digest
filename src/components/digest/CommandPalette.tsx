import { useEffect, useMemo, useRef, useState } from "react";
import {
  RANGE_LABELS,
  shortDate,
  type Item,
  type RangeKey,
} from "@/lib/digest";
import type { NavKey } from "./Chrome";

type Row =
  | { kind: "range"; label: string; hint: string; value: RangeKey }
  | { kind: "view"; label: string; hint: string; value: NavKey }
  | { kind: "company"; label: string; hint: string }
  | { kind: "topic"; label: string; hint: string }
  | { kind: "story"; label: string; hint: string; link: string };

/**
 * Jump-to palette.
 *
 * Restyled from a black panel with blue selection highlights, which was left
 * over from an earlier dark design and looked like a different product had
 * been pasted on top of this one.
 */
export function CommandPalette({
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
  onSelectRange: (r: RangeKey) => void;
  onSelectView: (v: NavKey) => void;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const rows = useMemo<Row[]>(() => {
    const query = q.trim().toLowerCase();
    const hit = (s: string) => !query || s.toLowerCase().includes(query);
    const out: Row[] = [];

    for (const r of Object.keys(RANGE_LABELS) as RangeKey[])
      if (hit(RANGE_LABELS[r]) || hit("range"))
        out.push({
          kind: "range",
          label: RANGE_LABELS[r],
          hint: "Range",
          value: r,
        });

    const views: { k: NavKey; l: string }[] = [
      { k: "digest", l: "Brief" },
      { k: "companies", l: "Companies" },
      { k: "matrix", l: "Who appears together" },
      { k: "trends", l: "Trends" },
    ];
    for (const v of views)
      if (hit(v.l) || hit("go to"))
        out.push({ kind: "view", label: v.l, hint: "Section", value: v.k });

    for (const c of companyOptions)
      if (hit(c)) out.push({ kind: "company", label: c, hint: "Company" });
    for (const t of topicOptions)
      if (hit(t)) out.push({ kind: "topic", label: t, hint: "Topic" });

    if (query.length >= 2) {
      let n = 0;
      for (const it of items) {
        if (it.title.toLowerCase().includes(query)) {
          out.push({
            kind: "story",
            label: it.title,
            hint: `${it.company || it.source}, ${shortDate(it.addedOn)}`,
            link: it.link,
          });
          if (++n >= 8) break;
        }
      }
    }
    return out.slice(0, 40);
  }, [q, items, companyOptions, topicOptions]);

  useEffect(() => setIdx(0), [q]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelectorAll("li")
      [idx]?.scrollIntoView({ block: "nearest" });
  }, [idx]);

  if (!open) return null;

  const select = (r: Row) => {
    if (r.kind === "range") onSelectRange(r.value);
    else if (r.kind === "view") onSelectView(r.value);
    else if (r.kind === "company") onSelectCompany(r.label);
    else if (r.kind === "topic") onSelectTopic(r.label);
    else {
      window.open(r.link, "_blank", "noopener,noreferrer");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Jump to"
    >
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="surface relative w-full max-w-xl">
        <div className="flex items-center gap-3 border-b border-rule px-3.5 py-3">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(rows.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (rows[idx]) select(rows[idx]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Jump to a company, topic, story, or section"
            className="flex-1 bg-transparent font-ui text-body placeholder:text-ink-3 focus:outline-none"
          />
          <kbd className="data border border-rule px-1.5 py-0.5">esc</kbd>
        </div>
        <ul ref={listRef} className="max-h-[52vh] overflow-y-auto py-1">
          {rows.length === 0 ? (
            <li className="label px-3.5 py-8 text-center">No matches.</li>
          ) : (
            rows.map((r, i) => (
              <li key={`${r.kind}-${r.label}-${i}`}>
                <button
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => select(r)}
                  className={`flex w-full items-center gap-3 px-3.5 py-2 text-left ${
                    i === idx ? "bg-inset" : ""
                  }`}
                >
                  <span className="data w-24 shrink-0">{r.hint}</span>
                  <span className="min-w-0 flex-1 truncate font-ui text-meta">
                    {r.label}
                  </span>
                  {i === idx && (
                    <span className="data shrink-0 text-signal">enter</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
