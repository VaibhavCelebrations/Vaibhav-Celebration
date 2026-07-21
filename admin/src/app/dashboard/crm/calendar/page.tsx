"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

type Event = {
  id: string;
  title: string;
  type: "booking" | "consultation" | "internal";
  date: string;
  time: string;
};

const EVENT_STYLE: Record<Event["type"], { border: string; bg: string; text: string; dot: string }> = {
  booking:      { border: "var(--color-mocha)", bg: "var(--color-blush-light)", text: "var(--color-mocha-dark)", dot: "var(--color-mocha)" },
  consultation: { border: "var(--color-info)",  bg: "var(--color-info-bg)",     text: "var(--color-info)",       dot: "var(--color-info)" },
  internal:     { border: "var(--color-text-muted)", bg: "var(--color-cream)",  text: "var(--color-charcoal-soft)", dot: "var(--color-text-muted)" },
};

const MOCK_EVENTS: Event[] = [
  { id: "1", title: "Wedding: Sharma Family", type: "booking", date: "2026-10-15", time: "10:00 AM" },
  { id: "2", title: "Venue Tour", type: "consultation", date: "2026-10-15", time: "2:00 PM" },
  { id: "3", title: "Catering Tasting", type: "consultation", date: "2026-10-18", time: "1:00 PM" },
  { id: "4", title: "Team Sync", type: "internal", date: "2026-10-20", time: "9:00 AM" },
  { id: "5", title: "Sangeet: Patel Wedding", type: "booking", date: "2026-10-25", time: "6:00 PM" },
];

export default function CalendarPage() {
  const [view, setView] = useState<"month" | "week" | "day">("month");

  // A basic 35-day grid for Oct 2026 as a mockup
  const days = Array.from({ length: 35 }).map((_, i) => {
    const dayNum = i - 3; // Offset to start Oct 1 on Thursday
    const isCurrentMonth = dayNum >= 1 && dayNum <= 31;
    const dateStr = `2026-10-${String(dayNum).padStart(2, "0")}`;
    const dayEvents = MOCK_EVENTS.filter((e) => e.date === dateStr);
    
    return {
      num: isCurrentMonth ? dayNum : dayNum < 1 ? 30 + dayNum : dayNum - 31,
      isCurrentMonth,
      isToday: dayNum === 15, // Mock today as Oct 15
      events: dayEvents,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-(--color-charcoal)">Calendar</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">Manage bookings, consultations, and team schedules.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggles */}
          <div className="flex rounded-md border border-(--color-border) bg-white p-1 shadow-sm">
            {(["month", "week", "day"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`cursor-pointer px-4 py-1.5 text-sm font-medium capitalize rounded transition-colors ${
                  view === v
                    ? "bg-(--color-mocha) text-white"
                    : "text-(--color-text-muted) hover:text-(--color-charcoal) hover:bg-(--color-surface)"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button className="flex cursor-pointer items-center gap-2 rounded-md bg-(--color-mocha) px-4 py-2.5 text-sm font-medium text-white shadow-(--shadow-mocha) hover:bg-(--color-mocha-dark) transition-all">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Event</span>
          </button>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between rounded-xl border border-(--color-border) bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <h2 className="font-serif text-xl font-medium text-(--color-charcoal)">October 2026</h2>
          <div className="flex items-center gap-1">
            <button aria-label="Previous month" className="cursor-pointer p-1.5 text-(--color-text-muted) hover:bg-(--color-surface) hover:text-(--color-mocha) rounded-md transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button aria-label="Next month" className="cursor-pointer p-1.5 text-(--color-text-muted) hover:bg-(--color-surface) hover:text-(--color-mocha) rounded-md transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <button className="cursor-pointer text-sm font-medium text-(--color-mocha) hover:text-(--color-mocha-dark) px-3 py-1.5 rounded-md border border-transparent hover:border-(--color-mocha) transition-all">
          Today
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-(--color-text-muted)">
        {(
          [
            { type: "booking", label: "Booking" },
            { type: "consultation", label: "Consultation" },
            { type: "internal", label: "Internal" },
          ] as const
        ).map((l) => (
          <span key={l.type} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: EVENT_STYLE[l.type].dot }}
              aria-hidden="true"
            />
            {l.label}
          </span>
        ))}
      </div>

      {/* Calendar Grid (Month View) */}
      <div className="flex-1 rounded-xl border border-(--color-border) bg-white shadow-sm overflow-hidden flex flex-col min-h-150">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-(--color-border) bg-(--color-surface)">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-(--color-text-muted)">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1">
          {days.map((day, i) => (
            <div
              key={i}
              className={`min-h-30 border-b border-r border-(--color-border) p-2 transition-colors hover:bg-surface/50 ${
                !day.isCurrentMonth ? "bg-surface/30 opacity-60" : ""
              } ${i % 7 === 6 ? "border-r-0" : ""} ${i >= 28 ? "border-b-0" : ""}`}
            >
              <div className="flex justify-between items-start">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                  day.isToday
                    ? "bg-(--color-mocha) text-white shadow-(--shadow-mocha)"
                    : day.isCurrentMonth
                      ? "text-(--color-charcoal)"
                      : "text-(--color-text-muted)"
                }`}>
                  {day.num}
                </span>
              </div>

              {/* Events list */}
              <div className="mt-2 space-y-1.5">
                {day.events.map((event) => (
                  <div
                    key={event.id}
                    className="group cursor-pointer rounded px-2 py-1 text-xs font-medium border-l-2 transition-shadow hover:shadow-sm"
                    style={{
                      borderColor: EVENT_STYLE[event.type].border,
                      backgroundColor: EVENT_STYLE[event.type].bg,
                      color: EVENT_STYLE[event.type].text,
                    }}
                    title={`${event.time} - ${event.title}`}
                  >
                    <div className="truncate">{event.title}</div>
                    <div className="text-[10px] opacity-80 mt-0.5">{event.time}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

