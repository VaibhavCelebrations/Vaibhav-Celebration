/** India-first E.164 digits: 10-digit local → 91XXXXXXXXXX. Returns null when the input can't be normalized. */
export function normalizeWhatsAppPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}
