"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { CartPackage, PersonalizationValue } from "@/lib/ecom-types";
import type { CartQuote, ServerCartItem } from "@/lib/shop-types";
import { toRupees } from "@/lib/shop-types";
import * as shopApi from "@/lib/shop-api";
import { ApiClientError } from "@/lib/api-client";
import { CacheStore } from "@/lib/cache-store";
import { useAuth } from "./auth-context";
import { useToast } from "@/components/ui/Toast";

function normalizeQuote(quote?: Partial<CartQuote> | null): CartQuote {
  return {
    subtotalInPaise: quote?.subtotalInPaise ?? 0,
    shippingInPaise: quote?.shippingInPaise ?? 0,
    shippingWaived: quote?.shippingWaived ?? false,
    freeShippingThresholdInPaise: quote?.freeShippingThresholdInPaise ?? 299_900,
    amountUntilFreeShippingInPaise: quote?.amountUntilFreeShippingInPaise ?? 299_900,
    gstPercent: quote?.gstPercent ?? 18,
    gstInPaise: quote?.gstInPaise ?? 0,
    totalInPaise: quote?.totalInPaise ?? 0,
    lines: Array.isArray(quote?.lines) ? quote.lines : [],
  };
}

const EMPTY_QUOTE: CartQuote = {
  subtotalInPaise: 0,
  shippingInPaise: 0,
  shippingWaived: false,
  freeShippingThresholdInPaise: 299_900,
  amountUntilFreeShippingInPaise: 299_900,
  gstPercent: 18,
  gstInPaise: 0,
  totalInPaise: 0,
  lines: [],
};

/* ── Context shape ─────────────────────────────────────────────────── */

interface CartContextType {
  items: ServerCartItem[];
  quote: CartQuote;
  packages: CartPackage[];
  itemCount: number;
  /** Combined rupee total across the real (server) cart and the local event-package cart, for display only. */
  packagesSubtotalRupees: number;
  isCartOpen: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (productId: string, quantity: number, personalizationValues?: PersonalizationValue[], registryItemId?: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  addPackage: (pkg: Omit<CartPackage, "id">) => void;
  removePackage: (id: string) => void;
  clearCart: () => Promise<void>;
  getItemQuantity: (productId: string) => number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

/* ── Local package storage (sessionStorage — unrelated venue/package flow) ── */

const PACKAGES_KEY = "vc_cart_packages";

function loadPackages(): CartPackage[] {
  return CacheStore.getSessionItem<CartPackage[]>(PACKAGES_KEY, []);
}

function savePackages(packages: CartPackage[]) {
  CacheStore.setSessionItem(PACKAGES_KEY, packages);
}

const CART_ITEMS_KEY = "vc_cart_items";

async function loadOfflineCart(): Promise<{ items: ServerCartItem[], quote: CartQuote }> {
  const data = await CacheStore.getIDBItem(CART_ITEMS_KEY, { items: [], quote: EMPTY_QUOTE });
  return data;
}

async function saveOfflineCart(items: ServerCartItem[], quote: CartQuote) {
  await CacheStore.setIDBItem(CART_ITEMS_KEY, { items, quote });
}

/* ── Provider ──────────────────────────────────────────────────────── */

export function CartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, openAuthModal } = useAuth();
  const { push } = useToast();

  const [items, setItems] = useState<ServerCartItem[]>([]);
  const [quote, setQuote] = useState<CartQuote>(EMPTY_QUOTE);
  const [packages, setPackages] = useState<CartPackage[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticCartQuantities, setOptimisticCartQuantities] = useState<Record<string, number>>({});
  const isHydrated = useRef(false);

  useEffect(() => {
    // sessionStorage is only available client-side, so packages must be hydrated
    // post-mount rather than via a lazy useState initializer (which would run
    // during SSR and cause a hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPackages(loadPackages());
    isHydrated.current = true;
  }, []);

  useEffect(() => {
    if (isHydrated.current) savePackages(packages);
  }, [packages]);

