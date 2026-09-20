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

// ── Offline cart (localStorage) ───────────────────────────────────────────────
// Used only when the user is not authenticated. localStorage is synchronous,
// simple, and more than sufficient for small cart payloads. We no longer use
// IndexedDB here because async IDB makes the checkout page needlessly complex.

const OFFLINE_CART_KEY = "vc_offline_cart";

type OfflineCart = { items: ServerCartItem[]; quote: CartQuote };

function loadOfflineCart(): OfflineCart {
  if (typeof window === "undefined") return { items: [], quote: EMPTY_QUOTE };
  try {
    const raw = window.localStorage.getItem(OFFLINE_CART_KEY);
    if (!raw) return { items: [], quote: EMPTY_QUOTE };
    return JSON.parse(raw) as OfflineCart;
  } catch {
    return { items: [], quote: EMPTY_QUOTE };
  }
}

function saveOfflineCart(items: ServerCartItem[], quote: CartQuote): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OFFLINE_CART_KEY, JSON.stringify({ items, quote }));
  } catch {
    // localStorage full / private-mode — silently ignore; cart state stays in memory
  }
}

function clearOfflineCart(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(OFFLINE_CART_KEY);
  } catch {
    // ignore
  }
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
      const offlineCart = loadOfflineCart();
      setItems(offlineCart.items);
      setQuote(normalizeQuote(offlineCart.quote));
      setIsLoading(false);
      return;
    }
    try {
      // Merge any offline cart items built while the user was a guest into
      // their server cart, then wipe the local copy.
      const offlineCart = loadOfflineCart();
      if (offlineCart.items.length > 0) {
        for (const item of offlineCart.items) {
          try {
            await shopApi.addCartItem(
              item.productId,
              item.quantity,
              item.personalizationValues,
              item.registryItemId ?? undefined,
            );
          } catch (e) {
            console.error("Failed to sync offline cart item on login", e);
          }
        }
        clearOfflineCart();
      }

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
      setOptimisticCartQuantities((prev) => ({
        ...prev,
        [productId]: (prev[productId] ?? 0) + quantity,
      }));
      setIsCartOpen(true);

      try {
        if (!isAuthenticated) {
          const offlineCart = loadOfflineCart();
          const existingIdx = offlineCart.items.findIndex(
            (i) => i.productId === productId && (i.registryItemId || "") === (registryItemId || ""),
          );
          const currentItems = offlineCart.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            personalizationValues: i.personalizationValues,
            registryItemId: i.registryItemId || undefined,
          }));

          if (existingIdx >= 0) {
            currentItems[existingIdx].quantity += quantity;
            currentItems[existingIdx].personalizationValues =
              personalizationValues ?? currentItems[existingIdx].personalizationValues;
          } else {
            currentItems.push({ productId, quantity, personalizationValues: personalizationValues ?? null, registryItemId });
          }

          const guestCart = await shopApi.getGuestCartQuote(currentItems);
          setItems(guestCart.items);
          setQuote(normalizeQuote(guestCart.quote));
          saveOfflineCart(guestCart.items, normalizeQuote(guestCart.quote));
        } else {
          const cart = await shopApi.addCartItem(productId, quantity, personalizationValues ?? null, registryItemId);
          setItems(cart.items);
          setQuote(normalizeQuote(cart.quote));
        }
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
    [isAuthenticated, push],
  );
  useEffect(() => {
    addItemRef.current = addItem;
  }, [addItem]);

  const updateQuantity = useCallback(
    async (lineKey: string, quantity: number) => {
      try {
        if (!isAuthenticated) {
          const offlineCart = loadOfflineCart();
          let currentItems = offlineCart.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            personalizationValues: i.personalizationValues,
            registryItemId: i.registryItemId || undefined,
            id: i.id,
          }));

          if (quantity <= 0) {
            currentItems = currentItems.filter((i) => i.id !== lineKey && i.productId !== lineKey);
          } else {
            const existing = currentItems.find((i) => i.id === lineKey || i.productId === lineKey);
            if (existing) existing.quantity = quantity;
          }

          const guestCart = await shopApi.getGuestCartQuote(currentItems);
          setItems(guestCart.items);
          setQuote(normalizeQuote(guestCart.quote));
          saveOfflineCart(guestCart.items, normalizeQuote(guestCart.quote));
        } else {
          const cart = await shopApi.updateCartItemQuantity(lineKey, quantity);
          setItems(cart.items);
          setQuote(normalizeQuote(cart.quote));
        }
      } catch (err) {
        push(err instanceof ApiClientError ? err.message : "Could not update quantity", "error");
      }
    },
    [isAuthenticated, push],
  );

  const removeItem = useCallback(
    async (lineKey: string) => {
      try {
        if (!isAuthenticated) {
          const offlineCart = loadOfflineCart();
          const currentItems = offlineCart.items
            .filter((i) => i.id !== lineKey && i.productId !== lineKey)
            .map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              personalizationValues: i.personalizationValues,
              registryItemId: i.registryItemId || undefined,
            }));

          const guestCart = await shopApi.getGuestCartQuote(currentItems);
          setItems(guestCart.items);
          setQuote(normalizeQuote(guestCart.quote));
          saveOfflineCart(guestCart.items, normalizeQuote(guestCart.quote));
        } else {
          const cart = await shopApi.removeCartItem(lineKey);
          setItems(cart.items);
          setQuote(normalizeQuote(cart.quote));
        }
      } catch (err) {
        push(err instanceof ApiClientError ? err.message : "Could not remove item", "error");
      }
    },
    [isAuthenticated, push],
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
    } else {
      clearOfflineCart();
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
