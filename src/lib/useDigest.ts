import { useCallback, useEffect, useRef, useState } from "react";
import { DATA_URL, REFRESH_MS, type Digest } from "./digest";

const LS_CACHE = "daybreak:cache:v2";

type State = {
  digest: Digest | null;
  loading: boolean;
  /** True when the last network attempt failed. */
  stale: boolean;
};

/**
 * Load the digest, poll for updates, and fall back to the last good copy.
 *
 * The previous implementation put `digest` in the fetch callback's dependency
 * array but registered the interval with an empty one, so the polling timer
 * captured the very first closure forever. Its `!digest` guard therefore
 * always read null, and any later network blip would overwrite fresh data
 * with the stale cached copy. The current value lives in a ref instead, so
 * the guard reads the truth and the timer never goes out of date.
 *
 * Polling also pauses while the tab is hidden. A background tab re-fetching a
 * multi-hundred-kilobyte file every few minutes is pure waste.
 */
export function useDigest(): State & { refresh: () => void } {
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const current = useRef<Digest | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(DATA_URL, { cache: "no-cache" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as Digest;
      current.current = json;
      setDigest(json);
      setStale(false);
      try {
        localStorage.setItem(LS_CACHE, JSON.stringify(json));
      } catch {
        /* quota or private mode; the network copy is still fine */
      }
    } catch {
      setStale(true);
      if (!current.current) {
        try {
          const cached = localStorage.getItem(LS_CACHE);
          if (cached) {
            const parsed = JSON.parse(cached) as Digest;
            current.current = parsed;
            setDigest(parsed);
          }
        } catch {
          /* ignore a corrupt cache */
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer === null) timer = setInterval(refresh, REFRESH_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        refresh();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return { digest, loading, stale, refresh };
}
