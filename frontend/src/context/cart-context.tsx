"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { CartItem, CartPackage, CartSummary, PersonalizationValue, Product } from "@/lib/ecom-types";

/* ── Context shape ─────────────────────────────────────────────────── */

interface CartContextType {
  items: CartItem[];
  packages: CartPackage[];
  itemCount: number;
  summary: CartSummary;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: Product, quantity: number, personalization?: PersonalizationValue[]) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  addPackage: (pkg: Omit<CartPackage, "id">) => void;
  removePackage: (id: string) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | null>(null);

/* ── Storage helpers (sessionStorage — clears on tab close) ─────── */

const CART_KEY = "vc_cart";

function loadCart(): { items: CartItem[]; packages: CartPackage[] } {
  if (typeof window === "undefined") return { items: [], packages: [] };
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    if (!raw) return { items: [], packages: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { items: parsed, packages: [] }; // backwards compat
    }
    return { items: parsed.items || [], packages: parsed.packages || [] };
  } catch {
    return { items: [], packages: [] };
  }
}

function saveCart(data: { items: CartItem[]; packages: CartPackage[] }) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CART_KEY, JSON.stringify(data));
}

/* ── Compute summary ───────────────────────────────────────────────── */

function computeSummary(items: CartItem[], packages: CartPackage[]): CartSummary {
  const itemsSubtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const packagesSubtotal = packages.reduce((sum, pkg) => {
    const addons = pkg.addons || [];
    const addonsTotal = addons.reduce((aSum, addon) => aSum + addon.product.price * addon.quantity, 0);
    return sum + pkg.basePrice + addonsTotal;
  }, 0);
  const subtotal = itemsSubtotal + packagesSubtotal;
  const gst = Math.round(subtotal * 0.18);
  return {
    items,
    packages,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0) + packages.length,
    subtotal,
    gst,
    total: subtotal + gst,
  };
}

/* ── Provider ──────────────────────────────────────────────────────── */

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [packages, setPackages] = useState<CartPackage[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    const data = loadCart();
    setItems(data.items);
    setPackages(data.packages);
    setIsHydrated(true);
  }, []);

  // Persist whenever items/packages change (after hydration)
  useEffect(() => {
    if (isHydrated) {
      saveCart({ items, packages });
    }
  }, [items, packages, isHydrated]);

  const addItem = useCallback(
    (product: Product, quantity: number, personalization: PersonalizationValue[] = []) => {
      setItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.product.id === product.id);
        if (existingIndex >= 0) {
          // Update quantity (capped by max)
          const updated = [...prev];
          const maxQty = Math.min(product.maxOrderQuantity, product.stock);
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: Math.min(updated[existingIndex].quantity + quantity, maxQty),
            personalizationValues: personalization.length > 0 ? personalization : updated[existingIndex].personalizationValues,
          };
          return updated;
        }
        // New item
        return [...prev, { product, quantity, personalizationValues: personalization }];
      });
    },
    []
  );

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(quantity, Math.min(item.product.maxOrderQuantity, item.product.stock)) }
          : item
      )
    );
  }, []);

  const addPackage = useCallback((pkg: Omit<CartPackage, "id">) => {
    const newPkg: CartPackage = {
      ...pkg,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    };
    setPackages((prev) => [...prev, newPkg]);
  }, []);

  const removePackage = useCallback((id: string) => {
    setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setPackages([]);
  }, []);

  const getItemQuantity = useCallback(
    (productId: string) => {
      return items.find((item) => item.product.id === productId)?.quantity ?? 0;
    },
    [items]
  );

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  const summary = computeSummary(items, packages);

  return (
    <CartContext.Provider
      value={{
        items,
        packages,
        itemCount: summary.itemCount,
        summary,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        removeItem,
        updateQuantity,
        addPackage,
        removePackage,
        clearCart,
        getItemQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

/* ── Hook ──────────────────────────────────────────────────────────── */

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
