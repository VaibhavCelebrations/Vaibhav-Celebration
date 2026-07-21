/**
 * Calendar-grid date math for the Booking Calendar (spec §6.5). Native
 * Date + Intl only — no date-fns; see the build plan §E for why.
 *
 * IMPORTANT: date keys are always derived from local Y/M/D, never
 * toISOString() — that converts to UTC and shifts the day for IST
 * (+05:30) users.
 */

export type DateKey = string; // "YYYY-MM-DD", local calendar day

export type CalendarCell = {
  date: Date;
  key: DateKey;
  inMonth: boolean;
  isToday: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function addWeeks(d: Date, n: number): Date {
  return addDays(d, n * 7);
}

export function addMonths(d: Date, n: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + n);
  return next;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/** @param weekStartsOn 0 = Sunday (default), 1 = Monday */
export function startOfWeek(d: Date, weekStartsOn = 0): Date {
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  return addDays(startOfDay(d), -diff);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

/** Always 42 cells (6 rows × 7 days) — a fixed 35-cell grid overflows any 31-day month starting Fri/Sat. */
export function buildMonthGrid(anchor: Date, weekStartsOn = 0): CalendarCell[] {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, weekStartsOn);
  const today = new Date();
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    cells.push({
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === anchor.getMonth(),
      isToday: isSameDay(date, today),
    });
  }
  return cells;
}

export function buildWeekDays(anchor: Date, weekStartsOn = 0): Date[] {
  const start = startOfWeek(anchor, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function buildDayHours(from = 8, to = 22): number[] {
  const hours: number[] = [];
  for (let h = from; h <= to; h++) hours.push(h);
  return hours;
}

const monthYearFmt = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const dayLabelFmt = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const weekRangeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

export function formatMonthYear(d: Date): string {
  return monthYearFmt.format(d);
}

export function formatDayLabel(d: Date): string {
  return dayLabelFmt.format(d);
}

export function formatWeekRange(a: Date, b: Date): string {
  const sameYear = a.getFullYear() === b.getFullYear();
  return `${weekRangeFmt.format(a)} – ${weekRangeFmt.format(b)}${sameYear ? `, ${b.getFullYear()}` : ""}`;
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}
