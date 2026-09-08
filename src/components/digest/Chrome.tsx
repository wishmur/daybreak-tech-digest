import { Link } from "@tanstack/react-router";
import daybreakLogo from "@/assets/daybreak-logo.png.asset.json";
import { daysAgo, timeInZone } from "@/lib/digest";

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

const tabBase =
  "shrink-0 whitespace-nowrap rounded-[3px] px-2.5 py-1.5 font-ui text-meta font-semibold transition-colors no-underline";
const tabOn = "bg-ink text-paper";
const tabOff = "text-ink-3 hover:bg-inset hover:text-ink";

/* ------------------------------------------------------------------ */
/* TopBar                                                              */
/*                                                                      */
/* One compact strip replaces the old status bar / masthead / tab bar   */
/* stack: wordmark, section nav, and live status share a single row     */
/* on desktop so the working board starts within a couple of pixels of  */
/* the viewport top rather than after a scroll past branding.           */
/* ------------------------------------------------------------------ */

export function TopBar({
  active,
  onChange,
  archiveActive = false,
  lastUpdated,
  latestDate,
  totalItems,
  loading,
  stale,
}: {
  active?: NavKey;
  onChange?: (k: NavKey) => void;
  archiveActive?: boolean;
  lastUpdated?: string | null;
  latestDate?: string;
  totalItems: number;
  loading: boolean;
  stale: boolean;
}) {
  const behind = latestDate ? daysAgo(latestDate) : null;
  const lagged = behind !== null && behind >= 2;

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper">
      <div className="mx-auto max-w-[100rem] px-5 sm:px-8">
        {/* Row one: identity and status never contend with nav for room,
            so nav never has to shrink its labels to fit. */}
        <div className="flex items-center justify-between gap-4 pt-2.5">
          <Link
            to="/"
            className="flex min-w-0 shrink-0 items-center gap-2 no-underline"
          >
            <img
              src={daybreakLogo.url}
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
              className="h-6 w-6 shrink-0"
            />
            <span className="font-display text-head font-extrabold tracking-[-0.02em] text-ink">
              Daybreak
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <span className="data hidden lg:inline">
              {loading ? "Loading" : `Last run ${timeInZone(lastUpdated ?? null)}`}
            </span>
            <span className="data hidden xl:inline">
              {totalItems.toLocaleString()} archived
            </span>
            <Link
              to="/how-it-works"
              className="data no-underline hover:text-ink"
            >
              How it works
            </Link>
          </div>
        </div>

        {/* Row two: section nav, full width, always its own line. */}
        <nav
          className="scroll-x flex items-center gap-1 py-2"
          aria-label="Sections"
        >
          {NAV.map((t) => {
            const isOn = !archiveActive && active === t.key;
            return onChange ? (
              <button
                key={t.key}
                onClick={() => onChange(t.key)}
                aria-current={isOn ? "page" : undefined}
                className={`${tabBase} ${isOn ? tabOn : tabOff}`}
              >
                {t.label}
              </button>
            ) : (
              <a
                key={t.key}
                href={t.key === "digest" ? "/" : `/?view=${t.key}`}
                className={`${tabBase} ${tabOff}`}
              >
                {t.label}
              </a>
            );
          })}
          <Link
            to="/archive"
            className={`${tabBase} ${archiveActive ? tabOn : tabOff}`}
            aria-current={archiveActive ? "page" : undefined}
          >
            Archive
          </Link>
        </nav>
        {(lagged || stale) && (
          <p className="border-t border-rule py-1.5 text-micro font-medium text-signal-ink">
            {stale
              ? "Showing the last copy saved in this browser. The live file could not be reached."
              : `No new brief for ${behind} days. The morning job may not be running.`}
          </p>
        )}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

export function SiteFooter({ hint }: { hint?: string }) {
  return (
    <footer className="mx-auto mt-16 max-w-[100rem] px-5 pb-14 sm:px-8">
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
