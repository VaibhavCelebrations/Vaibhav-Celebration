"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, MapPin } from "lucide-react";
import { adminFetch } from "@/lib/admin-api-client";

type CalendarBooking = {
  id: string;
  bookingCode: string;
  eventDate: string;
  status: string;
  theme: { title: string } | null;
  package: { title: string } | null;
  customer: { fullName: string; phone: string } | null;
};

type CalendarResponse = {
  view: string;
  from: string;
  to: string;
  items: CalendarBooking[];
};

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  SCHEDULED:   { bg: "var(--color-blush-light)", text: "var(--color-mocha-dark)", dot: "var(--color-mocha)", border: "var(--color-mocha)" },
  CONFIRMED:   { bg: "#e0f2fe", text: "#0369a1", dot: "#0284c7", border: "#0284c7" },
  IN_PROGRESS: { bg: "#fef3c7", text: "#92400e", dot: "#d97706", border: "#d97706" },
  COMPLETED:   { bg: "#dcfce7", text: "#166534", dot: "#16a34a", border: "#16a34a" },
  CANCELLED:   { bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af", border: "#9ca3af" },
};

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split("T")[0].split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false });
    }
  }

  return cells;
}

function getWeekDays(cursor: Date) {
  const day = cursor.getDay();
  const start = new Date(cursor);
  start.setDate(cursor.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatMonthYear(d: Date) {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function getStyle(status: string) {
  return STATUS_STYLE[status] ?? STATUS_STYLE.SCHEDULED;
}

function EventCard({ booking, compact }: { booking: CalendarBooking; compact?: boolean }) {
  const style = getStyle(booking.status);

  if (compact) {
    return (
      <div
        className="group cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-medium border-l-2 transition-shadow hover:shadow-sm truncate"
        style={{ borderColor: style.border, backgroundColor: style.bg, color: style.text }}
        title={`${booking.bookingCode} · ${booking.theme?.title ?? "—"} · ${booking.customer?.fullName ?? "—"}`}
      >
        {booking.theme?.title ?? booking.bookingCode}
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border-l-3 p-3 transition-shadow hover:shadow-md cursor-pointer"
      style={{ borderColor: style.border, backgroundColor: style.bg }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: style.text }}>
            {booking.theme?.title ?? "Celebration"}
          </p>
          <p className="text-xs mt-0.5 opacity-80" style={{ color: style.text }}>
            {booking.bookingCode}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ backgroundColor: `${style.dot}20`, color: style.text }}
        >
          {booking.status.replace("_", " ")}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: style.text }}>
        {booking.customer && (
          <span className="flex items-center gap-1 opacity-90">
            <User size={11} /> {booking.customer.fullName}
          </span>
        )}
        {booking.package && (
          <span className="flex items-center gap-1 opacity-90">
            <MapPin size={11} /> {booking.package.title}
          </span>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const today = useMemo(() => new Date(), []);

  const fetchBookings = useCallback(async () => {
    const dateStr = toDateKey(cursor);
    setLoading(true);
    try {
      const data = await adminFetch<CalendarResponse>(
        `/admin/bookings/calendar?view=${view}&date=${dateStr}`,
      );
      setBookings(data.items ?? []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [cursor, view]);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of bookings) {
      const key = b.eventDate.split("T")[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [bookings]);

  const navigatePrev = () => {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(cursor.getMonth() - 1);
    else if (view === "week") next.setDate(cursor.getDate() - 7);
    else next.setDate(cursor.getDate() - 1);
    setCursor(next);
  };

  const navigateNext = () => {
    const next = new Date(cursor);
    if (view === "month") next.setMonth(cursor.getMonth() + 1);
    else if (view === "week") next.setDate(cursor.getDate() + 7);
    else next.setDate(cursor.getDate() + 1);
    setCursor(next);
  };

  const goToday = () => {
    setCursor(new Date());
    setSelectedDate(null);
  };

  const jumpToDate = (d: Date) => {
    setCursor(d);
    setSelectedDate(d);
    if (view === "month") setView("day");
  };

  const headerLabel = useMemo(() => {
    if (view === "month") return formatMonthYear(cursor);
    if (view === "day") {
      return cursor.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    const weekDays = getWeekDays(cursor);
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} – ${end.getDate()} ${formatMonthYear(end)}`;
    }
    return `${start.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`;
  }, [cursor, view]);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="flex flex-col shrink-0 gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-(--color-mocha)">CRM</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-(--color-charcoal)">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            View bookings and events across dates. Click a date to see details.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-white p-3 shadow-sm">
        {/* Nav controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={navigatePrev}
            aria-label="Previous"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-(--color-surface) hover:text-(--color-mocha) transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={navigateNext}
            aria-label="Next"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-(--color-surface) hover:text-(--color-mocha) transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <h2 className="ml-2 font-serif text-lg font-medium text-(--color-charcoal) whitespace-nowrap">
            {headerLabel}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="cursor-pointer rounded-lg border border-(--color-border) bg-white px-3 py-1.5 text-sm font-medium text-(--color-charcoal) hover:bg-(--color-surface) transition-colors"
          >
            Today
          </button>

          {/* View toggle */}
          <div className="flex rounded-lg border border-(--color-border) bg-(--color-surface) p-0.5">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`cursor-pointer rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition-all ${
                  view === v
                    ? "bg-(--color-mocha) text-white shadow-sm"
                    : "text-(--color-text-muted) hover:text-(--color-charcoal)"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex shrink-0 flex-wrap items-center gap-4 text-xs font-medium text-(--color-text-muted)">
        {Object.entries(STATUS_STYLE).map(([status, style]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: style.dot }}
              aria-hidden="true"
            />
            {status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        ))}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-(--color-border) bg-white px-4 py-3 text-sm text-(--color-text-muted)">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--color-mocha) border-t-transparent" />
          Loading bookings…
        </div>
      )}

      {/* Views Container */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Month View */}
        {view === "month" && <MonthView cursor={cursor} today={today} bookingsByDate={bookingsByDate} onDateClick={jumpToDate} selectedDate={selectedDate} />}

        {/* Week View */}
        {view === "week" && <WeekView cursor={cursor} today={today} bookingsByDate={bookingsByDate} onDateClick={(d) => { setCursor(d); setView("day"); }} />}

        {/* Day View */}
        {view === "day" && <DayView cursor={cursor} today={today} bookingsByDate={bookingsByDate} />}
      </div>
    </div>
  );
}

function MonthView({
  cursor,
  today,
  bookingsByDate,
  onDateClick,
  selectedDate,
}: {
  cursor: Date;
  today: Date;
  bookingsByDate: Map<string, CalendarBooking[]>;
  onDateClick: (d: Date) => void;
  selectedDate: Date | null;
}) {
  const cells = useMemo(
    () => getMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );
  const totalRows = Math.ceil(cells.length / 7);

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-xl border border-(--color-border) bg-white shadow-sm overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-(--color-border) bg-(--color-surface) shrink-0">
        {WEEKDAYS_SHORT.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-(--color-text-muted)"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1 min-h-0" style={{ gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))` }}>
        {cells.map((cell, i) => {
          const key = toDateKey(cell.date);
          const events = bookingsByDate.get(key) ?? [];
          const isToday = isSameDay(cell.date, today);
          const isSelected = selectedDate ? isSameDay(cell.date, selectedDate) : false;
          const row = Math.floor(i / 7);

          return (
            <button
              key={i}
              type="button"
              onClick={() => onDateClick(cell.date)}
              className={`flex flex-col min-h-0 border-r border-b border-(--color-border) p-2 text-left transition-colors hover:bg-(--color-surface)/60 cursor-pointer ${
                !cell.isCurrentMonth ? "bg-(--color-surface)/30" : "bg-white"
              } ${i % 7 === 6 ? "border-r-0" : ""} ${row === totalRows - 1 ? "border-b-0" : ""} ${
                isSelected ? "ring-2 ring-inset ring-(--color-mocha)/40" : ""
              }`}
            >
              <div className="flex shrink-0 items-start justify-between">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isToday
                      ? "bg-(--color-mocha) text-white"
                      : cell.isCurrentMonth
                        ? "text-(--color-charcoal) hover:bg-(--color-surface-alt)"
                        : "text-(--color-text-muted)/50"
                  }`}
                >
                  {cell.date.getDate()}
                </span>
                {events.length > 0 && (
                  <span className="rounded-full bg-(--color-mocha)/10 px-1.5 py-0.5 text-[10px] font-semibold text-(--color-mocha)">
                    {events.length}
                  </span>
                )}
              </div>

              <div className="mt-1 flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {events.map((b) => (
                  <EventCard key={b.id} booking={b} compact />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  cursor,
  today,
  bookingsByDate,
  onDateClick,
}: {
  cursor: Date;
  today: Date;
  bookingsByDate: Map<string, CalendarBooking[]>;
  onDateClick: (d: Date) => void;
}) {
  const weekDays = useMemo(() => getWeekDays(cursor), [cursor]);

  return (
    <div className="rounded-xl border border-(--color-border) bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b border-(--color-border) bg-(--color-surface)">
        {weekDays.map((d, i) => {
          const isToday = isSameDay(d, today);
          return (
            <div key={i} className="px-2 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-(--color-text-muted)">
                {WEEKDAYS_SHORT[i]}
              </p>
              <button
                type="button"
                onClick={() => onDateClick(d)}
                className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                  isToday
                    ? "bg-(--color-mocha) text-white"
                    : "text-(--color-charcoal) hover:bg-(--color-surface-alt)"
                }`}
              >
                {d.getDate()}
              </button>
            </div>
          );
        })}
      </div>

      {/* Event columns */}
      <div className="grid grid-cols-7 divide-x divide-(--color-border)">
        {weekDays.map((d, i) => {
          const key = toDateKey(d);
          const events = bookingsByDate.get(key) ?? [];
          return (
            <div key={i} className="min-h-64 p-2 space-y-2">
              {events.length === 0 ? (
                <p className="py-8 text-center text-xs text-(--color-text-muted)/50">—</p>
              ) : (
                events.map((b) => <EventCard key={b.id} booking={b} compact />)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({
  cursor,
  today,
  bookingsByDate,
}: {
  cursor: Date;
  today: Date;
  bookingsByDate: Map<string, CalendarBooking[]>;
}) {
  const key = toDateKey(cursor);
  const events = bookingsByDate.get(key) ?? [];
  const isToday = isSameDay(cursor, today);

  return (
    <div className="rounded-xl border border-(--color-border) bg-white shadow-sm overflow-hidden">
      {/* Day header */}
      <div className="flex items-center gap-3 border-b border-(--color-border) bg-(--color-surface) px-5 py-4">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
            isToday ? "bg-(--color-mocha) text-white" : "bg-white text-(--color-charcoal) border border-(--color-border)"
          }`}
        >
          {cursor.getDate()}
        </span>
        <div>
          <p className="text-base font-semibold text-(--color-charcoal)">
            {WEEKDAYS_FULL[cursor.getDay()]}
          </p>
          <p className="text-sm text-(--color-text-muted)">
            {cursor.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
            {isToday && <span className="ml-2 rounded-full bg-(--color-mocha)/10 px-2 py-0.5 text-[10px] font-semibold text-(--color-mocha)">Today</span>}
          </p>
        </div>
        <div className="ml-auto">
          <span className="rounded-lg bg-(--color-surface-alt) px-3 py-1.5 text-sm font-medium text-(--color-charcoal)">
            {events.length} booking{events.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Events list */}
      <div className="p-5">
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarIcon size={40} className="text-(--color-text-muted)/30" />
            <p className="text-sm font-medium text-(--color-text-muted)">No bookings on this date</p>
            <p className="text-xs text-(--color-text-muted)/70">
              Bookings will appear here once guests schedule events for this date.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-(--color-border) p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-(--color-charcoal)">
                        {b.theme?.title ?? "Celebration"}
                      </h3>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: getStyle(b.status).bg,
                          color: getStyle(b.status).text,
                          border: `1px solid ${getStyle(b.status).border}`,
                        }}
                      >
                        {b.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-mono text-(--color-text-muted)">
                      {b.bookingCode}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {b.customer && (
                    <div className="flex items-center gap-2 text-sm text-(--color-charcoal)">
                      <User size={14} className="text-(--color-text-muted)" />
                      <span>{b.customer.fullName}</span>
                    </div>
                  )}
                  {b.customer?.phone && (
                    <div className="flex items-center gap-2 text-sm text-(--color-charcoal)">
                      <Clock size={14} className="text-(--color-text-muted)" />
                      <span>{b.customer.phone}</span>
                    </div>
                  )}
                  {b.package && (
                    <div className="flex items-center gap-2 text-sm text-(--color-charcoal)">
                      <MapPin size={14} className="text-(--color-text-muted)" />
                      <span>{b.package.title}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
