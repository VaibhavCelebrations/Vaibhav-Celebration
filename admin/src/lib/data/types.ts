export type SortDir = "asc" | "desc";

export type ListQuery = {
  search?: string;
  sort?: string;
  dir?: SortDir;
  page: number; // 1-based
  pageSize: number;
  filters?: Record<string, string | undefined>;
  dateFrom?: string; // "YYYY-MM-DD"
  dateTo?: string; // "YYYY-MM-DD"
};

export const DEFAULT_LIST_QUERY: ListQuery = { page: 1, pageSize: 10 };

/**
 * The pagination shape every admin list endpoint must return inside
 * ApiSuccess<T>.data once the backend implements these routes — see
 * admin/src/lib/admin-api-client.ts for the ApiSuccess/ApiFailure envelope
 * that adminFetch() already unwraps. Repos below return this shape
 * post-unwrap, whether the mock or the real branch is active.
 */
export type ListResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export interface Repository<T, TCreate = unknown, TUpdate = Partial<TCreate>> {
  list(query: ListQuery): Promise<ListResult<T>>;
  get(id: string): Promise<T>;
  create(input: TCreate): Promise<T>;
  update(id: string, input: TUpdate): Promise<T>;
  archive(id: string): Promise<void>; // soft delete — named to match the UI
}

/** Serializes a ListQuery into a querystring for the real-API branch. */
export function qs(query: ListQuery): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  if (query.sort) params.set("sort", query.sort);
  if (query.dir) params.set("dir", query.dir);
  if (query.dateFrom) params.set("dateFrom", query.dateFrom);
  if (query.dateTo) params.set("dateTo", query.dateTo);
  if (query.filters) {
    for (const [key, value] of Object.entries(query.filters)) {
      if (value !== undefined && value !== "") params.set(key, value);
    }
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}
