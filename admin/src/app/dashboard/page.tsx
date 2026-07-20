"use client";

import Link from "next/link";


// ─── Shared Icon primitive ────────────────────────────────────────────────
function Icon({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// ─── Static mock data (will come from APIs once backend ready) ────────────
const STATS = [
  {
    id: "total-bookings",
    label: "Total Bookings",
    value: "128",
    delta: "+12 this month",
    deltaPositive: true,
    icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    accent: "var(--color-mocha)",
    accentBg: "var(--color-blush-light)",
  },
  {
    id: "revenue",
    label: "Revenue (This Month)",
    value: "₹2,34,500",
    delta: "+18% vs last month",
    deltaPositive: true,
    icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    accent: "var(--color-success)",
    accentBg: "var(--color-success-bg)",
  },
  {
    id: "active-leads",
    label: "Active Leads",
    value: "34",
    delta: "8 need follow-up",
    deltaPositive: false,
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    accent: "var(--color-warning)",
    accentBg: "var(--color-warning-bg)",
  },
  {
    id: "upcoming-events",
    label: "Upcoming Events",
    value: "3",
    delta: "Next: Aug 14",
    deltaPositive: true,
    icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
    accent: "var(--color-info)",
    accentBg: "var(--color-info-bg)",
  },
];

const RECENT_BOOKINGS = [
  { id: "BK-1024", customer: "Priya Sharma",    event: "Annaprashan", date: "12 Aug 2026", package: "Luxe", amount: "₹42,000", status: "confirmed" },
  { id: "BK-1023", customer: "Rahul Mehta",     event: "Birthday",    date: "10 Aug 2026", package: "Standard", amount: "₹18,500", status: "pending" },
  { id: "BK-1022", customer: "Anjali Verma",    event: "Baby Shower", date: "08 Aug 2026", package: "Premium", amount: "₹31,000", status: "confirmed" },
  { id: "BK-1021", customer: "Suresh Gupta",    event: "Mundan",      date: "06 Aug 2026", package: "Standard", amount: "₹15,000", status: "completed" },
  { id: "BK-1020", customer: "Meena Iyer",      event: "Godh Bharai", date: "04 Aug 2026", package: "Luxe",     amount: "₹48,000", status: "cancelled" },
];

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "badge badge-success" },
  pending:   { label: "Pending",   className: "badge badge-warning"  },
  completed: { label: "Completed", className: "badge badge-neutral"  },
  cancelled: { label: "Cancelled", className: "badge badge-error"    },
};

const UPCOMING_EVENTS = [
  { name: "Rajput Annaprashan",  date: "Aug 12",  guests: 80,  status: "confirmed" },
  { name: "Mehta Birthday Bash", date: "Aug 10",  guests: 45,  status: "pending"   },
  { name: "Sharma Baby Shower",  date: "Aug 08",  guests: 60,  status: "confirmed" },
];

