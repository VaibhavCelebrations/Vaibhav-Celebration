"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { fetchMe, logoutAdmin, type AdminUser } from "@/lib/admin-api-client";

type NavItem = { href: string; label: string; section: "CMS" | "CRM" | "Settings" };

const NAV: NavItem[] = [
  { section: "CMS", href: "/dashboard/cms/themes", label: "Themes" },
  { section: "CMS", href: "/dashboard/cms/packages", label: "Packages" },
  { section: "CMS", href: "/dashboard/cms/gallery", label: "Gallery" },
  { section: "CMS", href: "/dashboard/cms/events", label: "Events" },
  { section: "CMS", href: "/dashboard/cms/blog", label: "Blog" },
  { section: "CMS", href: "/dashboard/cms/faqs", label: "FAQs" },
  { section: "CMS", href: "/dashboard/cms/testimonials", label: "Testimonials" },
  { section: "CMS", href: "/dashboard/cms/popups", label: "Popups" },
  { section: "CMS", href: "/dashboard/cms/legal", label: "Legal Pages" },
  { section: "CRM", href: "/dashboard/crm/customers", label: "Customers" },
  { section: "CRM", href: "/dashboard/crm/leads", label: "Leads" },
  { section: "CRM", href: "/dashboard/crm/bookings", label: "Bookings" },
  { section: "CRM", href: "/dashboard/crm/calendar", label: "Calendar" },
  { section: "CRM", href: "/dashboard/crm/invoices", label: "Invoices" },
  { section: "CRM", href: "/dashboard/crm/consultations", label: "Consultations" },
  { section: "Settings", href: "/dashboard/settings", label: "Operational Settings" },
];

function canSeeSection(role: AdminUser["role"], section: NavItem["section"]) {
  if (role === "SUPER_ADMIN") return true;
  if (role === "CONTENT_EDITOR") return section === "CMS";
  if (role === "OPERATIONS") return section === "CRM";
  return false;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setAdmin)
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function onLogout() {
    await logoutAdmin();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--color-ink-muted)]">
        Loading admin session…
      </div>
    );
  }

  if (!admin) return null;

  const sections = ["CMS", "CRM", "Settings"] as const;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-[var(--color-sidebar)] text-[var(--color-sidebar-text)]">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="font-display text-xl">Vaibhav Admin</p>
          <p className="mt-1 text-xs text-[var(--color-sidebar-muted)]">CMS + CRM</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((section) => {
            if (!canSeeSection(admin.role, section)) return null;
            const items = NAV.filter((n) => n.section === section);
            return (
              <div key={section} className="mb-5">
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-sidebar-muted)]">
                  {section}
                </p>
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`block rounded-md px-2.5 py-2 text-sm transition ${
                            active
                              ? "bg-white/12 text-white"
                              : "text-[var(--color-sidebar-muted)] hover:bg-white/6 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-white px-6 py-4">
          <div>
            <p className="text-sm font-medium">{admin.name}</p>
            <p className="text-xs text-[var(--color-ink-muted)]">
              {admin.email} · {admin.role.replace("_", " ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-cream)]"
          >
            Log out
          </button>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
