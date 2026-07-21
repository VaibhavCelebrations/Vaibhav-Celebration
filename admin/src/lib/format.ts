const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/** Renders paise as a formatted ₹ amount. Schema stores money in paise everywhere — never render raw. */
export function formatPaise(paise: number): string {
  return inr.format(paise / 100);
}

/** Renders a whole-rupee number (not paise) as ₹, for the rare display-only value that isn't a Paise field. */
export function formatInr(rupees: number): string {
  return inr.format(rupees);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return dateTimeFmt.format(new Date(iso));
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const diffMin = Math.round(diffMs / 60000);
  if (Math.abs(diffMin) < 1) return "just now";
  if (Math.abs(diffMin) < 60) return diffMin > 0 ? `${diffMin}m ago` : `in ${-diffMin}m`;
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return diffHr > 0 ? `${diffHr}h ago` : `in ${-diffHr}h`;
  const diffDay = Math.round(diffHr / 24);
  return diffDay > 0 ? `${diffDay}d ago` : `in ${-diffDay}d`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
