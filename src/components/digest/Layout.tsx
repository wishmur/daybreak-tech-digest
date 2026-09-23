/**
 * The shared page frame.
 *
 * Every view sits inside the same measure, the same gutters and the same
 * vertical rhythm, so moving between Brief, Companies, Who appears together,
 * Trends and Archive never shifts the content edges. Before this, the five
 * views ran at four different widths (65rem, 80rem and 100rem) and four
 * different vertical paddings, which is what made the product read as a set
 * of separate pages rather than one system.
 */

/** The frame. Matches the TopBar and footer so every edge lines up. */
export function Page({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={`mx-auto max-w-[80rem] px-5 pb-16 pt-7 sm:px-8 ${className}`}>{children}</main>
  );
}

/**
 * A page header.
 *
 * A small uppercase eyebrow is deliberately not used here: the title carries
 * its own weight, and the digest's own masthead sets the pattern of a quiet
 * label line followed by content.
 */
export function PageHeader({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-rule pb-4">
      <div className="min-w-0">
        <h2 className="font-display text-head font-bold leading-[1.15] text-ink">{title}</h2>
        {note && <p className="label mt-1">{note}</p>}
      </div>
      {children}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

/**
 * Page numbers with the current page, its neighbours and both ends.
 *
 * A bare Previous/Next pair hides how long the list is and is one click
 * away from skipping the last page.
 */
function pageWindow(page: number, total: number): (number | "gap")[] {
  const span = 1;
  const keep = new Set<number>([1, total]);
  for (let i = page - span; i <= page + span; i++) if (i >= 1 && i <= total) keep.add(i);

  const out: (number | "gap")[] = [];
  let prev = 0;
  for (const n of [...keep].sort((a, b) => a - b)) {
    if (prev && n - prev > 1) out.push("gap");
    out.push(n);
    prev = n;
  }
  return out;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
  unit = "stories",
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
  /** What is being counted, so the range reads as a sentence. */
  unit?: string;
}) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-5 no-print"
    >
      <span className="data">
        {from} to {to} of {total} {unit}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="ctl">
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
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} className="ctl">
          Next
        </button>
      </div>
    </nav>
  );
}
