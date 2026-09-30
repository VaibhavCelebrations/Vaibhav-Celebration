"use client";

import Link from "next/link";
import { Heart, Package, User } from "lucide-react";
import { useOverlay } from "@/hooks/useOverlay";

interface NavLink {
  label: string;
  href: string;
  submenu?: { label: string; href: string }[];
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: NavLink[];
  isAuthenticated?: boolean;
}

const ACCOUNT_LINKS = [
  { href: "/account", label: "My Profile", icon: User },
  { href: "/account/orders", label: "Order History", icon: Package },
  { href: "/account/wishlist", label: "Saved Products", icon: Heart },
];

export function MobileMenu({ isOpen, onClose, links, isAuthenticated = false }: MobileMenuProps) {
  // Esc closes, the page behind does not scroll, and focus stays in the menu while it is open.
  const panelRef = useOverlay<HTMLDivElement>(isOpen, onClose);
  return (
    <div
      // Closed, the menu is only faded out — keep it out of the tab order and away from screen readers.
      inert={!isOpen}
      className={`lg:hidden fixed inset-0 top-[80px] z-40 transition-all duration-500 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="absolute inset-0 bg-charcoal/20" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative bg-cream border-t border-border shadow-lg focus:outline-none transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-y-0" : "-translate-y-4"
        }`}
      >
        <nav className="flex flex-col px-6 py-5 gap-0.5 text-charcoal max-h-[calc(100vh-80px)] overflow-y-auto" aria-label="Mobile">
          {links.map((link) => (
            <div key={link.label}>
              <Link
                href={link.href}
                onClick={onClose}
                className="mobile-link text-base font-medium py-3"
              >
                {link.label}
              </Link>
              {link.submenu && (
                <div className="pl-4 pb-2">
                  {link.submenu.map((sub) => (
                    <Link
                      key={sub.label}
                      href={sub.href}
                      onClick={onClose}
                      className="mobile-link text-sm py-2 text-text-muted"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isAuthenticated && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="px-0 pb-2 text-xs font-bold uppercase tracking-wider text-text-light">Your account</p>
              {ACCOUNT_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="mobile-link text-sm py-2.5 text-charcoal flex items-center gap-3"
                  >
                    <Icon size={16} className="text-mocha" /> {item.label}
                  </Link>
                );
              })}
            </div>
          )}
          <Link
            href="/consultation"
            onClick={onClose}
            className="btn-primary mt-4 justify-center text-sm px-6 py-3.5 rounded-lg"
          >
            Plan My Celebration
          </Link>
        </nav>
      </div>
    </div>
  );
}
