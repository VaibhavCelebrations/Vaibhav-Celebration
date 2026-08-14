"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronDown, ShoppingCart, User, LogOut, Package, Heart, Gift } from "lucide-react";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { MobileMenu } from "./MobileMenu";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";

type NavLink = {
  label: string;
  href: string;
  submenu?: { label: string; href: string }[];
};

const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  {
    label: "Celebrations",
    href: "/themes",
    submenu: [
      { label: "Kids' Birthdays", href: "/themes" },
      { label: "Baby Shower", href: "/themes?category=baby-shower" },
      { label: "Naming Ceremony", href: "/themes?category=naming-ceremony" },
      { label: "Milestone Celebrations", href: "/themes?category=milestone" },
      { label: "Custom Celebrations", href: "/consultation" },
    ],
  },
  { label: "Packages", href: "/packages" },
  {
    label: "Shop",
    href: "/gifts",
    submenu: [
      { label: "Shop Return Gifts", href: "/gifts" },
      { label: "Personalized Return Gifts", href: "/gifts?category=personalized" },
      { label: "Shop by Theme", href: "/gifts?view=themes" },
      { label: "Occasion & Festive Gifting", href: "/gifts?category=festive" },
    ],
  },
  { label: "Events", href: "/events" },
  { label: "Gallery", href: "/gallery" },
  { label: "About Us", href: "/about" },
];

