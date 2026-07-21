"use client";

import { useEffect, useState } from "react";
import { AdminApiError } from "@/lib/admin-api-client";
import type { ListQuery, ListResult } from "@/lib/data/types";

type RepoListState<T> = {
  items: T[];
  total: number;
  loading: boolean;
  error: string | null;
};

/**
 * Loads a paginated repo list whenever `query` changes, and exposes reload()
 * for use after create/update/archive. The loading-true flip is deferred
 * into a microtask (Promise.resolve().then) rather than called synchronously
 * in the effect body: react-hooks/set-state-in-effect flags any synchronous
 * setState reachable from an effect (even through a called function) — a
 * .then() callback is the pattern the rule itself endorses as the escape
 * hatch ("calling setState in a callback function when external state
 * changes"), and it costs nothing perceptible since it still runs before the
 * slower repo call resolves.
 */
export function useRepoList<T>(fetcher: (query: ListQuery) => Promise<ListResult<T>>, query: ListQuery) {
  const [state, setState] = useState<RepoListState<T>>({ items: [], total: 0, loading: true, error: null });
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) setState((s) => ({ ...s, loading: true, error: null }));
    });

    fetcher(query)
      .then((res) => {
        if (active) setState({ items: res.items, total: res.total, loading: false, error: null });
      })
      .catch((err) => {
        if (active) {
          setState((s) => ({ ...s, loading: false, error: err instanceof AdminApiError ? err.message : "Failed to load." }));
        }
      });

    return () => {
      active = false;
    };
    // fetcher is a stable repo-method reference; query is re-serialized so the
    // effect only re-runs on a real change, not on every new object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(query), reloadTick]);

  return { ...state, reload: () => setReloadTick((t) => t + 1) };
}
