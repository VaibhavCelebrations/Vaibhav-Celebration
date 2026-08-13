import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.google.com",
  "kubernetes.default.svc",
]);

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

export function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const normalized = ip.toLowerCase();
    return (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80") ||
      normalized.startsWith("::ffff:127.") ||
      normalized.startsWith("::ffff:10.") ||
      normalized.startsWith("::ffff:192.168.") ||
      normalized.includes("::ffff:169.254.")
    );
  }
  const n = ipv4ToInt(ip);
  return (
    (n >= ipv4ToInt("10.0.0.0") && n <= ipv4ToInt("10.255.255.255")) ||
    (n >= ipv4ToInt("172.16.0.0") && n <= ipv4ToInt("172.31.255.255")) ||
    (n >= ipv4ToInt("192.168.0.0") && n <= ipv4ToInt("192.168.255.255")) ||
    (n >= ipv4ToInt("127.0.0.0") && n <= ipv4ToInt("127.255.255.255")) ||
    (n >= ipv4ToInt("169.254.0.0") && n <= ipv4ToInt("169.254.255.255")) ||
    (n >= ipv4ToInt("0.0.0.0") && n <= ipv4ToInt("0.255.255.255")) ||
    (n >= ipv4ToInt("100.64.0.0") && n <= ipv4ToInt("100.127.255.255")) ||
    (n >= ipv4ToInt("224.0.0.0") && n <= ipv4ToInt("255.255.255.255"))
  );
}

export function normalizeHttpUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("Enter a valid product URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http and https URLs are supported");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URLs with credentials are not allowed");
  }
  parsed.hash = "";
  return parsed;
}

export async function assertSafePublicUrl(raw: string): Promise<URL> {
  const url = normalizeHttpUrl(raw);
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) {
    throw new Error("That URL cannot be fetched");
  }
  if (isIP(host) && isPrivateIp(host)) {
    throw new Error("That URL cannot be fetched");
  }
  const resolved = await lookup(host, { all: true, verbatim: true });
  if (!resolved.length) throw new Error("Could not resolve that website");
  for (const record of resolved) {
    if (isPrivateIp(record.address)) {
      throw new Error("That URL cannot be fetched");
    }
  }
  return url;
}

export function resolveMaybeRelativeUrl(value: string | undefined, base: URL): string | null {
  if (!value) return null;
  try {
    const resolved = new URL(value.trim(), base);
    if (resolved.protocol !== "https:" && resolved.protocol !== "http:") return null;
    return resolved.toString();
  } catch {
    return null;
  }
}