  const refreshCart = useCallback(async () => {
    setIsLoading(true);
    if (!isAuthenticated) {
      const offlineCart = await loadOfflineCart();
      setItems(offlineCart.items);
      setQuote(offlineCart.quote);
      setIsLoading(false);
      return;
    }
    try {
      const cart = await shopApi.getCart();
      setItems(cart.items);
      setQuote(normalizeQuote(cart.quote));
    } catch {
      // Non-fatal — leave previous state, user can retry via cart drawer
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void (async () => {
      await refreshCart();
    })();
  }, [refreshCart]);

  const addItemRef = useRef<CartContextType["addItem"] | null>(null);

  const addItem = useCallback(
    async (productId: string, quantity: number, personalizationValues?: PersonalizationValue[], registryItemId?: string) => {
      if (!isAuthenticated) {
        openAuthModal(() => void addItemRef.current?.(productId, quantity, personalizationValues, registryItemId));
        return;
      }
      setOptimisticCartQuantities((prev) => ({
        ...prev,
        [productId]: (prev[productId] ?? 0) + quantity,
      }));
      setIsCartOpen(true);

      try {
        const cart = await shopApi.addCartItem(productId, quantity, personalizationValues ?? null, registryItemId);
        setItems(cart.items);
        setQuote(normalizeQuote(cart.quote));
      } catch (err) {
        const message =
          err instanceof ApiClientError && typeof err.message === "string"
            ? err.message
            : "Could not add this item to your cart";
        push(message, "error");
      } finally {
        setOptimisticCartQuantities((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      }
    },
    [isAuthenticated, openAuthModal, push],
  );
  useEffect(() => {
    addItemRef.current = addItem;
  }, [addItem]);

  const updateQuantity = useCallback(
    async (lineKey: string, quantity: number) => {
      try {
        const cart = await shopApi.updateCartItemQuantity(lineKey, quantity);
        setItems(cart.items);
        setQuote(normalizeQuote(cart.quote));
      } catch (err) {
        push(err instanceof ApiClientError ? err.message : "Could not update quantity", "error");
      }
    },
    [push],
  );

  const removeItem = useCallback(
    async (lineKey: string) => {
      try {
        const cart = await shopApi.removeCartItem(lineKey);
        setItems(cart.items);
        setQuote(normalizeQuote(cart.quote));
      } catch (err) {
        push(err instanceof ApiClientError ? err.message : "Could not remove item", "error");
      }
    },
    [push],
  );

  const addPackage = useCallback((pkg: Omit<CartPackage, "id">) => {
    setPackages((prev) => {
      const existingIndex = prev.findIndex((p) => p.packageId === pkg.packageId && p.themeSlug === pkg.themeSlug);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], basePrice: pkg.basePrice, addons: pkg.addons };
        return updated;
      }
      return [...prev, { ...pkg, id: Date.now().toString() + Math.random().toString(36).substring(2, 9) }];
    });
    setIsCartOpen(true);
  }, []);

  const removePackage = useCallback((id: string) => {
    setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
  }, []);

  const clearCart = useCallback(async () => {
    if (isAuthenticated) {
      try {
        await shopApi.clearServerCart();
      } catch {
        // ignore — order was already placed/confirmed by the time this is called
      }
    }
    setItems([]);
    setQuote(EMPTY_QUOTE);
    setPackages([]);
  }, [isAuthenticated]);

  const getItemQuantity = useCallback(
    (productId: string) => {
      const realCount = items.find((i) => i.productId === productId)?.quantity ?? 0;
      const optimisticCount = optimisticCartQuantities[productId] ?? 0;
      return realCount + optimisticCount;
    },
    [items, optimisticCartQuantities],
  );

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  const packagesSubtotalRupees = packages.reduce((sum, pkg) => {
    const addonsTotal = (pkg.addons || []).reduce((aSum, addon) => aSum + toRupees(addon.product.priceInPaise) * addon.quantity, 0);
    return sum + pkg.basePrice + addonsTotal;
  }, 0);

  const itemCount = 
    items.reduce((sum, i) => sum + i.quantity, 0) + 
    packages.length + 
    Object.values(optimisticCartQuantities).reduce((a, b) => a + b, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        quote,
        packages,
        itemCount,
        packagesSubtotalRupees,
        isCartOpen,
        isLoading,
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
        refreshCart,
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
