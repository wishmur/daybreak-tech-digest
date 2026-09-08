import { useEffect, useState } from "react";

/**
 * Subscribe to a media query.
 *
 * Charts need to know how narrow they are so they can thin out axis labels.
 * Guessing from a fixed breakpoint class does not work when the chart is
 * inside a container that is narrower than the viewport.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