export function Navbar() {
  const { scrolled } = useScrollDirection();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const { itemCount, openCart } = useCart();
  const { isAuthenticated, user, openAuthModal, logout } = useAuth();
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const toggleMobile = useCallback(() => setMobileOpen((prev) => !prev), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setShowAccountMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <header
      id="site-header"
      className={`fixed top-0 inset-x-0 z-50 ${scrolled && !mobileOpen ? "scrolled" : ""}`}
    >
      <div className="nav-shell">
        <div className="max-w-7xl mx-auto px-5 md:px-10">
          <div className="nav-inner flex items-center justify-between h-[80px] md:h-[88px]">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 group shrink-0"
              aria-label="Vaibhav Celebrations — home"
            >
              <Image
                src="/logo-v2.png"
                alt="Vaibhav Celebrations"
                width={155}
                height={155}
                className="shrink-0 transition-premium group-hover:scale-105 w-auto h-[60px]"
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </Link>

            {/* Desktop nav */}
            <nav
              className="hidden lg:flex items-center gap-4 xl:gap-6 text-sm font-semibold text-charcoal"
              aria-label="Primary"
            >
              {navLinks.map((link) => (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => link.submenu && setActiveSubmenu(link.label)}
                  onMouseLeave={() => setActiveSubmenu(null)}
                >
                  <Link
                    href={link.href}
                    className="nav-link hover:text-mocha transition-colors flex items-center gap-1 py-2"
                  >
                    {link.label}
                    {link.submenu && <ChevronDown size={14} className="opacity-50" />}
                  </Link>
                  {/* Dropdown */}
                  {link.submenu && activeSubmenu === link.label && (
                    <div className="absolute top-full left-0 pt-2">
                      <div className="bg-surface rounded-xl shadow-card border border-border-light py-2 min-w-[220px]">
                        {link.submenu.map((sub) => (
                          <Link
                            key={sub.label}
                            href={sub.href}
                            className="block px-5 py-3 text-[15px] font-medium text-text hover:text-mocha hover:bg-cream transition-colors"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="hidden lg:flex items-center gap-3">
              {/* Account Icon */}
              <div className="relative" ref={accountMenuRef}>
                {isAuthenticated ? (
                  <button
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="w-10 h-10 rounded-full bg-mocha text-white text-sm font-bold flex items-center justify-center hover:bg-mocha-dark transition-colors cursor-pointer shadow-sm"
                    aria-label="Account menu"
                  >
                    {userInitial}
                  </button>
                ) : (
                  <button
                    onClick={() => openAuthModal()}
                    className="relative w-10 h-10 rounded-full border border-border flex items-center justify-center text-charcoal hover:text-mocha hover:border-mocha transition-colors cursor-pointer"
                    aria-label="Login"
                  >
                    <User size={18} />
                  </button>
                )}

                {/* Account Dropdown */}
                {showAccountMenu && isAuthenticated && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-surface rounded-xl shadow-card border border-border-light py-2 z-50">
                    <div className="px-4 py-3 border-b border-border-light">
                      <p className="text-sm font-bold text-charcoal truncate">{user?.name}</p>
                      <p className="text-xs text-text-muted truncate">{user?.email}</p>
                    </div>
                    <Link href="/account/orders" onClick={() => setShowAccountMenu(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal hover:text-mocha hover:bg-cream transition-colors">
                      <Package size={16} /> Order History
                    </Link>
                    <Link href="/account/wishlist" onClick={() => setShowAccountMenu(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal hover:text-mocha hover:bg-cream transition-colors">
                      <Heart size={16} /> Saved Products
                    </Link>
                    <Link href="/account/registry" onClick={() => setShowAccountMenu(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal hover:text-mocha hover:bg-cream transition-colors">
                      <Gift size={16} /> Gift Registry
                    </Link>
                    <button
                      onClick={() => { logout(); setShowAccountMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-muted hover:text-red-500 hover:bg-cream transition-colors cursor-pointer border-t border-border-light mt-1"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>

              {/* Cart Icon */}
              <button
                onClick={openCart}
                className="relative w-10 h-10 rounded-full border border-border flex items-center justify-center text-charcoal hover:text-mocha hover:border-mocha transition-colors cursor-pointer"
                aria-label="Open cart"
              >
                <ShoppingCart size={18} />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-mocha text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>
              <Link
                href="/consultation"
                className="btn-primary text-sm px-6 py-2.5 transition-all"
              >
                Plan My Celebration
              </Link>
            </div>

            {/* Mobile: account + cart + toggle */}
            <div className="lg:hidden flex items-center gap-2">
              {/* Mobile Account */}
              {isAuthenticated ? (
                <button
                  onClick={() => setShowAccountMenu(!showAccountMenu)}
                  className="w-9 h-9 rounded-full bg-mocha text-white text-xs font-bold flex items-center justify-center cursor-pointer"
                  aria-label="Account"
                >
                  {userInitial}
                </button>
              ) : (
                <button
                  onClick={() => openAuthModal()}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-charcoal cursor-pointer"
                  aria-label="Login"
                >
                  <User size={20} />
                </button>
              )}

              <button
                onClick={openCart}
                className="relative w-10 h-10 rounded-full flex items-center justify-center text-charcoal cursor-pointer"
                aria-label="Open cart"
              >
                <ShoppingCart size={22} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-mocha text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>
              <button
                onClick={toggleMobile}
                className="text-charcoal p-2 -mr-2 transition-all duration-300 hover:scale-110 active:scale-95"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={26} /> : <Menu size={26} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile account dropdown */}
      {showAccountMenu && isAuthenticated && (
        <div className="lg:hidden absolute top-[80px] right-4 w-56 bg-surface rounded-xl shadow-card border border-border-light py-2 z-50">
          <div className="px-4 py-3 border-b border-border-light">
            <p className="text-sm font-bold text-charcoal truncate">{user?.name}</p>
            <p className="text-xs text-text-muted truncate">{user?.email}</p>
          </div>
          <Link href="/account/orders" onClick={() => setShowAccountMenu(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal hover:text-mocha hover:bg-cream transition-colors">
            <Package size={16} /> Order History
          </Link>
          <Link href="/account/wishlist" onClick={() => setShowAccountMenu(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal hover:text-mocha hover:bg-cream transition-colors">
            <Heart size={16} /> Saved Products
          </Link>
          <Link href="/account/registry" onClick={() => setShowAccountMenu(false)} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal hover:text-mocha hover:bg-cream transition-colors">
            <Gift size={16} /> Gift Registry
          </Link>
          <button
            onClick={() => { logout(); setShowAccountMenu(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-muted hover:text-red-500 hover:bg-cream transition-colors cursor-pointer border-t border-border-light mt-1"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      )}

      <MobileMenu isOpen={mobileOpen} onClose={closeMobile} links={navLinks} />
    </header>
  );
}
