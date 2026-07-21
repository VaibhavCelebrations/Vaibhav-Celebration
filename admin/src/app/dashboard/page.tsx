"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetchList } from "@/lib/admin-api-client";

function Icon({ d, size = 20 }: { d: string; size?: number }) {
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
      <path d={d} />
    </svg>
  );
}

type BookingRow = {
  id: string;
  bookingCode: string;
  eventDate: string;
  status: string;
  totalPriceInPaise?: number;
  customer?: { fullName?: string };
  theme?: { title?: string };
  package?: { title?: string };
};

type LeadRow = { id: string; status: string };
type EventRow = { id: string; title?: string; name?: string; eventDate?: string; startAt?: string; isActive?: boolean };

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: "Confirmed", className: "badge badge-success" },
  SCHEDULED: { label: "Scheduled", className: "badge badge-warning" },
  COMPLETED: { label: "Completed", className: "badge badge-neutral" },
  CANCELLED: { label: "Cancelled", className: "badge badge-error" },
  confirmed: { label: "Confirmed", className: "badge badge-success" },
  pending: { label: "Pending", className: "badge badge-warning" },
  completed: { label: "Completed", className: "badge badge-neutral" },
  cancelled: { label: "Cancelled", className: "badge badge-error" },
};

const QUICK_ACTIONS = [
  {
    label: "New Booking",
    href: "/dashboard/crm/bookings",
    d: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
  },
  {
    label: "Add Theme",
    href: "/dashboard/cms/themes?create=1",
    d: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  },
  {
    label: "Upload Gallery",
    href: "/dashboard/cms/gallery",
    d: "M15 8h.01M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm7 12-3.5-4.5 2.5-3L11 13l3-4 4 5H6",
  },
  {
    label: "New Event",
    href: "/dashboard/cms/events",
    d: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  },
];

