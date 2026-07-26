"use client";

import Link from "next/link";

interface NavLink {
  label: string;
  href: string;
  submenu?: { label: string; href: string }[];
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: NavLink[];
}

export function MobileMenu({ isOpen, onClose, links }: MobileMenuProps) {
  return (
    <div
      className={`lg:hidden fixed inset-0 top-[80px] z-40 transition-all duration-500 ${
        isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="absolute inset-0 bg-charcoal/20" onClick={onClose} />
      <div
        className={`relative bg-cream border-t border-border shadow-lg transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-y-0" : "-translate-y-4"
        }`}
      >
        <nav className="flex flex-col px-6 py-5 gap-0.5 text-charcoal" aria-label="Mobile">
          {links.map((link) => (
            <div key={link.label}>
              <Link
                href={link.href}
                onClick={link.submenu ? undefined : onClose}
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
          <Link
            href="/consultation"
            onClick={onClose}
            className="btn-primary mt-4 justify-center text-sm px-6 py-3.5 rounded-lg"
          >
            Book a Celebration
          </Link>
        </nav>
      </div>
    </div>
  );
}
