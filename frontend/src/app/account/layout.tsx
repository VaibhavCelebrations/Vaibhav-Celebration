"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Package, Heart, Lock, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { FooterClient } from "@/components/layout/FooterClient";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { useAuth } from "@/context/auth-context";

const NAV_ITEMS = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/orders", label: "Order History", icon: Package },
  { href: "/account/wishlist", label: "Saved Products", icon: Heart },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, openAuthModal } = useAuth();
  const pathname = usePathname();
  const navItems = NAV_ITEMS;

  return (
    <>
      <Navbar />
      <main className="pt-28 md:pt-36 pb-16 md:pb-24 bg-cream min-h-screen">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          {isLoading ? (
            <div className="flex justify-center py-24">
              <Loader2 size={32} className="animate-spin text-mocha" />
            </div>
          ) : !isAuthenticated ? (
            <div className="max-w-md mx-auto text-center py-16">
              <div className="w-20 h-20 rounded-full bg-mocha/10 flex items-center justify-center mx-auto mb-6">
                <Lock size={32} className="text-mocha" />
              </div>
              <h1 className="font-display text-2xl font-bold text-charcoal mb-3">Sign in to your account</h1>
              <p className="text-text-muted text-sm mb-8">
                Sign in to view your orders and saved products.
              </p>
              <button
                onClick={() => openAuthModal(() => window.location.reload())}
                className="btn-primary px-10 py-3.5 text-sm font-bold uppercase tracking-wider cursor-pointer"
              >
                Login / Sign Up
              </button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[220px_1fr] gap-8">
              {/* Sidebar */}
              <aside className="lg:sticky lg:top-28 h-fit">
                <nav className="flex lg:flex-col gap-1 overflow-x-auto hide-scrollbar bg-surface rounded-2xl border border-border-light p-2 shadow-soft">
                  {navItems.map((item) => {
                    const isActive = item.href === "/account" ? pathname === "/account" : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                          isActive ? "bg-mocha text-white shadow-sm" : "text-charcoal hover:bg-cream"
                        }`}
                      >
                        <Icon size={16} /> {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </aside>

              {/* Content */}
              <div>{children}</div>
            </div>
          )}
        </div>
      </main>
      <FooterClient />
      <WhatsAppFAB />
    </>
  );
}
