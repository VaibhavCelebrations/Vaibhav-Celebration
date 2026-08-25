"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractExternalProduct = extractExternalProduct;
const node_crypto_1 = require("node:crypto");
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const storage_1 = require("../../integrations/media/storage");
const html_metadata_1 = require("./html-metadata");
const url_safety_1 = require("./url-safety");
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 3_500_000;
const MAX_REDIRECTS = 5;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const IMAGE_MAX_BYTES = 8_000_000;
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
/** Amazon serves a bot-check page to generic browsers; preview crawlers get real OG tags. */
const PREVIEW_USER_AGENTS = [
    "WhatsApp/2.23.24.0",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Twitterbot/1.0",
];
function urlHash(url) {
    return (0, node_crypto_1.createHash)("sha256").update(url).digest("hex");
}
function toResult(row, cached) {
    return { ...row, cached };
}
async function readLimitedBody(res, maxBytes, tooLargeMessage) {
    const length = Number(res.headers.get("content-length") ?? "0");
    if (length > maxBytes)
        throw new errors_1.ValidationError(tooLargeMessage);
    const reader = res.body?.getReader();
    if (!reader)
        throw new errors_1.ValidationError("Could not read the product page");
    const chunks = [];
    let received = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done)
            break;
        received += value.byteLength;
        if (received > maxBytes) {
            await reader.cancel();
            throw new errors_1.ValidationError(tooLargeMessage);
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}
async function fetchHtmlWithUa(start, userAgent) {
    let current = start;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        await (0, url_safety_1.assertSafePublicUrl)(current.toString());
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        let res;
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
        }
        catch (err) {
            const aborted = err instanceof Error && err.name === "AbortError";
            throw new errors_1.ValidationError(aborted ? "That website took too long to respond" : "Could not reach that website");
        }
        finally {
            clearTimeout(timer);
        }
        if ([301, 302, 303, 307, 308].includes(res.status)) {
            const location = res.headers.get("location");
            if (!location)
                throw new errors_1.ValidationError("The website redirected without a destination");
            current = new URL(location, current);
            continue;
        }
        if (!res.ok) {
            if ([401, 403, 429, 503].includes(res.status)) {
                const html = (await readLimitedBody(res, MAX_BYTES, "The product page is too large to process")).toString("utf8");
                return { html, finalUrl: current };
            }
            throw new errors_1.ValidationError(`The website returned ${res.status}`);
        }
        const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
        if (contentType && !contentType.includes("html") && !contentType.includes("xml") && !contentType.includes("text/")) {
            throw new errors_1.ValidationError("That URL does not look like a product page");
        }
        const html = (await readLimitedBody(res, MAX_BYTES, "The product page is too large to process")).toString("utf8");
        return { html, finalUrl: current };
    }
    throw new errors_1.ValidationError("Too many redirects from that URL");
}
function htmlLooksUsable(html) {
    if ((0, html_metadata_1.looksLikeRetailBotWall)(html))
        return false;
    return html.includes("og:image") || html.includes("application/ld+json") || html.length > 20_000;
}
async function fetchHtml(start) {
    let firstError;
    try {
        const first = await fetchHtmlWithUa(start, BROWSER_UA);
        if (htmlLooksUsable(first.html))
            return first;
        for (const ua of PREVIEW_USER_AGENTS) {
            try {
                const next = await fetchHtmlWithUa(start, ua);
                if (htmlLooksUsable(next.html))
                    return next;
            }
            catch {
                continue;
            }
        }
        return first;
    }
    catch (err) {
        firstError = err;
    }
    for (const ua of PREVIEW_USER_AGENTS) {
        try {
            const next = await fetchHtmlWithUa(start, ua);
            if (htmlLooksUsable(next.html))
                return next;
        }
        catch {
            continue;
        }
    }
    throw firstError instanceof Error ? firstError : new errors_1.ValidationError("Could not reach that website");
}
function hostnameStoreName(url) {
    const host = url.hostname.replace(/^www\./, "");
    const name = host.split(".")[0] ?? host;
    return name.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
async function rehostProductImage(imageUrl, pageUrl) {
    let target;
    try {
        target = await (0, url_safety_1.assertSafePublicUrl)(imageUrl);
    }
    catch {
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
        if (!res.ok)
            return null;
        const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
        if (!contentType.startsWith("image/"))
            return null;
        const buffer = await readLimitedBody(res, IMAGE_MAX_BYTES, "The product image is too large to process");
        const ext = contentType.includes("png")
            ? "png"
            : contentType.includes("webp")
                ? "webp"
                : contentType.includes("gif")
                    ? "gif"
                    : "jpg";
        const stored = await (0, storage_1.storeMediaBuffer)({
            buffer,
            originalName: `registry-product.${ext}`,
            mimeType: contentType.split(";")[0] ?? "image/jpeg",
            kind: "products",
            scope: "registry",
            role: "external",
        });
        return stored.url;
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timer);
    }
}
function cacheIsUsable(cached) {
    if (Date.now() - cached.extractedAt.getTime() >= CACHE_TTL_MS)
        return false;
    if (!cached.image)
        return false;
    if ((0, html_metadata_1.isLikelyLogoOrSprite)(cached.image))
        return false;
    if (/^amazon(\.in)?$/i.test((cached.title ?? "").trim()))
        return false;
    return true;
}
async function extractExternalProduct(rawUrl, options) {
    let source;
    try {
        source = await (0, url_safety_1.assertSafePublicUrl)(rawUrl);
    }
    catch (err) {
        throw new errors_1.ValidationError(err instanceof Error ? err.message : "Invalid URL");
    }
    const hash = urlHash(source.toString());
    if (!options?.force) {
        const cached = await prisma_1.prisma.externalProductExtraction.findUnique({ where: { urlHash: hash } });
        if (cached && cacheIsUsable(cached)) {
            return toResult(cached, true);
        }
    }
    try {
        const { html, finalUrl } = await fetchHtml(source);
        if ((0, html_metadata_1.looksLikeRetailBotWall)(html)) {
            const slugTitle = (0, html_metadata_1.titleFromProductUrl)(source.toString());
            const payload = {
                urlHash: hash,
                sourceUrl: source.toString(),
                title: slugTitle,
                description: null,
                image: null,
                priceInPaise: null,
                storeName: hostnameStoreName(source),
                canonicalUrl: source.toString(),
                extractionMethod: slugTitle ? "url:slug" : null,
                extractionStatus: slugTitle ? client_1.ExtractionStatus.PARTIAL : client_1.ExtractionStatus.FAILED,
                extractionError: "This store blocked automatic product photos. Open the product page, copy the image address, and paste it below.",
                extractedAt: new Date(),
            };
            const saved = await prisma_1.prisma.externalProductExtraction.upsert({
                where: { urlHash: hash },
                create: { ...payload, rawMeta: { blocked: true } },
                update: { ...payload, rawMeta: { blocked: true } },
            });
            return toResult(saved, false);
        }
        const parsed = (0, html_metadata_1.parseProductHtml)(html, finalUrl.toString());
        const remoteImage = (0, url_safety_1.resolveMaybeRelativeUrl)(parsed.image ?? undefined, finalUrl);
        const hosted = remoteImage ? await rehostProductImage(remoteImage, finalUrl) : null;
        const image = hosted ?? remoteImage;
        const hasCore = Boolean(parsed.title || image);
        const status = hasCore
            ? parsed.price
                ? client_1.ExtractionStatus.SUCCESS
                : client_1.ExtractionStatus.PARTIAL
            : client_1.ExtractionStatus.FAILED;
        const payload = {
            urlHash: hash,
            sourceUrl: source.toString(),
            title: parsed.title,
            description: parsed.description,
            image,
            priceInPaise: (0, html_metadata_1.parsePriceToPaise)(parsed.price, parsed.currency),
            currency: parsed.currency ?? "INR",
            storeName: parsed.storeName,
            canonicalUrl: parsed.canonicalUrl,
            extractionMethod: parsed.extractionMethod,
            extractionStatus: status,
            extractionError: status === client_1.ExtractionStatus.FAILED ? "No product title or image was found" : null,
            extractedAt: new Date(),
        };
        const saved = await prisma_1.prisma.externalProductExtraction.upsert({
            where: { urlHash: hash },
            create: { ...payload, rawMeta: parsed },
            update: { ...payload, rawMeta: parsed },
        });
        return toResult(saved, false);
    }
    catch (err) {
        const message = err instanceof errors_1.ValidationError ? err.message : "We couldn't automatically retrieve this product information. You can add the product details manually.";
        const failed = await prisma_1.prisma.externalProductExtraction.upsert({
            where: { urlHash: hash },
            create: {
                urlHash: hash,
                sourceUrl: source.toString(),
                extractionStatus: client_1.ExtractionStatus.FAILED,
                extractionError: message,
                extractedAt: new Date(),
            },
            update: {
                extractionStatus: client_1.ExtractionStatus.FAILED,
                extractionError: message,
                extractedAt: new Date(),
            },
        });
        if (err instanceof errors_1.ValidationError) {
            return toResult(failed, false);
        }
        return toResult({
            ...failed,
            extractionError: message,
        }, false);
    }
}
//# sourceMappingURL=extract.service.js.map