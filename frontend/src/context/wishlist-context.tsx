"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { useToast } from "@/components/ui/Toast";
import * as shopApi from "@/lib/shop-api";
import { ApiClientError } from "@/lib/api-client";
import type { WishlistItemDto } from "@/lib/shop-types";

interface WishlistContextType {
  items: WishlistItemDto[];
  isLoading: boolean;
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, openAuthModal, isLoading } = useAuth();
  const { push } = useToast();
  const [items, setItems] = useState<WishlistItemDto[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [optimisticAdditions, setOptimisticAdditions] = useState<Set<string>>(new Set());
  const [optimisticRemovals, setOptimisticRemovals] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    setIsFetching(true);
    try {
      setItems(await shopApi.listWishlist());
    } catch {
      // Silently ignore — wishlist is non-critical UI state
    } finally {
      setIsFetching(false);
    }
  }, [isAuthenticated, isLoading]);

  useEffect(() => {
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  const isWishlisted = useCallback((productId: string) => {
    if (optimisticRemovals.has(productId)) return false;
    if (optimisticAdditions.has(productId)) return true;
    return items.some((i) => i.productId === productId);
  }, [items, optimisticAdditions, optimisticRemovals]);

  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const toggleWishlistRef = useRef<((productId: string) => Promise<void>) | null>(null);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!isAuthenticated) {
        openAuthModal(() => void toggleWishlistRef.current?.(productId));
        return;
      }
      if (toggling.has(productId)) return; // prevent spam
      
      const alreadyIn = isWishlisted(productId);
      
      setToggling((prev) => new Set(prev).add(productId));
      
      // Optimistic update
      if (alreadyIn) {
        setOptimisticRemovals((prev) => new Set(prev).add(productId));
        setOptimisticAdditions((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        setOptimisticAdditions((prev) => new Set(prev).add(productId));
        setOptimisticRemovals((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
      
      try {
        if (alreadyIn) {
          setItems(await shopApi.removeFromWishlist(productId));
          push("Removed from saved products", "default");
        } else {
          setItems(await shopApi.addToWishlist(productId));
          push("Added to saved products", "success");
        }
      } catch (err) {
        push(err instanceof ApiClientError ? err.message : "Could not update your saved products", "error");
      } finally {
        // Clear optimistic state for this item
        if (alreadyIn) {
          setOptimisticRemovals((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
        } else {
          setOptimisticAdditions((prev) => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
        }
        setToggling((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [isAuthenticated, isWishlisted, items, openAuthModal, push, toggling],
  );
  useEffect(() => {
    toggleWishlistRef.current = toggleWishlist;
  }, [toggleWishlist]);

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      // Optimistic
      setOptimisticRemovals((prev) => new Set(prev).add(productId));
      try {
        setItems(await shopApi.removeFromWishlist(productId));
      } catch (err) {
        push(err instanceof ApiClientError ? err.message : "Could not remove item", "error");
      } finally {
        setOptimisticRemovals((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [push],
  );

  return (
    <WishlistContext.Provider value={{ items, isLoading: isLoading, isWishlisted, toggleWishlist, removeFromWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
