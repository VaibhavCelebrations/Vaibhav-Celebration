"use client";

import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Package, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Product, Theme } from "@/types/cms";

/** Theme id → ids of products the customer may pick for the service. */
export type ThemeProductMap = Record<string, string[]>;

type Props = {
  themes: Theme[];
  products: Product[];
  value: ThemeProductMap;
  /** How many products the customer must pick — every theme needs at least this many. */
  selectionCount: number;
  onChange: (next: ThemeProductMap) => void;
};

/** Themes that don't offer enough products yet (used for the inline warning and pre-save check). */
export function themesMissingProducts(themes: Theme[], value: ThemeProductMap, selectionCount: number) {
  return themes.filter((t) => t.isActive && (value[t.id]?.length ?? 0) < selectionCount);
}

function ProductRow({
  product,
  checked,
  onToggle,
}: {
  product: Product;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-3 p-2.5 hover:bg-(--color-surface-alt)">
        <input
          type="checkbox"
          className="h-4 w-4 cursor-pointer accent-(--color-mocha)"
          checked={checked}
          onChange={() => onToggle(product.id)}
        />
        {product.images[0]?.media.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[0].media.url} alt="" loading="lazy" className="h-8 w-8 rounded object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-(--color-surface-alt)">
            <Package size={14} className="text-(--color-text-muted)" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-(--color-charcoal)">{product.title}</p>
          <p className="truncate font-mono text-[10px] text-(--color-text-muted)">
            {product.sku}
            {product.categories.length > 0 && ` · ${product.categories.map((c) => c.name).join(", ")}`}
          </p>
        </div>
        <span className="shrink-0 text-xs text-(--color-text-muted)">
          ₹{(product.priceInPaise / 100).toLocaleString("en-IN")}
        </span>
      </label>
    </li>
  );
}

export function ServiceProductAssignments({ themes, products, value, selectionCount, onChange }: Props) {
  const [openThemeId, setOpenThemeId] = useState<string | null>(themes[0]?.id ?? null);
  const [search, setSearch] = useState("");

  const [categoryId, setCategoryId] = useState<string | null>(null);

  // A product belongs to one theme, so each theme only lists its own products.
  const productsByTheme = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      for (const t of p.themes) map.set(t.id, [...(map.get(t.id) ?? []), p]);
    }
    return map;
  }, [products]);

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of products) for (const c of p.categories) seen.set(c.id, c.name);
    return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  function visibleProducts(themeId: string) {
    const q = search.trim().toLowerCase();
    return (productsByTheme.get(themeId) ?? []).filter(
      (p) =>
        (!categoryId || p.categories.some((c) => c.id === categoryId)) &&
        (!q || p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
    );
  }

  function toggle(themeId: string, productId: string) {
    const current = value[themeId] ?? [];
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    onChange({ ...value, [themeId]: next });
  }

  if (themes.length === 0) {
    return <p className="text-sm text-(--color-text-muted)">No themes yet — create a theme first.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" size={16} />
        <input
          className="input pl-9"
          placeholder="Search products by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {[{ id: null as string | null, name: "All categories" }, ...categories].map((c) => (
            <button
              key={c.id ?? "all"}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                categoryId === c.id
                  ? "border-(--color-mocha) bg-(--color-mocha) text-white"
                  : "border-(--color-border) text-(--color-text-muted) hover:border-(--color-mocha)"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="divide-y divide-(--color-border-soft) overflow-hidden rounded-md border border-(--color-border-soft)">
        {themes.map((theme) => {
          const selected = value[theme.id] ?? [];
          const selectedSet = new Set(selected);
          const enough = selected.length >= selectionCount;
          const open = openThemeId === theme.id;
          const visible = open ? visibleProducts(theme.id) : [];
          return (
            <div key={theme.id}>
              <button
                type="button"
                onClick={() => setOpenThemeId(open ? null : theme.id)}
                className="flex w-full cursor-pointer items-center gap-2 bg-(--color-surface) px-3 py-2.5 text-left hover:bg-(--color-surface-alt)"
              >
                {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="flex-1 truncate text-sm font-semibold text-(--color-charcoal)">
                  {theme.title}
                  {!theme.isActive && (
                    <span className="ml-2 text-[10px] font-medium uppercase text-(--color-text-muted)">inactive</span>
                  )}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    enough
                      ? "bg-emerald-50 text-emerald-700"
                      : theme.isActive
                        ? "bg-red-50 text-red-700"
                        : "bg-(--color-surface-alt) text-(--color-text-muted)"
                  }`}
                >
                  {enough ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {selected.length} selected{!enough && ` · need ${selectionCount}`}
                </span>
              </button>
              {open && (
                <div className="border-t border-(--color-border-soft)">
                  <div className="flex items-center justify-between bg-(--color-surface-alt)/50 px-3 py-1.5 text-xs text-(--color-text-muted)">
                    <span>Only products tagged with {theme.title} are listed</span>
                  </div>
                  {visible.length === 0 ? (
                    <p className="p-3 text-sm text-(--color-text-muted)">
                      {(productsByTheme.get(theme.id)?.length ?? 0) === 0
                        ? `No products are tagged with ${theme.title} yet. Set the theme on a product in Products.`
                        : "No products match."}
                    </p>
                  ) : (
                    <ul className="max-h-64 divide-y divide-(--color-border-soft) overflow-y-auto">
                      {visible.map((p) => (
                        <ProductRow
                          key={p.id}
                          product={p}
                          checked={selectedSet.has(p.id)}
                          onToggle={(id) => toggle(theme.id, id)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
