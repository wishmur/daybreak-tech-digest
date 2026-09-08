import { useCallback, useEffect, useMemo, useState } from "react";
import type { Item } from "./digest";

const LS_SEEN = "daybreak:seen:v1";
const LS_LAST_VISIT = "daybreak:lastVisit:v1";
const MAX_TRACKED = 2000;

type Persisted = { ids: string[] };

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_SEEN);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Persisted;
    return new Set(parsed.ids ?? []);
  } catch {
    return new Set();
  }
}

/**
 * Track which stories this reader has already opened, plus when they last
 * came by.
 *
 * This is the one feature that turns a page you look at into a page you come
 * back to, and it costs the backend nothing: everything lives in this
 * browser. It is deliberately best-effort. A reader in a private window or
 * with storage blocked simply sees everything as new, which is a fine
 * default rather than an error state.
 */
export function useReadState(items: Item[]) {
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSeen(load());
    try {
      setLastVisit(localStorage.getItem(LS_LAST_VISIT));
    } catch {
      setLastVisit(null);
    }
    setReady(true);
  }, []);

  // Stamp the visit once, after the first paint, so "new since last visit"
  // reflects the previous session rather than this one.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(LS_LAST_VISIT, new Date().toISOString());
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [ready]);

  const persist = useCallback((next: Set<string>) => {
    try {
      // Keep the tail only. Unbounded growth would eventually blow the quota
      // and silently take the rest of this origin's storage down with it.
      const ids = [...next].slice(-MAX_TRACKED);
      localStorage.setItem(LS_SEEN, JSON.stringify({ ids } satisfies Persisted));
    } catch {
      /* ignore */
    }
  }, []);

  const markRead = useCallback(
    (id: string) => {
      setSeen((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const markAllRead = useCallback(() => {
    setSeen((prev) => {
      const next = new Set(prev);
      for (const it of items) next.add(it.id);
      persist(next);
      return next;
    });
  }, [items, persist]);

  const unreadCount = useMemo(() => {
    if (!ready) return 0;
    return items.reduce((n, it) => (seen.has(it.id) ? n : n + 1), 0);
  }, [items, seen, ready]);

  const isFirstEverVisit = ready && lastVisit === null;

  return {
    ready,
    seen,
    unreadCount,
    isFirstEverVisit,
    markRead,
    markAllRead,
  };
}
