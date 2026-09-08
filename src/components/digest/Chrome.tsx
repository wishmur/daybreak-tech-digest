import { Link } from "@tanstack/react-router";
import daybreakLogo from "@/assets/daybreak-logo.png.asset.json";
import { daysAgo, timeInZone } from "@/lib/digest";

/* ------------------------------------------------------------------ */
/* Status bar                                                          */
/* ------------------------------------------------------------------ */

export function StatusBar({
  lastUpdated,
  latestDate,
  totalItems,
  loading,
  stale,
}: {
  lastUpdated?: string | null;
  latestDate?: string;
  totalItems: number;
  loading: boolean;
  stale: boolean;
}) {
  // How far behind the pipeline is. The old bar showed a pulsing "live" dot
  // and a viewer-local time labelled "ET", which was decorative at best and
  // wrong for anyone outside that zone at worst.
  const behind = latestDate ? daysAgo(latestDate) : null;
  const lagged = behind !== null && behind >= 2;

  return (
    <div className="sticky top-0 z-40 border-b border-rule bg-paper">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 py-2">
          <span className="data">
            {loading
              ? "Loading"
              : `Last run ${timeInZone(lastUpdated ?? null)}`}
          </span>
          <span className="data hidden sm:inline">
            {totalItems.toLocaleString()} stories archived
          </span>
        </div>
        {(lagged || stale) && (
          <p className="border-t border-rule py-2 text-micro text-signal-ink">
            {stale
              ? "Showing the last copy saved in this browser. The live file could not be reached."
              : `No new brief for ${behind} days. The morning job may not be running.`}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Masthead                                                            */
/* ------------------------------------------------------------------ */

export function Masthead({ tagline = true }: { tagline?: boolean }) {
  return (
    <header className="mx-auto max-w-5xl px-5 pt-10 pb-6 sm:px-8 sm:pt-14">
      <div className="flex items-start gap-4 sm:gap-6">
        <img
          src={daybreakLogo.url}
          alt=""
          aria-hidden="true"
          width={44}
          height={44}
          className="mt-2 hidden h-11 w-11 shrink-0 sm:block"
        />
        <div className="min-w-0">
          <Link to="/" className="no-underline">
            <h1
              className="font-semibold"
              style={{
                fontSize: "clamp(2.75rem, 12vw, 5.5rem)",
                lineHeight: 0.92,
                letterSpacing: "-0.03em",
              }}
            >
              Daybreak
            </h1>
          </Link>
          {tagline && (
            <p className="measure mt-4 text-lede leading-[1.5] text-ink-2">
              A script reads the feeds every morning, asks Claude what matters
              to a product manager today, and posts the ten worth reading. Built
              because I was losing mornings to the firehose.
            </p>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export type NavKey = "digest" | "companies" | "matrix" | "trends";

const NAV: { key: NavKey; label: string }[] = [
  { key: "digest", label: "Brief" },
  { key: "companies", label: "Companies" },
  { key: "matrix", label: "Who appears together" },
  { key: "trends", label: "Trends" },
];

export function ViewTabs({
  active,
  onChange,
  archiveActive = false,
}: {
  active?: NavKey;
  onChange?: (k: NavKey) => void;
  archiveActive?: boolean;
}) {
  // A single scrolling strip on narrow screens. Wrapping these onto two rows
  // made the tab bar taller than the content it labelled.
  const base =
    "relative shrink-0 whitespace-nowrap border-b-2 px-1 py-2.5 font-ui text-meta font-medium transition-colors";
  const on = "border-ink text-ink";
  const off = "border-transparent text-ink-3 hover:text-ink";

  return (
    <nav className="mx-auto max-w-5xl px-5 sm:px-8" aria-label="Sections">
      <div className="scroll-x flex gap-6 border-b border-rule">
        {NAV.map((t) => {
          const isOn = !archiveActive && active === t.key;
          return onChange ? (
            <button
              key={t.key}
              onClick={() => onChange(t.key)}
              aria-current={isOn ? "page" : undefined}
              className={`${base} ${isOn ? on : off}`}
            >
              {t.label}
            </button>
          ) : (
            // Plain hrefs from the other routes. The home route does not
            // declare a search schema, so a typed <Link search> would not
            // compile, and a full load back to the brief is cheap.
            <a
              key={t.key}
              href={t.key === "digest" ? "/" : `/?view=${t.key}`}
              className={`${base} ${off} no-underline`}
            >
              {t.label}
            </a>
          );
        })}
        <Link
          to="/archive"
          className={`${base} no-underline ${archiveActive ? on : off}`}
          aria-current={archiveActive ? "page" : undefined}
        >
          Archive
        </Link>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

export function SiteFooter({ hint }: { hint?: string }) {
  return (
    <footer className="mx-auto mt-16 max-w-5xl px-5 pb-14 sm:px-8">
      <div className="flex flex-col gap-3 border-t border-rule pt-5 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="label">
          Built by{" "}
          <a
            href="https://shailvikumar.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline decoration-rule-2 underline-offset-4 hover:decoration-ink"
          >
            Shailvi Kumar
          </a>
          . GitHub Actions, the Claude API, and a JSON file.
        </p>
        <p className="label">
          <Link
            to="/how-it-works"
            className="underline decoration-rule-2 underline-offset-4 hover:decoration-ink"
          >
            How it works
          </Link>
          {hint ? <span className="text-ink-3"> · {hint}</span> : null}
        </p>
      </div>
    </footer>
  );
}
