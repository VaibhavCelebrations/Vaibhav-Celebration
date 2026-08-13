import { createHash } from "node:crypto";
import { ExtractionStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ValidationError } from "../../lib/errors";
import { storeMediaBuffer } from "../../integrations/media/storage";
import {
  isLikelyLogoOrSprite,
  looksLikeRetailBotWall,
  parsePriceToPaise,
  parseProductHtml,
  titleFromProductUrl,
} from "./html-metadata";
import { assertSafePublicUrl, resolveMaybeRelativeUrl } from "./url-safety";

const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 3_500_000;
const MAX_REDIRECTS = 5;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const IMAGE_MAX_BYTES = 8_000_000;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
/** Amazon serves a bot-check page to generic browsers; preview crawlers get real OG tags. */
const PREVIEW_USER_AGENTS = [
  "WhatsApp/2.23.24.0",
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Twitterbot/1.0",
];

export type ExtractedProduct = {
  title: string | null;
  description: string | null;
  image: string | null;
  priceInPaise: number | null;
  currency: string | null;
  storeName: string | null;
  canonicalUrl: string | null;
  sourceUrl: string;
  extractionMethod: string | null;
  extractionStatus: ExtractionStatus;
  extractionError: string | null;
  cached: boolean;
};

function urlHash(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

function toResult(
  row: {
    title: string | null;
    description: string | null;
    image: string | null;
    priceInPaise: number | null;
    currency: string | null;
    storeName: string | null;
    canonicalUrl: string | null;
    sourceUrl: string;
    extractionMethod: string | null;
    extractionStatus: ExtractionStatus;
    extractionError: string | null;
  },
  cached: boolean,
): ExtractedProduct {
  return { ...row, cached };
}

async function readLimitedBody(res: Response, maxBytes: number, tooLargeMessage: string): Promise<Buffer> {
  const length = Number(res.headers.get("content-length") ?? "0");
  if (length > maxBytes) throw new ValidationError(tooLargeMessage);
  const reader = res.body?.getReader();
  if (!reader) throw new ValidationError("Could not read the product page");
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new ValidationError(tooLargeMessage);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function fetchHtmlWithUa(start: URL, userAgent: string): Promise<{ html: string; finalUrl: URL }> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertSafePublicUrl(current.toString());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-IN,en;q=0.9",
          "User-Agent": userAgent,
        },
      });
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new ValidationError(aborted ? "That website took too long to respond" : "Could not reach that website");
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) throw new ValidationError("The website redirected without a destination");
      current = new URL(location, current);
      continue;
    }

    if (!res.ok) {
      if ([401, 403, 429, 503].includes(res.status)) {
        const html = (await readLimitedBody(res, MAX_BYTES, "The product page is too large to process")).toString("utf8");
        return { html, finalUrl: current };
      }
      throw new ValidationError(`The website returned ${res.status}`);
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (contentType && !contentType.includes("html") && !contentType.includes("xml") && !contentType.includes("text/")) {
      throw new ValidationError("That URL does not look like a product page");
    }
    const html = (await readLimitedBody(res, MAX_BYTES, "The product page is too large to process")).toString("utf8");
    return { html, finalUrl: current };
  }
  throw new ValidationError("Too many redirects from that URL");
}

function htmlLooksUsable(html: string): boolean {
  if (looksLikeRetailBotWall(html)) return false;
  return html.includes("og:image") || html.includes("application/ld+json") || html.length > 20_000;
}

async function fetchHtml(start: URL): Promise<{ html: string; finalUrl: URL }> {
  let firstError: unknown;
  try {
    const first = await fetchHtmlWithUa(start, BROWSER_UA);
    if (htmlLooksUsable(first.html)) return first;
    for (const ua of PREVIEW_USER_AGENTS) {
      try {
        const next = await fetchHtmlWithUa(start, ua);
        if (htmlLooksUsable(next.html)) return next;
      } catch {
        continue;
      }
    }
    return first;
  } catch (err) {
    firstError = err;
  }
  for (const ua of PREVIEW_USER_AGENTS) {
    try {
      const next = await fetchHtmlWithUa(start, ua);
      if (htmlLooksUsable(next.html)) return next;
    } catch {
      continue;
    }
  }
  throw firstError instanceof Error ? firstError : new ValidationError("Could not reach that website");
}

