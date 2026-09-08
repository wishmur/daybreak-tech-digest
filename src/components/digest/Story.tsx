import {
  shortDate,
  tagLabel,
  type Item,
  type Momentum,
} from "@/lib/digest";

/* ------------------------------------------------------------------ */
/* Importance                                                          */
/* ------------------------------------------------------------------ */

/**
 * A five segment meter.
 *
 * The old build showed importance three different ways at once: a vertical
 * dot column, a coloured pill badge, and a red left border on the card. Three
 * encodings of one number is noise. This is the only one.
 */
export function ImportanceMeter({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, Math.round(value || 0)));
  const fill = v >= 5 ? "bg-signal" : v >= 3 ? "bg-ink" : "bg-ink-3";
  return (
    <span
      className="inline-flex items-center gap-[2px] align-middle"
      role="img"
      aria-label={`Importance ${v} of 5`}
      title={`Importance ${v} of 5`}
    >
      {/* Upright bars, not a row of dashes. Laid out horizontally the
          segments read as em dashes or a text divider rather than a level. */}
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`block w-[3px] ${i < v ? fill : "bg-sunk"}`}
          style={{ height: 5 + i * 2 }}
        />
      ))}
    </span>
  );
}

/**
 * Turn a momentum reading into a short phrase, or nothing.
 *
 * Returns null rather than an empty element so the caller can decide whether
 * a separator dot is needed at all.
 */
function momentumText(m: Momentum | null | undefined): string | null {
  if (!m) return null;
  if (m.isFirst) return "First appearance";
  if (m.count < 3) return null;
  // A count, not an ordinal. This is how many times the company came up in
  // the trailing week, which is the same number for every story that week;
  // phrasing it as "4th mention" implied a per-story position it never had.
  return `${m.count} mentions this week`;
}

/* ------------------------------------------------------------------ */
/* Story                                                               */
/* ------------------------------------------------------------------ */

export function StoryRow({
  item,
  momentum,
  read = false,
  onOpen,
  showDate = false,
}: {
  item: Item;
  momentum?: Momentum | null;
  read?: boolean;
  onOpen?: (id: string) => void;
  showDate?: boolean;
}) {
  const tags = (item.tags ?? []).slice(0, 3);
  const bits: React.ReactNode[] = [];
  if (item.company)
    bits.push(
      <span key="c" className="font-semibold text-ink">
        {item.company}
      </span>,
    );
  if (item.topic) bits.push(<span key="t">{item.topic}</span>);
  const mNote = momentumText(momentum);
  if (mNote)
    bits.push(
      <span key="m" className="text-ink-2">
        {mNote}
      </span>,
    );

  return (
    <li className="border-b border-rule last:border-b-0">
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        data-story
        data-story-link={item.link}
        onClick={() => onOpen?.(item.id)}
        onAuxClick={() => onOpen?.(item.id)}
        className="group block py-6 no-underline transition-colors hover:bg-inset focus-visible:bg-inset sm:px-3 sm:-mx-3 data-[kbd=on]:bg-inset"
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <ImportanceMeter value={item.importance} />
          {item.importance >= 5 && (
            <span className="font-ui text-micro font-semibold uppercase tracking-[0.04em] text-signal">
              Must read
            </span>
          )}
          {/* Spacing separates these, not punctuation. Interpuncts between
              wrapping items strand a lone dot at the start of a line, which
              is exactly what happened at phone widths. */}
          <span className="label flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {bits}
          </span>
        </div>

        <h3
          className={`mt-2 text-head font-semibold leading-[1.22] decoration-signal decoration-2 underline-offset-[6px] group-hover:underline ${
            read ? "text-ink-3" : "text-ink"
          }`}
        >
          {item.title}
        </h3>

        {item.summary && (
          <p className="measure mt-2 text-body leading-[1.5] text-ink-2">
            {item.summary}
          </p>
        )}

        {/* Provenance on the left, subject tags on the right of a hairline.
            Without the divider the source, date and tags read as one
            undifferentiated string of words. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="data">{item.source}</span>
          {showDate && <span className="data">{shortDate(item.addedOn)}</span>}
          {tags.length > 0 && (
            <span aria-hidden="true" className="h-3 w-px bg-rule" />
          )}
          {tags.map((t) => (
            <span key={t} className="data text-ink-2">
              {tagLabel(t)}
            </span>
          ))}
          {read && (
            <>
              <span aria-hidden="true" className="h-3 w-px bg-rule" />
              {/* ink-3, not rule-2: rule-2 is a border colour and sits at
                  1.7:1 on paper, which is unreadable as text. */}
              <span className="data">read</span>
            </>
          )}
        </div>
      </a>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function StorySkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="animate-pulse" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="border-b border-rule py-6 last:border-b-0">
          <div className="h-3 w-40 bg-sunk" />
          <div className="mt-3 h-5 w-4/5 bg-sunk" />
          <div className="mt-2.5 h-4 w-full max-w-xl bg-sunk" />
          <div className="mt-1.5 h-4 w-2/3 max-w-md bg-sunk" />
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="border border-rule bg-inset px-6 py-12 text-center">
      <p className="text-head font-semibold">{title}</p>
      <p className="measure mx-auto mt-2 text-ink-2">{body}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="ctl mt-5">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
