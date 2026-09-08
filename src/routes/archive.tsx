import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  allItems,
  buildCompanyHistory,
  longDate,
  momentumFor,
  sortByImportance,
} from "@/lib/digest";
import { useDigest } from "@/lib/useDigest";
import { useReadState } from "@/lib/useReadState";
import { Masthead, SiteFooter, StatusBar, ViewTabs } from "@/components/digest/Chrome";
import { EmptyState, StoryRow, StorySkeleton } from "@/components/digest/Story";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Archive, Daybreak" },
      {
        name: "description",
        content: "Every brief Daybreak has published, newest first.",
      },
    ],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const { digest, loading, stale } = useDigest();
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const items = useMemo(() => allItems(digest), [digest]);
  const history = useMemo(() => buildCompanyHistory(items), [items]);
  const { seen, markRead, ready } = useReadState(items);

  const days = useMemo(() => {
    const sorted = [...(digest?.days ?? [])].sort((a, b) =>
      a.date < b.date ? 1 : -1,
    );
    const needle = q.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter(
      (d) =>
        d.summary.toLowerCase().includes(needle) ||
        d.items.some((it) =>
          `${it.title} ${it.summary} ${it.company}`
            .toLowerCase()
            .includes(needle),
        ),
    );
  }, [digest, q]);

  return (
    <div className="min-h-screen">
      <StatusBar
        lastUpdated={digest?.lastUpdated}
        latestDate={digest?.days?.[0]?.date}
        totalItems={items.length}
        loading={loading && !digest}
        stale={stale && !loading}
      />
      <Masthead tagline={false} />
      <ViewTabs archiveActive />

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
          <div>
            <h2 className="text-head-lg font-semibold">Every brief so far</h2>
            <p className="label mt-1">
              {days.length} {days.length === 1 ? "issue" : "issues"}
              {q.trim() ? " matching your search" : ""}
            </p>
          </div>
          <label className="w-full sm:w-72">
            <span className="sr-only">Search the archive</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search every brief"
              className="w-full border border-rule bg-transparent px-2.5 py-[7px] font-ui text-meta placeholder:text-ink-3"
            />
          </label>
        </div>

        {loading && !digest ? (
          <StorySkeleton rows={6} />
        ) : days.length === 0 ? (
          <EmptyState
            title={q.trim() ? "Nothing matches" : "The archive is empty"}
            body={
              q.trim()
                ? "Try a company name, or a word you remember from the headline."
                : "Briefs will appear here once the morning job has run."
            }
            actionLabel={q.trim() ? "Clear search" : undefined}
            onAction={q.trim() ? () => setQ("") : undefined}
          />
        ) : (
          <div className="border-t border-rule">
            {days.map((day) => {
              const isOpen = open === day.date;
              return (
                <section key={day.date} className="border-b border-rule">
                  <h3>
                    <button
                      onClick={() => setOpen(isOpen ? null : day.date)}
                      aria-expanded={isOpen}
                      className="flex w-full items-start gap-4 py-5 text-left sm:gap-8"
                    >
                      <span className="data w-24 shrink-0 pt-1 sm:w-32">
                        {longDate(day.date).replace(/,? \d{4}$/, "")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-body leading-[1.5] text-ink-2">
                          {day.summary || "No summary was written for this day."}
                        </span>
                      </span>
                      <span className="data shrink-0 pt-1">
                        {day.items.length}
                        <span
                          aria-hidden="true"
                          className="ml-2 inline-block transition-transform"
                          style={{
                            transform: isOpen ? "rotate(180deg)" : "none",
                          }}
                        >
                          ▾
                        </span>
                      </span>
                    </button>
                  </h3>
                  {isOpen && (
                    <ul className="anim-in pb-4 sm:pl-32">
                      {sortByImportance(day.items).map((it) => (
                        <StoryRow
                          key={it.id}
                          item={it}
                          momentum={momentumFor(it, history)}
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
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