function hostnameStoreName(url: URL): string {
  const host = url.hostname.replace(/^www\./, "");
  const name = host.split(".")[0] ?? host;
  return name.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

async function rehostProductImage(imageUrl: string, pageUrl: URL): Promise<string | null> {
  let target: URL;
  try {
    target = await assertSafePublicUrl(imageUrl);
  } catch {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(target, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": BROWSER_UA,
        Referer: `${pageUrl.origin}/`,
      },
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.startsWith("image/")) return null;
    const buffer = await readLimitedBody(res, IMAGE_MAX_BYTES, "The product image is too large to process");
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : contentType.includes("gif")
          ? "gif"
          : "jpg";
    const stored = await storeMediaBuffer({
      buffer,
      originalName: `registry-product.${ext}`,
      mimeType: contentType.split(";")[0] ?? "image/jpeg",
      kind: "products",
      scope: "registry",
      role: "external",
    });
    return stored.url;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function cacheIsUsable(cached: {
  image: string | null;
  title: string | null;
  extractedAt: Date;
}): boolean {
  if (Date.now() - cached.extractedAt.getTime() >= CACHE_TTL_MS) return false;
  if (!cached.image) return false;
  if (isLikelyLogoOrSprite(cached.image)) return false;
  if (/^amazon(\.in)?$/i.test((cached.title ?? "").trim())) return false;
  return true;
}

export async function extractExternalProduct(rawUrl: string, options?: { force?: boolean }): Promise<ExtractedProduct> {
  let source: URL;
  try {
    source = await assertSafePublicUrl(rawUrl);
  } catch (err) {
    throw new ValidationError(err instanceof Error ? err.message : "Invalid URL");
  }

  const hash = urlHash(source.toString());
  if (!options?.force) {
    const cached = await prisma.externalProductExtraction.findUnique({ where: { urlHash: hash } });
    if (cached && cacheIsUsable(cached)) {
      return toResult(cached, true);
    }
  }

  try {
    const { html, finalUrl } = await fetchHtml(source);
    if (looksLikeRetailBotWall(html)) {
      const slugTitle = titleFromProductUrl(source.toString());
      const payload = {
        urlHash: hash,
        sourceUrl: source.toString(),
        title: slugTitle,
        description: null as string | null,
        image: null as string | null,
        priceInPaise: null as number | null,
        storeName: hostnameStoreName(source),
        canonicalUrl: source.toString(),
        extractionMethod: slugTitle ? "url:slug" : null,
        extractionStatus: slugTitle ? ExtractionStatus.PARTIAL : ExtractionStatus.FAILED,
        extractionError:
          "This store blocked automatic product photos. Open the product page, copy the image address, and paste it below.",
        extractedAt: new Date(),
      };
      const saved = await prisma.externalProductExtraction.upsert({
        where: { urlHash: hash },
        create: { ...payload, rawMeta: { blocked: true } as never },
        update: { ...payload, rawMeta: { blocked: true } as never },
      });
      return toResult(saved, false);
    }
    const parsed = parseProductHtml(html, finalUrl.toString());
    const remoteImage = resolveMaybeRelativeUrl(parsed.image ?? undefined, finalUrl);
    const hosted = remoteImage ? await rehostProductImage(remoteImage, finalUrl) : null;
    const image = hosted ?? remoteImage;
    const hasCore = Boolean(parsed.title || image);
    const status: ExtractionStatus = hasCore
      ? parsed.price
        ? ExtractionStatus.SUCCESS
        : ExtractionStatus.PARTIAL
      : ExtractionStatus.FAILED;

    const payload = {
      urlHash: hash,
      sourceUrl: source.toString(),
      title: parsed.title,
      description: parsed.description,
      image,
      priceInPaise: parsePriceToPaise(parsed.price, parsed.currency),
      currency: parsed.currency ?? "INR",
      storeName: parsed.storeName,
      canonicalUrl: parsed.canonicalUrl,
      extractionMethod: parsed.extractionMethod,
      extractionStatus: status,
      extractionError: status === ExtractionStatus.FAILED ? "No product title or image was found" : null,
      extractedAt: new Date(),
    };

    const saved = await prisma.externalProductExtraction.upsert({
      where: { urlHash: hash },
      create: { ...payload, rawMeta: parsed as never },
      update: { ...payload, rawMeta: parsed as never },
    });
    return toResult(saved, false);
  } catch (err) {
    const message = err instanceof ValidationError ? err.message : "We couldn't automatically retrieve this product information. You can add the product details manually.";
    const failed = await prisma.externalProductExtraction.upsert({
      where: { urlHash: hash },
      create: {
        urlHash: hash,
        sourceUrl: source.toString(),
        extractionStatus: ExtractionStatus.FAILED,
        extractionError: message,
        extractedAt: new Date(),
      },
      update: {
        extractionStatus: ExtractionStatus.FAILED,
        extractionError: message,
        extractedAt: new Date(),
      },
    });
    if (err instanceof ValidationError) {
      return toResult(failed, false);
    }
    return toResult(
      {
        ...failed,
        extractionError: message,
      },
      false,
    );
  }
}
