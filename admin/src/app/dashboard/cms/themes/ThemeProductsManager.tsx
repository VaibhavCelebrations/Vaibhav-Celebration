"use client";

import { useEffect, useState } from "react";
import { AdminDrawerForm } from "@/components/ui/AdminDrawerForm";
import { useToast } from "@/components/ui/Toast";
import { productsRepo } from "@/lib/data/products";
import type { Product, Theme } from "@/types/cms";
import { Package, Search } from "lucide-react";
import { TextInput } from "@/components/ui/fields";

export function ThemeProductsManager({
  theme,
  open,
  onClose,
}: {
  theme: Theme | null;
  open: boolean;
  onClose: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  
  // Track selected product IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Track original selected IDs to compute diff
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set());

  const toast = useToast();

  useEffect(() => {
    if (open && theme) {
      setLoading(true);
      // Fetch a large page to show all available products
      productsRepo.list({ page: 1, pageSize: 500 })
        .then((res) => {
          setProducts(res.items);
          const currentThemeProducts = res.items
            .filter((p) => p.themes.some((t) => t.id === theme.id))
            .map((p) => p.id);
          
          setSelectedIds(new Set(currentThemeProducts));
          setOriginalIds(new Set(currentThemeProducts));
        })
        .finally(() => setLoading(false));
    }
  }, [open, theme]);

  const toggleSelection = (productId: string) => {
    const next = new Set(selectedIds);
    if (next.has(productId)) {
      next.delete(productId);
    } else {
      next.add(productId);
    }
    setSelectedIds(next);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme) return;

    setSubmitting(true);
    try {
      // Compute diff
      const toAdd = [...selectedIds].filter((id) => !originalIds.has(id));
      const toRemove = [...originalIds].filter((id) => !selectedIds.has(id));

      if (toAdd.length === 0 && toRemove.length === 0) {
        onClose();
        return;
      }

      // Process additions
      for (const id of toAdd) {
        const prod = products.find(p => p.id === id);
        if (prod) {
          const newThemeIds = [...prod.themes.map(t => t.id), theme.id];
          await productsRepo.update(id, { themeIds: newThemeIds });
        }
      }

      // Process removals
      for (const id of toRemove) {
        const prod = products.find(p => p.id === id);
        if (prod) {
          const newThemeIds = prod.themes.map(t => t.id).filter(tId => tId !== theme.id);
          await productsRepo.update(id, { themeIds: newThemeIds });
        }
      }

      toast({ tone: "success", title: "Theme products updated" });
      onClose();
    } catch (err) {
      toast({ tone: "error", title: "Error updating products" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminDrawerForm
      open={open}
      onClose={onClose}
      title={`Manage Products — ${theme?.title}`}
      description="Select the products that belong to this theme."
      onSubmit={onSave}
      submitting={submitting}
      submitLabel="Save Assignments"
    >
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-text-muted)" size={16} />
          <div className="pl-9">
            <TextInput
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="border border-(--color-border-soft) rounded-md overflow-hidden bg-(--color-surface)">
          {loading ? (
            <div className="p-4 text-sm text-(--color-text-muted)">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-4 text-sm text-(--color-text-muted)">No products found.</div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-(--color-border-soft)">
              {filteredProducts.map((p) => {
                const isSelected = selectedIds.has(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-3 p-3 hover:bg-(--color-surface-alt)">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-(--color-mocha) focus:ring-(--color-mocha)"
                      checked={isSelected}
                      onChange={() => toggleSelection(p.id)}
                    />
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {p.images[0]?.media.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0].media.url} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-(--color-surface-alt)">
                          <Package size={14} className="text-(--color-text-muted)" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-(--color-charcoal)">{p.title}</p>
                        <p className="truncate font-mono text-[10px] text-(--color-text-muted)">{p.sku}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="text-xs text-(--color-text-muted)">
          {selectedIds.size} product{selectedIds.size === 1 ? '' : 's'} assigned to this theme.
        </div>
      </div>
    </AdminDrawerForm>
  );
}
