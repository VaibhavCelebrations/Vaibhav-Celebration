"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronDown, ShoppingCart } from "lucide-react";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { MobileMenu } from "./MobileMenu";
import { useCart } from "@/context/cart-context";

type NavLink = {
  label: string;
  href: string;
  submenu?: { label: string; href: string }[];
};

const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Themes", href: "/themes" },
  { label: "Packages", href: "/packages" },
  { label: "Gallery", href: "/gallery" },
  { label: "Gifts", href: "/gifts" },
  { label: "Blog", href: "/blog" },
  { label: "Contact Us", href: "/contact" },
];

export function Navbar() {
  const { scrolled } = useScrollDirection();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const { itemCount, openCart } = useCart();

  const toggleMobile = useCallback(() => setMobileOpen((prev) => !prev), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

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
                src="/logo.png"
                alt="Vaibhav Celebrations"
                width={155}
                height={155}
                className="shrink-0 transition-premium group-hover:scale-105"
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

            <div className="hidden lg:flex items-center gap-4">
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
                Book a Celebration
              </Link>
            </div>

            {/* Mobile: cart + toggle */}
            <div className="lg:hidden flex items-center gap-2">
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
                className="text-charcoal p-2 -mr-2"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={26} /> : <Menu size={26} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <MobileMenu isOpen={mobileOpen} onClose={closeMobile} links={navLinks} />
    </header>
  );
}
