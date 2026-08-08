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
  const { isAuthenticated, openAuthModal } = useAuth();
  const { push } = useToast();
  const [items, setItems] = useState<WishlistItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    try {
      setItems(await shopApi.listWishlist());
    } catch {
      // Silently ignore — wishlist is non-critical UI state
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  const isWishlisted = useCallback((productId: string) => items.some((i) => i.productId === productId), [items]);

  const toggleWishlistRef = useRef<((productId: string) => Promise<void>) | null>(null);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!isAuthenticated) {
        openAuthModal(() => void toggleWishlistRef.current?.(productId));
        return;
      }
      const alreadyIn = items.some((i) => i.productId === productId);
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
      }
    },
    [isAuthenticated, items, openAuthModal, push],
  );
  useEffect(() => {
    toggleWishlistRef.current = toggleWishlist;
  }, [toggleWishlist]);

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      try {
        setItems(await shopApi.removeFromWishlist(productId));
      } catch (err) {
        push(err instanceof ApiClientError ? err.message : "Could not remove item", "error");
      }
    },
    [push],
  );

  return (
    <WishlistContext.Provider value={{ items, isLoading, isWishlisted, toggleWishlist, removeFromWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}
