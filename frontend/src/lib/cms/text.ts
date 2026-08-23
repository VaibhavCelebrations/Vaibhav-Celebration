/** Coerce CMS JSON values into renderable strings so `{}` never reaches React. */
export function asText(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    for (const key of ["text", "value", "label", "html", "title", "name"]) {
      const nested = rec[key];
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
  }
  return fallback;
}

export function asTextList(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((item) => asText(item)).filter(Boolean);
  return items.length ? items : fallback;
}