const QUICK_ACTIONS = [
  { label: "New Booking",   href: "/bookings/new",   d: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" },
  { label: "Add Theme",     href: "/themes/new",     d: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
  { label: "Upload Gallery",href: "/gallery",        d: "M15 8h.01M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm7 12-3.5-4.5 2.5-3L11 13l3-4 4 5H6" },
  { label: "New Event",     href: "/events/new",     d: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2" },
];

// ─── Dashboard Page ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>

      {/* ── Welcome header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="ornament" style={{ marginBottom: "0.75rem" }}>
          Vaibhav Celebrations
        </div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.875rem", fontWeight: 600, color: "var(--color-charcoal)", margin: 0 }}>
          {greeting}, Admin
        </h1>
        <p style={{ marginTop: "0.375rem", fontSize: "0.9375rem", color: "var(--color-text-muted)" }}>
          Here&apos;s what&apos;s happening with Vaibhav Celebrations today.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {STATS.map((s) => (
          <article key={s.id} className="card" style={{ padding: "1.375rem 1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
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
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <span>{s.deltaPositive ? "↑" : "●"}</span>
              {s.delta}
            </div>
          </article>
        ))}
      </div>

      {/* ── Main grid: Bookings table + right rail ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem", marginBottom: "2rem" }}>

        {/* Recent Bookings */}
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
              href="/bookings"
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
                  {["Booking ID", "Customer", "Event", "Date", "Package", "Amount", "Status"].map((h) => (
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
                {RECENT_BOOKINGS.map((b, i) => (
                  <tr
                    key={b.id}
                    className="table-row"
                    style={{ backgroundColor: i % 2 === 0 ? "#fff" : "var(--color-surface)" }}
                  >
                    <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--color-border-soft)", whiteSpace: "nowrap" }}>
                      <Link href={`/bookings/${b.id}`} style={{ fontWeight: 600, color: "var(--color-mocha)", fontSize: "0.8125rem" }}>
                        {b.id}
                      </Link>
                    </td>
                    <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--color-border-soft)", color: "var(--color-charcoal)", fontWeight: 500 }}>
                      {b.customer}
                    </td>
                    <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--color-border-soft)", color: "var(--color-text-secondary)" }}>
                      {b.event}
                    </td>
                    <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--color-border-soft)", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                      {b.date}
                    </td>
                    <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--color-border-soft)" }}>
                      <span className="badge badge-neutral" style={{ fontFamily: "var(--font-sans)" }}>
                        {b.package}
                      </span>
                    </td>
                    <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--color-border-soft)", fontWeight: 600, color: "var(--color-charcoal)", whiteSpace: "nowrap" }}>
                      {b.amount}
                    </td>
                    <td style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--color-border-soft)" }}>
                      <span className={STATUS_STYLE[b.status].className}>
                        {STATUS_STYLE[b.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Right Rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Quick Actions */}
          <section className="card" style={{ padding: "1.25rem" }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.0625rem", fontWeight: 600, margin: "0 0 1rem" }}>
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

          {/* Upcoming Events */}
          <section className="card" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.0625rem", fontWeight: 600, margin: 0 }}>
                Upcoming Events
              </h2>
              <Link href="/events" style={{ fontSize: "0.75rem", color: "var(--color-mocha)", fontWeight: 500 }}>
                See all →
              </Link>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {UPCOMING_EVENTS.map((ev, i) => (
                <li
                  key={i}
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
                  {/* Date chip */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: 46,
                      height: 46,
                      borderRadius: "var(--radius-md)",
                      background: "linear-gradient(135deg, var(--color-blush-light) 0%, var(--color-cream) 100%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid var(--color-blush)",
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-serif)", fontSize: "0.9375rem", fontWeight: 600, color: "var(--color-mocha)", lineHeight: 1 }}>
                      {ev.date.split(" ")[1]}
                    </span>
                    <span style={{ fontSize: "0.625rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {ev.date.split(" ")[0]}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-charcoal)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {ev.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.125rem" }}>
                      {ev.guests} guests
                    </div>
                  </div>
                  <span className={STATUS_STYLE[ev.status].className} style={{ flexShrink: 0, fontSize: "0.6875rem" }}>
                    {STATUS_STYLE[ev.status].label}
                  </span>
                </li>
              ))}
            </ul>
          </section>

        </div>
      </div>

      {/* ── Activity / Phase 1 checklist reminder ── */}
      <section
        className="card"
        style={{
          padding: "1.375rem 1.5rem",
          background: "linear-gradient(135deg, var(--color-blush-light) 0%, var(--color-cream) 60%, #fff 100%)",
          borderLeft: "4px solid var(--color-mocha)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.375rem", color: "var(--color-mocha-dark)" }}>
              Phase 1 — August Event Gate
            </h2>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)", maxWidth: 520 }}>
              CMS & Event screens need to be live before the August event. Complete Admin layout skeleton, Minimal Event CMS, and Theme quick-edit screens.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>
            <Link href="/events" className="btn btn-primary" style={{ fontSize: "0.8125rem", padding: "0.5rem 1rem", height: 38, minHeight: 38 }}>
              Go to Events
            </Link>
            <Link href="/themes" className="btn btn-secondary" style={{ fontSize: "0.8125rem", padding: "0.5rem 1rem", height: 38, minHeight: 38 }}>
              Themes
            </Link>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.375rem" }}>
            <span>Foundation progress</span>
            <span style={{ fontWeight: 600, color: "var(--color-mocha)" }}>20%</span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: "999px",
              background: "var(--color-blush)",
              overflow: "hidden",
            }}
            role="progressbar"
            aria-valuenow={20}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Phase 1 progress"
          >
            <div
              style={{
                height: "100%",
                width: "20%",
                borderRadius: "999px",
                background: "linear-gradient(90deg, var(--color-mocha-light), var(--color-mocha))",
                transition: "width 600ms ease",
              }}
            />
          </div>
        </div>
      </section>

    </div>
  );
}
