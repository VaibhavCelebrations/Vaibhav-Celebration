"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

// ─── Icon primitive ───────────────────────────────────────────────────────
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

// ─── Page title map ───────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  "/":              "Dashboard",
  "/calendar":      "Booking Calendar",
  "/themes":        "Themes",
  "/packages":      "Packages",
  "/gallery":       "Gallery",
  "/events":        "Events",
  "/blog":          "Blog",
  "/popups":        "Popups",
  "/testimonials":  "Testimonials",
  "/faqs":          "FAQs",
  "/legal":         "Legal Pages",
  "/seo":           "SEO & Meta",
  "/bookings":      "Bookings",
  "/customers":     "Customers",
  "/leads":         "Leads",
  "/consultations": "Consultations",
  "/invoices":      "Invoices",
  "/products":      "Products",
  "/inventory":     "Inventory",
  "/orders":        "Orders",
  "/registries":    "Gift Registries",
  "/settings":      "Settings",
};

function getTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [key, val] of Object.entries(PAGE_TITLES)) {
    if (key !== "/" && pathname.startsWith(key)) return val;
  }
  return "Admin";
}

// ─── Topbar Component ─────────────────────────────────────────────────────
export default function Topbar() {
  const pathname = usePathname();
  const [searchFocused, setSearchFocused] = useState(false);
  const title = getTitle(pathname);

  return (
    <header
      style={{
        height: 64,
        backgroundColor: "#fff",
        borderBottom: "1px solid var(--color-border-soft)",
        display: "flex",
        alignItems: "center",
        padding: "0 1.5rem",
        gap: "1rem",
        position: "sticky",
        top: 0,
        zIndex: "var(--z-topbar)" as string,
        boxShadow: "0 1px 8px 0 rgba(33,33,33,0.04)",
      }}
    >
      {/* Page Title */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "var(--color-charcoal)",
            margin: 0,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </h1>
      </div>

      {/* Search */}
      <div
        style={{
          position: "relative",
          width: searchFocused ? 280 : 220,
          transition: "width 250ms ease",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            left: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--color-text-muted)",
            pointerEvents: "none",
          }}
        >
          <Icon path="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" size={15} />
        </span>
        <input
          type="search"
          placeholder="Search anything…"
          className="input"
          style={{ paddingLeft: "2.25rem", fontSize: "0.8125rem", height: 38, minHeight: 38 }}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          aria-label="Search admin"
        />
      </div>

      {/* Quick Add */}
      <Link
        href="/bookings/new"
        className="btn btn-primary"
        style={{ padding: "0.5rem 1rem", height: 38, minHeight: 38, fontSize: "0.8125rem", textDecoration: "none" }}
        aria-label="Create new booking"
      >
        <Icon path="M12 5v14M5 12h14" size={15} />
        New
      </Link>

      {/* Notification Bell */}
      <button
        className="btn btn-ghost"
        style={{
          width: 38,
          height: 38,
          minHeight: 38,
          padding: 0,
          position: "relative",
          borderRadius: "50%",
          flexShrink: 0,
        }}
        aria-label="Notifications (1 unread)"
      >
        <Icon path="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" size={17} />
        {/* Unread dot */}
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 9,
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: "var(--color-error)",
            border: "1.5px solid #fff",
          }}
          aria-hidden="true"
        />
      </button>
    </header>
  );
}