function formatPaise(paise?: number) {
  if (typeof paise !== "number") return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatShortDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function monthChip(iso?: string) {
  if (!iso) return { day: "—", month: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: iso.slice(8, 10) || "—", month: iso.slice(5, 7) };
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString("en-IN", { month: "short" }),
  };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [activeLeads, setActiveLeads] = useState(0);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [monthRevenuePaise, setMonthRevenuePaise] = useState(0);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    let active = true;
    Promise.all([
      adminFetchList<BookingRow>("/admin/bookings?page=1&pageSize=8&sort=eventDate&dir=asc", {
        page: 1,
        pageSize: 8,
      }),
      adminFetchList<LeadRow>("/admin/leads?page=1&pageSize=100", { page: 1, pageSize: 100 }),
      adminFetchList<EventRow>("/admin/events?page=1&pageSize=10", { page: 1, pageSize: 10 }),
    ])
      .then(([bookingRes, leadRes, eventRes]) => {
        if (!active) return;
        setBookings(bookingRes.items);
        setBookingTotal(bookingRes.total);
        setActiveLeads(
          leadRes.items.filter((lead) => !["CONVERTED", "CLOSED_LOST"].includes(lead.status))
            .length,
        );
        setEvents(eventRes.items.slice(0, 5));
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const revenue = bookingRes.items.reduce((sum, b) => {
          const date = new Date(b.eventDate);
          if (date >= start && date <= end && b.status !== "CANCELLED") {
            return sum + (b.totalPriceInPaise ?? 0);
          }
          return sum;
        }, 0);
        setMonthRevenuePaise(revenue);
      })
      .catch(() => {
        if (!active) return;
        setBookings([]);
        setBookingTotal(0);
        setActiveLeads(0);
        setEvents([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcoming = [...bookings]
    .filter((b) => b.status !== "CANCELLED" && new Date(b.eventDate) >= new Date(now.toDateString()))
    .slice(0, 3);

  const stats = [
    {
      id: "total-bookings",
      label: "Total Bookings",
      value: loading ? "…" : String(bookingTotal),
      delta: loading ? "Loading…" : `${bookings.length} shown recently`,
      deltaPositive: true,
      icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
      accent: "var(--color-mocha)",
      accentBg: "var(--color-blush-light)",
    },
    {
      id: "revenue",
      label: "Revenue (This Month)",
      value: loading ? "…" : formatPaise(monthRevenuePaise),
      delta: "From loaded bookings this month",
      deltaPositive: true,
      icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
      accent: "var(--color-success)",
      accentBg: "var(--color-success-bg)",
    },
    {
      id: "active-leads",
      label: "Active Leads",
      value: loading ? "…" : String(activeLeads),
      delta: "Open pipeline (not converted/lost)",
      deltaPositive: false,
      icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
      accent: "var(--color-warning)",
      accentBg: "var(--color-warning-bg)",
    },
    {
      id: "upcoming-events",
      label: "CMS Events",
      value: loading ? "…" : String(events.length),
      delta: events[0] ? `Latest: ${events[0].title ?? events[0].name ?? "Event"}` : "No events yet",
      deltaPositive: true,
      icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
      accent: "var(--color-info)",
      accentBg: "var(--color-info-bg)",
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div className="ornament" style={{ marginBottom: "0.75rem" }}>
          Vaibhav Celebrations
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.875rem",
            fontWeight: 600,
            color: "var(--color-charcoal)",
            margin: 0,
          }}
        >
          {greeting}, Admin
        </h1>
        <p style={{ marginTop: "0.375rem", fontSize: "0.9375rem", color: "var(--color-text-muted)" }}>
          Live overview from your database — bookings, leads, and events.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {stats.map((s) => (
          <article key={s.id} className="card" style={{ padding: "1.375rem 1.25rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "10px",
                  background: s.accentBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: s.accent,
                }}
                aria-hidden="true"
              >
                <Icon d={s.icon} size={20} />
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "2rem",
                fontWeight: 600,
                color: "var(--color-charcoal)",
                lineHeight: 1,
                marginBottom: "0.375rem",
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
              {s.label}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: s.deltaPositive ? "var(--color-success)" : "var(--color-warning)",
              }}
            >
              {s.delta}
            </div>
          </article>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
        className="dashboard-main-grid"
      >
        <section className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--color-border-soft)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
              Recent Bookings
            </h2>
            <Link
              href="/dashboard/crm/bookings"
              className="btn btn-ghost"
              style={{ padding: "0.375rem 0.75rem", height: 34, minHeight: 34, fontSize: "0.8125rem" }}
            >
              View all →
            </Link>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--color-surface)" }}>
                  {["Booking ID", "Customer", "Theme", "Date", "Package", "Amount", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "0.75rem 1rem",
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--color-text-muted)",
                        borderBottom: "1px solid var(--color-border-soft)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "1.5rem", color: "var(--color-text-muted)" }}>
                      Loading bookings…
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "1.5rem", color: "var(--color-text-muted)" }}>
                      No bookings in the database yet.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b, i) => {
                    const status = STATUS_STYLE[b.status] ?? {
                      label: b.status.replaceAll("_", " "),
                      className: "badge badge-neutral",
                    };
                    return (
                      <tr
                        key={b.id}
                        className="table-row"
                        style={{ backgroundColor: i % 2 === 0 ? "#fff" : "var(--color-surface)" }}
                      >
                        <td
                          style={{
                            padding: "0.875rem 1rem",
                            borderBottom: "1px solid var(--color-border-soft)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Link
                            href="/dashboard/crm/bookings"
                            style={{ fontWeight: 600, color: "var(--color-mocha)", fontSize: "0.8125rem" }}
                          >
                            {b.bookingCode}
                          </Link>
                        </td>
                        <td
                          style={{
                            padding: "0.875rem 1rem",
                            borderBottom: "1px solid var(--color-border-soft)",
                            fontWeight: 500,
                          }}
                        >
                          {b.customer?.fullName ?? "—"}
                        </td>
                        <td
                          style={{
                            padding: "0.875rem 1rem",
                            borderBottom: "1px solid var(--color-border-soft)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {b.theme?.title ?? "—"}
                        </td>
                        <td
                          style={{
                            padding: "0.875rem 1rem",
                            borderBottom: "1px solid var(--color-border-soft)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatShortDate(b.eventDate)}
                        </td>
                        <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--color-border-soft)" }}>
                          <span className="badge badge-neutral">{b.package?.title ?? "—"}</span>
                        </td>
                        <td
                          style={{
                            padding: "0.875rem 1rem",
                            borderBottom: "1px solid var(--color-border-soft)",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatPaise(b.totalPriceInPaise)}
                        </td>
                        <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--color-border-soft)" }}>
                          <span className={status.className}>{status.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <section className="card" style={{ padding: "1.25rem" }}>
            <h2
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.0625rem",
                fontWeight: 600,
                margin: "0 0 1rem",
              }}
            >
              Quick Actions
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="btn btn-ghost"
                  style={{
                    flexDirection: "column",
                    gap: "0.5rem",
                    padding: "0.875rem 0.5rem",
                    fontSize: "0.75rem",
                    height: "auto",
                    minHeight: 72,
                    borderRadius: "var(--radius-md)",
                    textDecoration: "none",
                    color: "var(--color-charcoal-soft)",
                  }}
                >
                  <span style={{ color: "var(--color-mocha)" }}>
                    <Icon d={a.d} size={22} />
                  </span>
                  {a.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: "1.25rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.0625rem", fontWeight: 600, margin: 0 }}>
                Upcoming Bookings
              </h2>
              <Link
                href="/dashboard/crm/bookings"
                style={{ fontSize: "0.75rem", color: "var(--color-mocha)", fontWeight: 500 }}
              >
                See all →
              </Link>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {loading ? (
                <li style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Loading…</li>
              ) : upcoming.length === 0 ? (
                <li style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                  No upcoming bookings.
                </li>
              ) : (
                upcoming.map((ev) => {
                  const chip = monthChip(ev.eventDate);
                  const status = STATUS_STYLE[ev.status] ?? {
                    label: ev.status,
                    className: "badge badge-neutral",
                  };
                  return (
                    <li
                      key={ev.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.875rem",
                        padding: "0.75rem",
                        borderRadius: "var(--radius-md)",
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border-soft)",
                      }}
                    >
                      <div
                        style={{
                          flexShrink: 0,
                          width: 46,
                          height: 46,
                          borderRadius: "var(--radius-md)",
                          background:
                            "linear-gradient(135deg, var(--color-blush-light) 0%, var(--color-cream) 100%)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid var(--color-blush)",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: "0.9375rem",
                            fontWeight: 600,
                            color: "var(--color-mocha)",
                            lineHeight: 1,
                          }}
                        >
                          {chip.day}
                        </span>
                        <span
                          style={{
                            fontSize: "0.625rem",
                            fontWeight: 600,
                            color: "var(--color-text-muted)",
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          {chip.month}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            color: "var(--color-charcoal)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {ev.customer?.fullName ?? ev.bookingCode}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.125rem" }}>
                          {ev.theme?.title ?? "Celebration"}
                        </div>
                      </div>
                      <span className={status.className} style={{ flexShrink: 0, fontSize: "0.6875rem" }}>
                        {status.label}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
