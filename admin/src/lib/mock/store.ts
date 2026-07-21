import { AdminApiError } from "@/lib/admin-api-client";
import type { ListQuery, Repository } from "@/lib/data/types";
import { delay } from "./latency";

let idCounter = 0;

export function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

type SoftDeletableRow = { id: string; deletedAt: string | null };

type MockCollectionOptions<T extends SoftDeletableRow, TCreate, TUpdate> = {
  idPrefix: string;
  seed: T[];
  searchFields: (keyof T)[];
  defaultSort: keyof T & string;
  applyFilters?: (row: T, filters: Record<string, string | undefined>) => boolean;
  applyDateRange?: (row: T, from?: string, to?: string) => boolean;
  onCreate: (input: TCreate, id: string) => T;
  onUpdate: (row: T, input: TUpdate) => T;
  notFoundMessage?: (id: string) => string;
};

/**
 * In-memory CRUD engine backing every mock<Module>Repo. Module-scoped state
 * (edits persist across client navigation within a session, reset on page
 * reload). Mirrors the search/sort/filter/paginate/soft-delete semantics the
 * real backend is expected to implement, and throws AdminApiError on failure
 * paths so page components' catch blocks are already written against real
 * API behavior — see src/lib/data/types.ts for why mocks are not wrapped in
 * ApiSuccess.
 */
export function createMockCollection<T extends SoftDeletableRow, TCreate = Partial<T>, TUpdate = Partial<TCreate>>(
  opts: MockCollectionOptions<T, TCreate, TUpdate>,
): Repository<T, TCreate, TUpdate> {
  let rows: T[] = structuredClone(opts.seed);

  function findActive(id: string): T {
    const row = rows.find((r) => r.id === id && !r.deletedAt);
    if (!row) {
      throw new AdminApiError("NOT_FOUND", opts.notFoundMessage?.(id) ?? "Record not found", 404);
    }
    return row;
  }

  return {
    async list(query: ListQuery) {
      await delay();

      let filtered = rows.filter((r) => !r.deletedAt);

      if (query.search) {
        const q = query.search.toLowerCase();
        filtered = filtered.filter((r) => opts.searchFields.some((f) => String(r[f] ?? "").toLowerCase().includes(q)));
      }
      if (query.filters && opts.applyFilters) {
        const filters = query.filters;
        filtered = filtered.filter((r) => opts.applyFilters!(r, filters));
      }
      if ((query.dateFrom || query.dateTo) && opts.applyDateRange) {
        filtered = filtered.filter((r) => opts.applyDateRange!(r, query.dateFrom, query.dateTo));
      }

      const sortKey = (query.sort ?? opts.defaultSort) as keyof T;
      const dir = query.dir ?? "asc";
      filtered = [...filtered].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === bv) return 0;
        const cmp = (av as string | number) > (bv as string | number) ? 1 : -1;
        return dir === "asc" ? cmp : -cmp;
      });

      const total = filtered.length;
      const start = (query.page - 1) * query.pageSize;
      const items = filtered.slice(start, start + query.pageSize);

      return { items: structuredClone(items), total, page: query.page, pageSize: query.pageSize };
    },

    async get(id: string) {
      await delay();
      return structuredClone(findActive(id));
    },

    async create(input: TCreate) {
      await delay();
      const row = opts.onCreate(input, genId(opts.idPrefix));
      rows = [row, ...rows];
      return structuredClone(row);
    },

    async update(id: string, input: TUpdate) {
      await delay();
      const existing = findActive(id);
      const updated = opts.onUpdate(existing, input);
      rows = rows.map((r) => (r.id === id ? updated : r));
      return structuredClone(updated);
    },

    async archive(id: string) {
      await delay();
      findActive(id); // throws AdminApiError if missing or already archived
      rows = rows.map((r) => (r.id === id ? { ...r, deletedAt: new Date().toISOString() } : r));
    },
  };
}
