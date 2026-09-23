import { useState } from "react";
import {
  longDate,
  momentumFor,
  relativeDayLabel,
  sortByImportance,
  type Day,
  type Item,
  type Momentum,
} from "@/lib/digest";
import { StoryRow } from "./Story";

/**
 * A list of daily briefs, each expanding to the stories behind it.
 *
 * This is the product's primary object. A date range asks "what happened
 * over these days", and the honest answer is a short stack of briefs, not
 * every story from every day poured into one list — which is what a range
 * used to return, and which buried the synthesis the digest exists to
 * produce. The stories are still one click away, as the evidence for the
 * brief rather than as a replacement for it.
 */
export function BriefList({
  days,
  history,
  seen,
  markRead,
  ready,
  defaultOpen,
}: {
  days: Day[];
  history: Map<string, string[]>;
  seen: Set<string>;
  markRead: (id: string) => void;
  ready: boolean;
  /** Opens one day on first render, so a range never lands fully collapsed. */
  defaultOpen?: string;
}) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);

  return (
    <div className="border-t border-rule">
      {days.map((day) => {
        const isOpen = open === day.date;
        const label = relativeDayLabel(day.date);
        const leads = day.items.filter((i) => i.importance >= 5).length;

        return (
          <section key={day.date} className="border-b border-rule">
            <h3>
              <button
                onClick={() => setOpen(isOpen ? null : day.date)}
                aria-expanded={isOpen}
                className="group flex w-full items-start gap-5 py-5 text-left transition-colors hover:bg-inset sm:gap-8 sm:px-3 sm:-mx-3"
              >
                <span className="w-28 shrink-0 pt-0.5 sm:w-36">
                  <span className="block font-ui text-micro font-semibold uppercase tracking-[0.07em] text-ink-2">
                    {label === "Today" || label === "Yesterday"
                      ? label
                      : longDate(day.date).replace(/,? \d{4}$/, "")}
                  </span>
                  <span className="data mt-0.5 block">
                    {day.items.length} {day.items.length === 1 ? "story" : "stories"}
                    {leads > 0 ? ` · ${leads} lead` : ""}
                  </span>
                </span>

                {/* The summary is the row. It reads at content weight because
                    it is the thing the reader came for. */}
                <span className="min-w-0 flex-1">
                  <span className="block max-w-[78ch] text-body leading-[1.6] text-ink">
                    {day.summary || "No summary was written for this day."}
                  </span>
                  <span className="quiet-action mt-2 inline-block group-hover:text-ink">
                    {isOpen ? "Hide stories" : "Show stories"}
                  </span>
                </span>

                <span className="shrink-0 pt-1 text-ink-3">
                  <svg
                    aria-hidden="true"
                    width="11"
                    height="11"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="transition-transform"
                    style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                  >
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
              </button>
            </h3>

            {isOpen && (
              <ul className="anim-in grid gap-x-10 pb-5 sm:pl-36 xl:grid-cols-2">
                {sortByImportance(day.items).map((it: Item) => (
                  <StoryRow
                    key={it.id}
                    item={it}
                    lead={it.importance >= 5}
                    momentum={momentumFor(it, history) as Momentum | null}
                    read={ready && seen.has(it.id)}
                    onOpen={markRead}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
