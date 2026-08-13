"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Gift, ShoppingBag } from "lucide-react";
import { adminFetch } from "@/lib/admin-api-client";

type CalendarOrder = {
  id: string;
  orderCode: string;
  placedAt: string;
  status: string;
  totalInPaise: number;
  customerName: string | null;
  customerPhone: string;
  registryCode: string | null;
  isRegistryOrder: boolean;
  isPackageOrder?: boolean;
  packageTitle?: string | null;
  themeTitle?: string | null;
  kind?: string;
};

type CalendarPackageEvent = {
  id: string;
  orderCode: string;
  eventDate: string;
  customerName: string | null;
  packageTitle: string;
  themeTitle: string | null;
  totalInPaise: number;
};

type CalendarBirthday = {
  id: string;
  registryCode: string;
  title: string;
  occasion: string | null;
  eventDate: string;
  personName: string | null;
  contactPhone: string | null;
};

type CalendarEvent =
  | { kind: "order"; dateKey: string; data: CalendarOrder }
  | { kind: "package"; dateKey: string; data: CalendarPackageEvent }
  | { kind: "birthday"; dateKey: string; data: CalendarBirthday };

type CalendarResponse = {
  view: string;
  from: string;
  to: string;
  orders: CalendarOrder[];
  packageEvents?: CalendarPackageEvent[];
  birthdays: CalendarBirthday[];
};

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

