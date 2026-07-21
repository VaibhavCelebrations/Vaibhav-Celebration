"use client";

import { useCallback, useState } from "react";
import { DEFAULT_LIST_QUERY, type ListQuery } from "@/lib/data/types";

/** Controlled ListQuery state for AdminDataTable. Any change besides `page` itself resets to page 1. */
export function useListQuery(initial: Partial<ListQuery> = {}) {
  const [query, setQueryState] = useState<ListQuery>({ ...DEFAULT_LIST_QUERY, ...initial });

  const setQuery = useCallback((patch: Partial<ListQuery>) => {
    setQueryState((prev) => ({
      ...prev,
      ...patch,
      page: patch.page ?? 1,
    }));
  }, []);

  return { query, setQuery };
}
