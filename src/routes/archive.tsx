import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { allItems, buildCompanyHistory } from "@/lib/digest";
import { useDigest } from "@/lib/useDigest";
import { useReadState } from "@/lib/useReadState";
import { SiteFooter, TopBar } from "@/components/digest/Chrome";
import { EmptyState, StorySkeleton } from "@/components/digest/Story";
import { PageHeader, Pagination } from "@/components/digest/Layout";
import { BriefList } from "@/components/digest/Brief";

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

/** Briefs per page. Lower than a story page: each row is a paragraph. */
const ARCHIVE_PAGE_SIZE = 10;

function ArchivePage() {
  const { digest, loading, stale } = useDigest();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

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

  useEffect(() => setPage(1), [q]);

  const totalPages = Math.max(1, Math.ceil(days.length / ARCHIVE_PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageDays = useMemo(
    () =>
      days.slice((current - 1) * ARCHIVE_PAGE_SIZE, current * ARCHIVE_PAGE_SIZE),
    [days, current],
  );

  return (
    <div className="min-h-screen">
      <TopBar
        archiveActive
        lastUpdated={digest?.lastUpdated}
        latestDate={digest?.days?.[0]?.date}
        totalItems={items.length}
        loading={loading && !digest}
        stale={stale && !loading}
      />

      <main className="mx-auto max-w-[80rem] px-5 pb-16 pt-7 sm:px-8">
        <PageHeader
          title="Every brief so far"
          note={`${days.length} ${days.length === 1 ? "brief" : "briefs"}${q.trim() ? " matching your search" : ""}`}
        >
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search the archive</span>
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
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search every brief"
              className="search-field w-full"
            />
          </label>
        </PageHeader>

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
          <>
            <BriefList
              days={pageDays}
              history={history}
              seen={seen}
              markRead={markRead}
              ready={ready}
            />
            <Pagination
              page={current}
              totalPages={totalPages}
              total={days.length}
              pageSize={ARCHIVE_PAGE_SIZE}
              onChange={(p) => {
                setPage(p);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              unit="briefs"
            />
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
