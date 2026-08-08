"use client";

import type { ReactNode } from "react";
import type { PackageCard, ThemeCard } from "@/lib/cms/types";
import { CartProvider } from "@/context/cart-context";
import { AuthProvider } from "@/context/auth-context";
import { CatalogProvider } from "@/context/catalog-context";
import { WishlistProvider } from "@/context/wishlist-context";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthModal } from "@/components/ecom/AuthModal";
import { CartDrawer } from "@/components/ecom/CartDrawer";

type ProvidersProps = {
  children: ReactNode;
  themes?: ThemeCard[];
  packages?: PackageCard[];
};

export function Providers({ children, themes = [], packages = [] }: ProvidersProps) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CatalogProvider themes={themes} packages={packages}>
          <WishlistProvider>
            <CartProvider>
              {children}
              <AuthModal />
              <CartDrawer />
            </CartProvider>
          </WishlistProvider>
        </CatalogProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
