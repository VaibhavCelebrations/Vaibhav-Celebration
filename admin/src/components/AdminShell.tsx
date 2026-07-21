"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";
import {
  Palette,
  Package,
  Image as ImageIcon,
  PartyPopper,
  Newspaper,
  HelpCircle,
  Star,
  Megaphone,
  Users,
  UserPlus,
  CalendarCheck,
  CalendarRange,
  Receipt,
  MessagesSquare,
  Settings as SettingsIcon,
  FileText,
  Images,
  SearchCheck,
  SlidersHorizontal,
  Gauge,
  ScrollText,
  ShieldCheck,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { AdminUser } from "@/lib/admin-api-client";
import { useAdminSession } from "@/components/AdminSessionContext";
import { logout } from "@/lib/data/session";

type NavItem = { href: string; label: string; section: "CMS" | "CRM" | "Settings"; icon: LucideIcon; roles?: AdminUser["role"][] };

const NAV: NavItem[] = [
  { section: "CMS", href: "/dashboard/cms/themes", label: "Themes", icon: Palette },
  { section: "CMS", href: "/dashboard/cms/packages", label: "Packages", icon: Package },
  { section: "CMS", href: "/dashboard/cms/gallery", label: "Gallery", icon: ImageIcon },
  { section: "CMS", href: "/dashboard/cms/events", label: "Events", icon: PartyPopper },
  { section: "CMS", href: "/dashboard/cms/blog", label: "Blog", icon: Newspaper },
  { section: "CMS", href: "/dashboard/cms/faqs", label: "FAQs", icon: HelpCircle },
  { section: "CMS", href: "/dashboard/cms/testimonials", label: "Testimonials", icon: Star },
  { section: "CMS", href: "/dashboard/cms/popups", label: "Popups", icon: Megaphone },
  { section: "CMS", href: "/dashboard/cms/legal", label: "Legal Pages", icon: FileText },
  { section: "CMS", href: "/dashboard/cms/media", label: "Media Library", icon: Images },
  { section: "CMS", href: "/dashboard/cms/metadata", label: "Site Metadata (SEO)", icon: SearchCheck },
  { section: "CRM", href: "/dashboard/crm/customers", label: "Customers", icon: Users },
  { section: "CRM", href: "/dashboard/crm/leads", label: "Leads", icon: UserPlus },
  { section: "CRM", href: "/dashboard/crm/bookings", label: "Bookings", icon: CalendarCheck },
  { section: "CRM", href: "/dashboard/crm/calendar", label: "Calendar", icon: CalendarRange },
  { section: "CRM", href: "/dashboard/crm/invoices", label: "Invoices", icon: Receipt },
  { section: "CRM", href: "/dashboard/crm/consultations", label: "Consultations", icon: MessagesSquare },
  { section: "Settings", href: "/dashboard/settings", label: "Operational Settings", icon: SettingsIcon },
  { section: "Settings", href: "/dashboard/settings/capacity", label: "Capacity Rules", icon: Gauge, roles: ["SUPER_ADMIN", "OPERATIONS"] },
  { section: "Settings", href: "/dashboard/settings/audit", label: "Audit Log", icon: ScrollText, roles: ["SUPER_ADMIN"] },
  { section: "Settings", href: "/dashboard/settings/users", label: "Admin Users", icon: ShieldCheck, roles: ["SUPER_ADMIN"] },
];

function canSeeSection(role: AdminUser["role"], section: NavItem["section"]) {
  if (role === "SUPER_ADMIN") return true;
  if (role === "CONTENT_EDITOR") return section === "CMS";
  if (role === "OPERATIONS") return section === "CRM" || section === "Settings";
  return false;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { admin } = useAdminSession();

  const [openSection, setOpenSection] = useState<string | null>(null);

  // Initialize the open section based on the current pathname
  useEffect(() => {
    if (!openSection) {
      if (pathname === "/dashboard") {
        setOpenSection(null);
      } else {
        const matchingSection = NAV.find((item) =>
          item.href === "/dashboard/settings"
            ? pathname === item.href
            : pathname.startsWith(item.href)
        )?.section;
        if (matchingSection) {
          setOpenSection(matchingSection);
        }
      }
    }
  }, [pathname]);

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  const sections = ["CMS", "CRM", "Settings"] as const;
  const initials = admin.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside
        className="sticky top-0 flex h-screen w-64 shrink-0 flex-col self-start bg-white"
        style={{ borderRight: "1px solid var(--color-border-soft)", boxShadow: "2px 0 16px 0 rgba(33,33,33,0.04)" }}
      >
        <div
          className="flex shrink-0 items-center justify-center px-4 py-6"
          style={{ borderBottom: "1px solid var(--color-border-soft)" }}
        >
          <Link
            href="/dashboard"
            aria-label="Go to dashboard"
            className="flex cursor-pointer items-center justify-center rounded-md transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: "var(--color-mocha)" }}
          >
            <Image
              src="/logo-photoroom.png"
              alt="Vaibhav Celebrations"
              width={1264}
              height={843}
              priority
              className="h-28 w-auto object-contain"
            />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
          <div className="mb-2">
            <Link
              href="/dashboard"
              aria-current={pathname === "/dashboard" ? "page" : undefined}
              className={`nav-item ${pathname === "/dashboard" ? "active" : ""}`}
            >
              <LayoutDashboard
                size={17}
                strokeWidth={1.75}
                className="nav-icon shrink-0"
                style={{ color: pathname === "/dashboard" ? "var(--color-mocha)" : "var(--color-text-muted)" }}
                aria-hidden="true"
              />
              <span className="flex-1">Dashboard</span>
            </Link>
          </div>

          {sections.map((section) => {
            if (!canSeeSection(admin.role, section)) return null;
            const items = NAV.filter((n) => n.section === section && (!n.roles || n.roles.includes(admin.role)));
            const isOpen = openSection === section;

            return (
              <div key={section} className="mb-2">
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? null : section)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-left transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-mocha)"
                  aria-expanded={isOpen}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-(--color-text-muted)">
                    {section}
                  </span>
                  {isOpen ? (
                    <ChevronDown size={14} className="text-(--color-text-muted)" />
                  ) : (
                    <ChevronRight size={14} className="text-(--color-text-muted)" />
                  )}
                </button>
                
                {isOpen && (
                  <ul className="mt-1 space-y-0.5">
                    {items.map((item) => {
                      // Fix for operational settings highlighting incorrectly when on sub-settings
                      const active =
                        item.href === "/dashboard/settings"
                          ? pathname === item.href
                          : pathname === item.href || pathname.startsWith(item.href + "/");

                      const ItemIcon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={`nav-item ${active ? "active" : ""}`}
                          >
                            <ItemIcon
                              size={17}
                              strokeWidth={1.75}
                              className="nav-icon shrink-0"
                              style={{ color: active ? "var(--color-mocha)" : "var(--color-text-muted)" }}
                              aria-hidden="true"
                            />
                            <span className="flex-1">{item.label}</span>
                            {active && (
                              <span
                                aria-hidden="true"
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ background: "var(--color-mocha)" }}
                              />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 p-4" style={{ borderTop: "1px solid var(--color-border-soft)" }}>
          <div className="mb-4 flex items-center gap-3 overflow-hidden">
            <div
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, var(--color-blush) 0%, var(--color-mocha-light) 100%)",
                color: "var(--color-mocha-dark)",
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-(--color-charcoal)">{admin.name}</p>
              <p className="truncate text-xs text-(--color-text-muted)" title={admin.email}>
                {admin.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Log out"
            title="Log out"
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-gray-50"
            style={{ borderColor: "var(--color-border)", color: "var(--color-charcoal-soft)" }}
          >
            <LogOut size={15} strokeWidth={1.75} aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
