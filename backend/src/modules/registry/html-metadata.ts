export type ParsedProductMeta = {
  title: string | null;
  description: string | null;
  image: string | null;
  price: string | null;
  currency: string | null;
  storeName: string | null;
  canonicalUrl: string | null;
  extractionMethod: string | null;
};

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .trim();
}

function attr(tag: string, name: string): string | null {
  const match =
    tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i")) ??
    tag.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i"));
  return match?.[1] ? decodeEntities(match[1]) : null;
}

function collectMeta(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const property = (attr(tag, "property") ?? attr(tag, "name") ?? attr(tag, "itemprop") ?? "").toLowerCase();
    const content = attr(tag, "content");
    if (property && content && !map.has(property)) map.set(property, content);
  }
  return map;
}

function first(map: Map<string, string>, keys: string[]): string | null {
  for (const key of keys) {
    const value = map.get(key);
    if (value) return value;
  }
  return null;
}

function parseJsonLd(html: string): Partial<ParsedProductMeta> {
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const script of scripts) {
    const raw = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      const parsed = JSON.parse(raw) as unknown;
      const nodes = flattenJsonLd(parsed);
      const product = nodes.find((n) => typeIncludes(n, "Product")) ?? nodes.find((n) => typeIncludes(n, "Offer"));
      if (!product) continue;
      const offer = asRecord(product.offers) ?? (Array.isArray(product.offers) ? asRecord(product.offers[0]) : null);
      const image = firstImage(product.image);
      return {
        title: str(product.name),
        description: str(product.description),
        image,
        price: str(offer?.price ?? offer?.lowPrice ?? product.price),
        currency: str(offer?.priceCurrency ?? product.priceCurrency),
        storeName: str(asRecord(product.brand)?.name) ?? str(product.brand),
      };
    } catch {
      continue;
    }
  }
  return {};
}

function flattenJsonLd(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  const record = asRecord(value);
  if (!record) return [];
  if (record["@graph"]) return flattenJsonLd(record["@graph"]);
  return [record];
}

function typeIncludes(node: Record<string, unknown>, type: string): boolean {
  const raw = node["@type"];
  if (typeof raw === "string") return raw.toLowerCase() === type.toLowerCase();
  if (Array.isArray(raw)) return raw.some((t) => String(t).toLowerCase() === type.toLowerCase());
  return false;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function firstImage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstImage(value[0]);
  const record = asRecord(value);
  return str(record?.url ?? record?.contentUrl);
}

function titleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1] ? decodeEntities(match[1].replace(/\s+/g, " ")) : null;
}

function firstImg(html: string): string | null {
  const match = html.match(/<img\b[^>]*>/i);
  if (!match) return null;
  return attr(match[0], "src") ?? attr(match[0], "data-src") ?? attr(match[0], "data-original");
}

function canonicalLink(html: string): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    if (rel.split(/\s+/).includes("canonical")) return attr(tag, "href");
  }
  return null;
}

export function parseProductHtml(html: string, sourceUrl: string): ParsedProductMeta {
  const meta = collectMeta(html);
  const jsonLd = parseJsonLd(html);
  const methods: string[] = [];

  const title =
    first(meta, ["og:title", "twitter:title", "title"]) ?? jsonLd.title ?? titleTag(html);
  if (first(meta, ["og:title"])) methods.push("og:title");
  else if (jsonLd.title) methods.push("jsonld:name");
  else if (title) methods.push("html:title");

  const description =
    first(meta, ["og:description", "twitter:description", "description"]) ?? jsonLd.description;
  if (first(meta, ["og:description"])) methods.push("og:description");

  const image =
    first(meta, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]) ??
    jsonLd.image ??
    firstImg(html);
  if (first(meta, ["og:image", "og:image:url"])) methods.push("og:image");
  else if (first(meta, ["twitter:image", "twitter:image:src"])) methods.push("twitter:image");
  else if (jsonLd.image) methods.push("jsonld:image");
  else if (image) methods.push("html:img");

  const price =
    first(meta, ["product:price:amount", "og:price:amount"]) ?? jsonLd.price;
  const currency =
    first(meta, ["product:price:currency", "og:price:currency"]) ?? jsonLd.currency;
  if (jsonLd.price || price) methods.push(jsonLd.price ? "jsonld:price" : "meta:price");

  const storeName =
    first(meta, ["og:site_name", "application-name"]) ?? jsonLd.storeName ?? hostnameStore(sourceUrl) ?? null;
  const resolvedStoreName = storeName ? decodeEntities(storeName).slice(0, 80) : null;
  const canonicalUrl = first(meta, ["og:url"]) ?? canonicalLink(html) ?? sourceUrl;

  return {
    title: title ? decodeEntities(title).slice(0, 200) : null,
    description: description ? decodeEntities(description).slice(0, 2000) : null,
    image: image ?? null,
    price: price ?? null,
    currency: currency ? currency.toUpperCase().slice(0, 8) : null,
    storeName: resolvedStoreName,
    canonicalUrl: canonicalUrl ?? sourceUrl,
    extractionMethod: methods.length ? methods.join(",") : null,
  };
}

function hostnameStore(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0]?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? host;
  } catch {
    return null;
  }
}

export function parsePriceToPaise(raw: string | null, currency: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/,/g, "");
  const amount = Number.parseFloat(cleaned);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const zeroDecimal = new Set(["JPY", "KRW"]);
  if (currency && zeroDecimal.has(currency.toUpperCase())) return Math.round(amount);
  return Math.round(amount * 100);
}
