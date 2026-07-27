"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/context/cart-context";
import { AuthProvider } from "@/context/auth-context";
import { AuthModal } from "@/components/ecom/AuthModal";
import { CartDrawer } from "@/components/ecom/CartDrawer";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <AuthModal />
        <CartDrawer />
      </CartProvider>
    </AuthProvider>
  );
}
