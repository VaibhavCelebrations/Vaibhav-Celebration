import type { ShippingAddress } from "../orders/orders.service";

export function formatAddressText(address: ShippingAddress | null | undefined): string {
  if (!address) return "";
  return [
    address.fullName,
    [address.line1, address.line2].filter(Boolean).join(", "),
    address.city && address.state ? `${address.city}, ${address.state}` : address.city || address.state,
    address.pincode,
    address.country,
  ]
    .map((line) => line?.trim())
    .filter(Boolean)
    .join("\n");
}

export function parseShippingAddress(value: unknown): ShippingAddress | null {
  if (!value || typeof value !== "object") return null;
  const a = value as Record<string, unknown>;
  if (typeof a.fullName !== "string" || typeof a.line1 !== "string") return null;
  return {
    fullName: a.fullName,
    line1: a.line1,
    line2: typeof a.line2 === "string" ? a.line2 : undefined,
    city: String(a.city ?? ""),
    state: String(a.state ?? ""),
    pincode: String(a.pincode ?? ""),
    country: String(a.country ?? "India"),
  };
}
