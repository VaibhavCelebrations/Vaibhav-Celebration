import { createHash } from "node:crypto";
import { ExtractionStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ValidationError } from "../../lib/errors";
import { parsePriceToPaise, parseProductHtml } from "./html-metadata";
import { assertSafePublicUrl, resolveMaybeRelativeUrl } from "./url-safety";

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 3;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const USER_AGENT =
  "VaibhavCelebrationsBot/1.0 (+https://vaibhavcelebrations.in; gift-registry metadata)";

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

async function fetchHtml(start: URL): Promise<{ html: string; finalUrl: URL }> {
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
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "User-Agent": USER_AGENT,
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
      throw new ValidationError(`The website returned ${res.status}`);
    }

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (contentType && !contentType.includes("html") && !contentType.includes("xml") && !contentType.includes("text/")) {
      throw new ValidationError("That URL does not look like a product page");
    }
    const length = Number(res.headers.get("content-length") ?? "0");
    if (length > MAX_BYTES) throw new ValidationError("The product page is too large to process");

    const reader = res.body?.getReader();
    if (!reader) throw new ValidationError("Could not read the product page");
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BYTES) {
        await reader.cancel();
        throw new ValidationError("The product page is too large to process");
      }
      chunks.push(value);
    }
    const html = Buffer.concat(chunks).toString("utf8");
    return { html, finalUrl: current };
  }
  throw new ValidationError("Too many redirects from that URL");
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
    if (cached && Date.now() - cached.extractedAt.getTime() < CACHE_TTL_MS) {
      return toResult(cached, true);
    }
  }

  try {
    const { html, finalUrl } = await fetchHtml(source);
    const parsed = parseProductHtml(html, finalUrl.toString());
    const image = resolveMaybeRelativeUrl(parsed.image ?? undefined, finalUrl);
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
