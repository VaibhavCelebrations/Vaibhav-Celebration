"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── SVG Icon set (inline, Lucide-inspired) ───────────────────────────────
function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  dashboard:    "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  calendar:     "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  users:        "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  package:      "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  image:        "M15 8h.01M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm7 12-3.5-4.5 2.5-3L11 13l3-4 4 5H6",
  tag:          "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
  fileText:     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  messageSquare:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  star:         "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  settings:     "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  shoppingBag:  "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0",
  layers:       "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  invoice:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15h6",
  gift:         "M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z",
  chevronDown:  "M6 9l6 6 6-6",
  chevronRight: "M9 18l6-6-6-6",
};

// ─── Nav Structure ────────────────────────────────────────────────────────
type NavItem = { label: string; href: string; icon: keyof typeof ICONS };
type NavGroup = { group: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard",    href: "/",               icon: "dashboard" },
      { label: "Calendar",     href: "/calendar",        icon: "calendar"  },
    ],
  },
  {
    group: "Content",
    items: [
      { label: "Themes",       href: "/themes",          icon: "layers"    },
      { label: "Packages",     href: "/packages",        icon: "package"   },
      { label: "Gallery",      href: "/gallery",         icon: "image"     },
      { label: "Events",       href: "/events",          icon: "calendar"  },
      { label: "Blog",         href: "/blog",            icon: "fileText"  },
      { label: "Popups",       href: "/popups",          icon: "messageSquare" },
      { label: "Testimonials", href: "/testimonials",    icon: "star"      },
      { label: "FAQs",         href: "/faqs",            icon: "tag"       },
      { label: "Legal Pages",  href: "/legal",           icon: "fileText"  },
      { label: "SEO / Meta",   href: "/seo",             icon: "tag"       },
    ],
  },
  {
    group: "CRM",
    items: [
      { label: "Bookings",     href: "/bookings",        icon: "calendar"  },
      { label: "Customers",    href: "/customers",       icon: "users"     },
      { label: "Leads",        href: "/leads",           icon: "messageSquare" },
      { label: "Consultations",href: "/consultations",   icon: "messageSquare" },
      { label: "Invoices",     href: "/invoices",        icon: "invoice"   },
    ],
  },
  {
    group: "Shop",
    items: [
      { label: "Products",     href: "/products",        icon: "shoppingBag" },
      { label: "Inventory",    href: "/inventory",       icon: "package"   },
      { label: "Orders",       href: "/orders",          icon: "shoppingBag" },
    ],
  },
  {
    group: "Registry",
    items: [
      { label: "Gift Registries", href: "/registries",  icon: "gift"      },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Settings",     href: "/settings",        icon: "settings"  },
    ],
  },
];

// ─── Sidebar Component ────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside
      style={{
        width: "248px",
        minHeight: "100dvh",
        backgroundColor: "#fff",
        borderRight: "1px solid var(--color-border-soft)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: "var(--z-sidebar)",
        overflowY: "auto",
        boxShadow: "2px 0 16px 0 rgba(33,33,33,0.04)",
      }}
    >
      {/* Brand Logo */}
      <div
        style={{
          padding: "1.5rem 1.25rem 1rem",
          borderBottom: "1px solid var(--color-border-soft)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Monogram mark */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "10px",
              background: "linear-gradient(135deg, var(--color-mocha) 0%, var(--color-mocha-dark) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "var(--shadow-mocha)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-serif)",
                color: "#fff",
                fontSize: "1.125rem",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              VC
            </span>
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--color-charcoal)",
                lineHeight: 1.2,
              }}
            >
              Vaibhav
            </div>
            <div
              style={{
                fontSize: "0.6875rem",
                color: "var(--color-text-muted)",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Celebrations · Admin
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav
        style={{ flex: 1, padding: "1rem 0.75rem", overflowY: "auto" }}
        aria-label="Main navigation"
      >
        {NAV.map((group) => (
          <div key={group.group} style={{ marginBottom: "0.25rem" }}>
            <div
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                padding: "0.625rem 0.875rem 0.375rem",
              }}
            >
              {group.group}
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`nav-item ${active ? "active" : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <span
                        className="nav-icon"
                        style={{ color: active ? "var(--color-mocha)" : "var(--color-text-muted)", flexShrink: 0 }}
                      >
                        <Icon path={ICONS[item.icon]} />
                      </span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {active && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--color-mocha)",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom user strip */}
      <div
        style={{
          padding: "0.875rem 1rem",
          borderTop: "1px solid var(--color-border-soft)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-blush) 0%, var(--color-mocha-light) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--color-mocha-dark)",
            fontFamily: "var(--font-serif)",
          }}
          aria-label="User avatar"
        >
          SA
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-charcoal)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Super Admin
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            admin@vaibhav.in
          </div>
        </div>

        {/* Logout button */}
        <a
          href="/api/auth/logout"
          title="Sign out"
          aria-label="Sign out"
          style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border-soft)",
            cursor: "pointer",
            transition: "all 200ms ease",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "var(--color-error-bg)";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-error)";
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--color-error)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text-muted)";
            (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--color-border-soft)";
          }}
        >
          {/* Log-out icon */}
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </a>
      </div>
    </aside>
  );
}