function EventChip({ event }: { event: CalendarEvent }) {
  if (event.kind === "order") {
    const order = event.data;
    return (
      <div
        className="rounded px-1.5 py-0.5 text-[11px] font-medium border-l-2 truncate bg-sky-50 text-sky-900 border-sky-500"
        title={`Order ${order.orderCode} · ₹${(order.totalInPaise / 100).toFixed(0)}`}
      >
        {order.isRegistryOrder ? "🎁 " : order.isPackageOrder ? "🎉 " : ""}
        {order.orderCode}
      </div>
    );
  }
  if (event.kind === "package") {
    const pkg = event.data;
    return (
      <div
        className="rounded px-1.5 py-0.5 text-[11px] font-medium border-l-2 truncate bg-amber-50 text-amber-900 border-amber-500"
        title={`${pkg.packageTitle}${pkg.themeTitle ? ` · ${pkg.themeTitle}` : ""}`}
      >
        🎉 {pkg.packageTitle}
      </div>
    );
  }
  const birthday = event.data;
  return (
    <div
      className="rounded px-1.5 py-0.5 text-[11px] font-medium border-l-2 truncate bg-rose-50 text-rose-900 border-rose-500"
      title={`${birthday.title}${birthday.occasion ? ` · ${birthday.occasion}` : ""}`}
    >
      🎂 {birthday.personName ?? birthday.title}
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  if (event.kind === "order") {
    const order = event.data;
    return (
      <div className="rounded-lg border-l-4 border-sky-500 bg-sky-50 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-sky-900">
          <ShoppingBag size={14} /> {order.orderCode}
          {order.isRegistryOrder && <span className="text-xs font-normal">Registry gift</span>}
          {order.isPackageOrder && <span className="text-xs font-normal">Package</span>}
        </div>
        <p className="mt-1 text-xs text-sky-800">{order.customerName ?? "Customer"} · ₹{(order.totalInPaise / 100).toFixed(2)}</p>
        {order.registryCode && <p className="text-xs text-sky-700">Registry: {order.registryCode}</p>}
        {order.packageTitle && (
          <p className="text-xs text-sky-700">
            {order.themeTitle ? `${order.themeTitle} — ` : ""}
            {order.packageTitle}
          </p>
        )}
      </div>
    );
  }
  if (event.kind === "package") {
    const pkg = event.data;
    return (
      <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
          Celebration · {pkg.orderCode}
        </div>
        <p className="mt-1 text-xs text-amber-800">
          {pkg.customerName ?? "Customer"} · {pkg.themeTitle ? `${pkg.themeTitle} — ` : ""}
          {pkg.packageTitle}
        </p>
        <p className="text-xs text-amber-700">₹{(pkg.totalInPaise / 100).toFixed(2)}</p>
      </div>
    );
  }
  const birthday = event.data;
  return (
    <div className="rounded-lg border-l-4 border-rose-500 bg-rose-50 p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-rose-900">
        <Gift size={14} /> {birthday.title}
      </div>
      <p className="mt-1 text-xs text-rose-800">
        {birthday.personName ?? "Celebration"} {birthday.occasion ? `· ${birthday.occasion}` : ""}
      </p>
      <p className="text-xs text-rose-700">Registry {birthday.registryCode}</p>
    </div>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const today = useMemo(() => new Date(), []);

  const fetchCalendar = useCallback(async () => {
    const dateStr = toDateKey(cursor);
    setLoading(true);
    try {
      const data = await adminFetch<CalendarResponse>(`/admin/calendar?view=${view}&date=${dateStr}`);
      const mapped: CalendarEvent[] = [
        ...data.orders.map((order) => ({
          kind: "order" as const,
          dateKey: order.placedAt.split("T")[0]!,
          data: order,
        })),
        ...(data.packageEvents ?? []).map((pkg) => ({
          kind: "package" as const,
          dateKey: pkg.eventDate.split("T")[0]!,
          data: pkg,
        })),
        ...data.birthdays.map((birthday) => ({
          kind: "birthday" as const,
          dateKey: birthday.eventDate.split("T")[0]!,
          data: birthday,
        })),
      ];
      setEvents(mapped);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [cursor, view]);

  useEffect(() => {
    void fetchCalendar();
  }, [fetchCalendar]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.dateKey) ?? [];
      list.push(event);
      map.set(event.dateKey, list);
    }
    return map;
  }, [events]);

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
      <div className="flex flex-col shrink-0 gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-(--color-mocha)">CRM</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-(--color-charcoal)">Calendar</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            Paid shop orders and gift registry celebration dates at a glance.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button type="button" onClick={navigatePrev} aria-label="Previous" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-(--color-surface)">
            <ChevronLeft size={20} />
          </button>
          <button type="button" onClick={navigateNext} aria-label="Next" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-(--color-surface)">
            <ChevronRight size={20} />
          </button>
          <h2 className="ml-2 font-serif text-lg font-medium text-(--color-charcoal) whitespace-nowrap">{headerLabel}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={goToday} className="cursor-pointer rounded-lg border border-(--color-border) bg-white px-3 py-1.5 text-sm font-medium">
            Today
          </button>
          <div className="flex rounded-lg border border-(--color-border) bg-(--color-surface) p-0.5">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`cursor-pointer rounded-md px-3.5 py-1.5 text-sm font-medium capitalize ${view === v ? "bg-(--color-mocha) text-white" : "text-(--color-text-muted)"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-4 text-xs font-medium text-(--color-text-muted)">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Paid order</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Registry birthday / event</span>
      </div>

      {loading && (
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-(--color-border) bg-white px-4 py-3 text-sm text-(--color-text-muted)">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--color-mocha) border-t-transparent" />
          Loading calendar…
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        {view === "month" && (
          <MonthView cursor={cursor} today={today} eventsByDate={eventsByDate} onDateClick={jumpToDate} selectedDate={selectedDate} />
        )}
        {view === "week" && (
          <WeekView cursor={cursor} today={today} eventsByDate={eventsByDate} onDateClick={(d) => { setCursor(d); setView("day"); }} />
        )}
        {view === "day" && <DayView cursor={cursor} today={today} eventsByDate={eventsByDate} />}
      </div>
    </div>
  );
}

function MonthView({
  cursor,
  today,
  eventsByDate,
  onDateClick,
  selectedDate,
}: {
  cursor: Date;
  today: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
  onDateClick: (d: Date) => void;
  selectedDate: Date | null;
}) {
  const cells = useMemo(() => getMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const totalRows = Math.ceil(cells.length / 7);

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-xl border border-(--color-border) bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-(--color-border) bg-(--color-surface) shrink-0">
        {WEEKDAYS_SHORT.map((day) => (
          <div key={day} className="py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-(--color-text-muted)">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 flex-1 min-h-0" style={{ gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))` }}>
        {cells.map((cell, i) => {
          const key = toDateKey(cell.date);
          const dayEvents = eventsByDate.get(key) ?? [];
          const isToday = isSameDay(cell.date, today);
          const isSelected = selectedDate ? isSameDay(cell.date, selectedDate) : false;
          const row = Math.floor(i / 7);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDateClick(cell.date)}
              className={`flex flex-col min-h-0 border-r border-b border-(--color-border) p-2 text-left hover:bg-(--color-surface)/60 cursor-pointer ${!cell.isCurrentMonth ? "bg-(--color-surface)/30" : "bg-white"} ${i % 7 === 6 ? "border-r-0" : ""} ${row === totalRows - 1 ? "border-b-0" : ""} ${isSelected ? "ring-2 ring-inset ring-(--color-mocha)/40" : ""}`}
            >
              <div className="flex shrink-0 items-start justify-between">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${isToday ? "bg-(--color-mocha) text-white" : cell.isCurrentMonth ? "text-(--color-charcoal)" : "text-(--color-text-muted)/50"}`}>
                  {cell.date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="rounded-full bg-(--color-mocha)/10 px-1.5 py-0.5 text-[10px] font-semibold text-(--color-mocha)">{dayEvents.length}</span>
                )}
              </div>
              <div className="mt-1 flex-1 min-h-0 overflow-y-auto space-y-1">
                {dayEvents.map((event) => (
                  <EventChip key={`${event.kind}-${event.kind === "order" ? event.data.id : event.data.id}`} event={event} />
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
  eventsByDate,
  onDateClick,
}: {
  cursor: Date;
  today: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
  onDateClick: (d: Date) => void;
}) {
  const weekDays = useMemo(() => getWeekDays(cursor), [cursor]);
  return (
    <div className="rounded-xl border border-(--color-border) bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-(--color-border) bg-(--color-surface)">
        {weekDays.map((d, i) => (
          <div key={i} className="px-2 py-3 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-(--color-text-muted)">{WEEKDAYS_SHORT[i]}</p>
            <button type="button" onClick={() => onDateClick(d)} className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold cursor-pointer ${isSameDay(d, today) ? "bg-(--color-mocha) text-white" : "text-(--color-charcoal) hover:bg-(--color-surface-alt)"}`}>
              {d.getDate()}
            </button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-(--color-border)">
        {weekDays.map((d, i) => {
          const events = eventsByDate.get(toDateKey(d)) ?? [];
          return (
            <div key={i} className="min-h-64 p-2 space-y-2">
              {events.length === 0 ? <p className="py-8 text-center text-xs text-(--color-text-muted)/50">—</p> : events.map((event) => <EventChip key={`${event.kind}-${event.data.id}`} event={event} />)}
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
  eventsByDate,
}: {
  cursor: Date;
  today: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
}) {
  const key = toDateKey(cursor);
  const dayEvents = eventsByDate.get(key) ?? [];
  const isToday = isSameDay(cursor, today);

  return (
    <div className="rounded-xl border border-(--color-border) bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 border-b border-(--color-border) bg-(--color-surface) px-5 py-4">
        <span className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${isToday ? "bg-(--color-mocha) text-white" : "bg-white text-(--color-charcoal) border border-(--color-border)"}`}>
          {cursor.getDate()}
        </span>
        <div>
          <p className="text-base font-semibold text-(--color-charcoal)">{WEEKDAYS_FULL[cursor.getDay()]}</p>
          <p className="text-sm text-(--color-text-muted)">
            {cursor.toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}
            {isToday && <span className="ml-2 rounded-full bg-(--color-mocha)/10 px-2 py-0.5 text-[10px] font-semibold text-(--color-mocha)">Today</span>}
          </p>
        </div>
        <div className="ml-auto">
          <span className="rounded-lg bg-(--color-surface-alt) px-3 py-1.5 text-sm font-medium text-(--color-charcoal)">
            {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="p-5">
        {dayEvents.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarIcon size={40} className="text-(--color-text-muted)/30" />
            <p className="text-sm font-medium text-(--color-text-muted)">Nothing scheduled for this date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map((event) => (
              <EventCard key={`${event.kind}-${event.data.id}`} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
