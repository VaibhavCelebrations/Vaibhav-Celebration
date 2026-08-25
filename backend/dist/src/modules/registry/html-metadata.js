"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLikelyLogoOrSprite = isLikelyLogoOrSprite;
exports.normalizeRetailImageUrl = normalizeRetailImageUrl;
exports.looksLikeRetailBotWall = looksLikeRetailBotWall;
exports.titleFromProductUrl = titleFromProductUrl;
exports.scoreProductImage = scoreProductImage;
exports.parseProductHtml = parseProductHtml;
exports.parsePriceToPaise = parsePriceToPaise;
function decodeEntities(value) {
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
function attr(tag, name) {
    const match = tag.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i")) ??
        tag.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i"));
    return match?.[1] ? decodeEntities(match[1]) : null;
}
function collectMeta(html) {
    const map = new Map();
    const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
    for (const tag of tags) {
        const property = (attr(tag, "property") ?? attr(tag, "name") ?? attr(tag, "itemprop") ?? "").toLowerCase();
        const content = attr(tag, "content");
        if (!property || !content)
            continue;
        const list = map.get(property) ?? [];
        list.push(content);
        map.set(property, list);
    }
    return map;
}
function first(map, keys) {
    for (const key of keys) {
        const value = map.get(key)?.[0];
        if (value)
            return value;
    }
    return null;
}
function all(map, keys) {
    const out = [];
    for (const key of keys) {
        for (const value of map.get(key) ?? [])
            out.push(value);
    }
    return out;
}
function isLikelyLogoOrSprite(url) {
    const u = url.toLowerCase();
    return (/logo|wordmark|brandmark|favicon|apple-touch|sprite|nav-sprite|site-icon|og[-_]?logo/.test(u) ||
        /amazon[-_]?logo|flipkart[-_]?logo|myntra[-_]?logo|meesho[-_]?logo/.test(u) ||
        /\/logos?\//.test(u) ||
        /\/images\/g\//.test(u) ||
        /\.(css|js)(\?|$)/.test(u) ||
        /_rc\|/.test(u) ||
        /icon[-_]?(16|32|48|64|96|128|192)/.test(u) ||
        /(?:^|[\/_-])(16x16|32x32|48x48|64x64|96x96)(?:[\/._-]|$)/.test(u) ||
        /1x1|pixel\.gif|tracking|fls-na|assoc-amazon/.test(u) ||
        /placeholder|default[-_]image|no[-_]image/.test(u) ||
        /\{@|%7b@/.test(u) ||
        /\/promos\//.test(u) ||
        /flixcart\.com\/www\//.test(u));
}
/** Amazon/Flipkart overlay and thumbnail URLs → a stable product photo URL. */
function normalizeRetailImageUrl(url) {
    const raw = url
        .trim()
        .replace(/&amp;/gi, "&")
        .replace(/\\u002[fF]/g, "/")
        .replace(/\\u003[aA]/g, ":")
        .replace(/\\u0026/g, "&")
        .replace(/\\\//g, "/");
    const amazon = raw.match(/https?:\/\/(?:[\w.-]+\.)?(?:media-amazon\.com|ssl-images-amazon\.com)\/images\/I\/([^/?#]+)/i);
    if (amazon?.[1]) {
        const file = decodeURIComponent(amazon[1]);
        if (/\.(css|js)(_|\?|$)/i.test(file) || file.includes("_RC|"))
            return raw;
        const id = file.match(/^([A-Za-z0-9+-]+)/)?.[1];
        if (id && id.length >= 8) {
            return `https://m.media-amazon.com/images/I/${id}._AC_SL1500_.jpg`;
        }
    }
    const flipkart = raw.match(/^(https?:\/\/rukminim?\d*\.flixcart\.com)\/image\/\d+\/\d+\/(.+)$/i);
    if (flipkart)
        return `${flipkart[1]}/image/832/832/${flipkart[2]}`;
    const meesho = raw.match(/^(https?:\/\/images\.meesho\.com\/images\/products\/\d+\/[A-Za-z0-9]+)_(?:12[68]|256|512)(\.(?:jpe?g|webp))$/i);
    if (meesho)
        return `${meesho[1]}_1200${meesho[2]}`;
    return raw;
}
function looksLikeRetailBotWall(html) {
    const lower = html.toLowerCase();
    return (html.includes("Click the button below to continue shopping") ||
        html.includes("To discuss automated access to Amazon") ||
        html.includes("Correios.DoNotSend") ||
        lower.includes("sec-if-cpt-container") ||
        /<title[^>]*>\s*access denied/i.test(html) ||
        /<title[^>]*>\s*just a moment/i.test(html));
}
/** Product title from an SEO slug when the store hides HTML from bots (Meesho, etc.). */
function titleFromProductUrl(url) {
    try {
        const parts = new URL(url).pathname.split("/").filter(Boolean);
        const marker = parts.findIndex((part) => ["p", "dp", "product", "products", "itm"].includes(part.toLowerCase()));
        const slug = marker > 0 ? parts[marker - 1] : parts[0];
        if (!slug || slug.length < 12)
            return null;
        if (/^[a-z0-9]+$/i.test(slug) && slug.length < 16)
            return null;
        const titled = slug
            .replace(/[-_]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .replace(/\b\w/g, (char) => char.toUpperCase());
        return titled.slice(0, 200) || null;
    }
    catch {
        return null;
    }
}
function looksLikeProductCdn(url) {
    const u = url.toLowerCase();
    if (/\/images\/g\//.test(u))
        return false;
    return (/media-amazon\.com\/images\/i\//.test(u) ||
        /ssl-images-amazon[^/]*\/images\/i\//.test(u) ||
        /rukminim?\d*\.flixcart\.com/.test(u) ||
        /static-assets-web\.flixcart\.com\/.*\/(image|prod)/.test(u) ||
        /assets\.myntassets\.com/.test(u) ||
        /images\.meesho\.com/.test(u) ||
        /nimbus-cdn\.furlenco|cdn\.shopify\.com/.test(u) ||
        /images\.unsplash\.com|img\.tatacliq\.com|cdn\.fcglcdn\.com/.test(u) ||
        /images\.meesho\.com\/images\/products\//.test(u) ||
        /(?:static\d*\.)?lenskart\.com/.test(u) ||
        /cdn\.reliancedigital\.in|www\.reliancedigital\.in\/.*\.(jpe?g|png|webp)/.test(u) ||
        /cdn\.zeptonow\.com|zeptonow\.s3|grofers\.com/.test(u) ||
        /\/products?\//.test(u) ||
        /\/p\/|\/catalog\/|\/item\//.test(u));
}
function scoreProductImage(url, source) {
    let score = 0;
    const sourceBoost = {
        "jsonld:image": 55,
        "amazon:hiRes": 70,
        "amazon:landing": 65,
        "amazon:dynamic": 60,
        "json:imageUrl": 18,
        "og:image": 25,
        "twitter:image": 20,
        "html:product-img": 35,
        "html:img": 5,
    };
    score += sourceBoost[source] ?? 10;
    if (isLikelyLogoOrSprite(url))
        score -= 100;
    if (looksLikeProductCdn(url))
        score += 40;
    if (/_AC_SL|_AC_UL|_SX\d|_SY\d|_SL\d{3,}/i.test(url))
        score += 20;
    if (/\.(jpe?g|png|webp)(\?|$)/i.test(url))
        score += 8;
    if (/\.svg(\?|$)/i.test(url))
        score -= 25;
    if (/\.gif(\?|$)/i.test(url))
        score -= 15;
    if (/[?&]w=(1\d|2\d|3\d|4\d|5\d|6\d|7\d|8\d)\b/.test(url))
        score -= 20;
    return score;
}
function pickBestImage(candidates) {
    const seen = new Set();
    let best = null;
    for (const candidate of candidates) {
        const url = normalizeRetailImageUrl(candidate.url);
        if (!url || seen.has(url))
            continue;
        seen.add(url);
        const score = scoreProductImage(url, candidate.source);
        if (!best || score > best.score)
            best = { url, source: candidate.source, score };
    }
    if (!best || best.score < 0)
        return null;
    return { url: best.url, source: best.source };
}
function parseJsonLd(html) {
    const images = [];
    const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
    let title = null;
    let description = null;
    let price = null;
    let currency = null;
    let storeName = null;
    for (const script of scripts) {
        const raw = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
        try {
            const parsed = JSON.parse(raw);
            const nodes = flattenJsonLd(parsed);
            const product = nodes.find((n) => typeIncludes(n, "Product"));
            if (!product)
                continue;
            const offer = asRecord(product.offers) ?? (Array.isArray(product.offers) ? asRecord(product.offers[0]) : null);
            title = title ?? str(product.name);
            description = description ?? str(product.description);
            price = price ?? str(offer?.price ?? offer?.lowPrice ?? product.price);
            currency = currency ?? str(offer?.priceCurrency ?? product.priceCurrency);
            storeName = storeName ?? str(asRecord(product.brand)?.name) ?? str(product.brand);
            for (const image of collectJsonLdImages(product.image)) {
                images.push({ url: image, source: "jsonld:image" });
            }
        }
        catch {
            continue;
        }
    }
    return { title, description, image: images[0]?.url ?? null, price, currency, storeName, images };
}
function collectJsonLdImages(value) {
    if (!value)
        return [];
    if (typeof value === "string")
        return [value];
    if (Array.isArray(value))
        return value.flatMap(collectJsonLdImages);
    const record = asRecord(value);
    const url = str(record?.url ?? record?.contentUrl);
    return url ? [url] : [];
}
function flattenJsonLd(value) {
    if (Array.isArray(value))
        return value.flatMap(flattenJsonLd);
    const record = asRecord(value);
    if (!record)
        return [];
    if (record["@graph"])
        return flattenJsonLd(record["@graph"]);
    return [record];
}
function typeIncludes(node, type) {
    const raw = node["@type"];
    if (typeof raw === "string")
        return raw.toLowerCase() === type.toLowerCase();
    if (Array.isArray(raw))
        return raw.some((t) => String(t).toLowerCase() === type.toLowerCase());
    return false;
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function str(value) {
    if (typeof value === "string" && value.trim())
        return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
        return String(value);
    return null;
}
function titleTag(html) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match?.[1] ? decodeEntities(match[1].replace(/\s+/g, " ")) : null;
}
function amazonAndRetailImages(html) {
    const found = [];
    const landing = html.match(/<img\b[^>]*\bid=["']landingImage["'][^>]*>/i);
    if (landing) {
        const hiRes = attr(landing[0], "data-old-hires") ?? attr(landing[0], "data-a-hires");
        if (hiRes)
            found.push({ url: hiRes, source: "amazon:landing" });
        const src = attr(landing[0], "src");
        if (src)
            found.push({ url: src, source: "amazon:landing" });
        const dynamic = attr(landing[0], "data-a-dynamic-image");
        if (dynamic) {
            try {
                const parsed = JSON.parse(dynamic);
                for (const url of Object.keys(parsed))
                    found.push({ url, source: "amazon:dynamic" });
            }
            catch {
                /* ignore */
            }
        }
    }
    for (const match of html.matchAll(/"(?:hiRes|large|mainUrl|imageUrl|imgUrl)"\s*:\s*"(https?:[^"]+)"/gi)) {
        if (!match[1])
            continue;
        const url = match[1].replace(/\\u002[fF]/gi, "/").replace(/\\\//g, "/");
        const source = /media-amazon|ssl-images-amazon/i.test(url) ? "amazon:hiRes" : "json:imageUrl";
        found.push({ url, source });
    }
    const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
    for (const tag of imgs) {
        const id = (attr(tag, "id") ?? "").toLowerCase();
        const cls = (attr(tag, "class") ?? "").toLowerCase();
        const src = attr(tag, "data-old-hires") ??
            attr(tag, "data-zoom-image") ??
            attr(tag, "data-src") ??
            attr(tag, "data-original") ??
            attr(tag, "src");
        if (!src)
            continue;
        const productHint = /landing|product|gallery|pdp|main-image|hero/.test(`${id} ${cls}`) || looksLikeProductCdn(src);
        if (productHint)
            found.push({ url: src, source: "html:product-img" });
    }
    return found;
}
function genericImgs(html) {
    const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
    return imgs.slice(0, 40).flatMap((tag) => {
        const src = attr(tag, "src") ?? attr(tag, "data-src") ?? attr(tag, "data-original");
        return src ? [{ url: src, source: "html:img" }] : [];
    });
}
function canonicalLink(html) {
    const tags = html.match(/<link\b[^>]*>/gi) ?? [];
    for (const tag of tags) {
        const rel = (attr(tag, "rel") ?? "").toLowerCase();
        if (rel.split(/\s+/).includes("canonical"))
            return attr(tag, "href");
    }
    return null;
}
function parseProductHtml(html, sourceUrl) {
    const meta = collectMeta(html);
    const jsonLd = parseJsonLd(html);
    const methods = [];
    const title = first(meta, ["og:title", "twitter:title", "title"]) ?? jsonLd.title ?? titleTag(html);
    if (first(meta, ["og:title"]))
        methods.push("og:title");
    else if (jsonLd.title)
        methods.push("jsonld:name");
    else if (title)
        methods.push("html:title");
    const description = first(meta, ["og:description", "twitter:description", "description"]) ?? jsonLd.description;
    if (first(meta, ["og:description"]))
        methods.push("og:description");
    const candidates = [
        ...jsonLd.images,
        ...all(meta, ["og:image", "og:image:url", "og:image:secure_url"]).map((url) => ({ url, source: "og:image" })),
        ...all(meta, ["twitter:image", "twitter:image:src"]).map((url) => ({ url, source: "twitter:image" })),
        ...amazonAndRetailImages(html),
        ...genericImgs(html),
    ];
    const best = pickBestImage(candidates);
    if (best)
        methods.push(best.source);
    const price = first(meta, ["product:price:amount", "og:price:amount"]) ?? jsonLd.price;
    const currency = first(meta, ["product:price:currency", "og:price:currency"]) ?? jsonLd.currency;
    if (jsonLd.price || price)
        methods.push(jsonLd.price ? "jsonld:price" : "meta:price");
    const storeName = first(meta, ["og:site_name", "application-name"]) ?? jsonLd.storeName ?? hostnameStore(sourceUrl) ?? null;
    const resolvedStoreName = storeName ? decodeEntities(storeName).slice(0, 80) : null;
    const canonicalUrl = first(meta, ["og:url"]) ?? canonicalLink(html) ?? sourceUrl;
    return {
        title: title ? decodeEntities(title).slice(0, 200) : null,
        description: description ? decodeEntities(description).slice(0, 2000) : null,
        image: best?.url ?? null,
        price: price ?? null,
        currency: currency ? currency.toUpperCase().slice(0, 8) : null,
        storeName: resolvedStoreName,
        canonicalUrl: canonicalUrl ?? sourceUrl,
        extractionMethod: methods.length ? methods.join(",") : null,
    };
}
function hostnameStore(url) {
    try {
        const host = new URL(url).hostname.replace(/^www\./, "");
        return host.split(".")[0]?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? host;
    }
    catch {
        return null;
    }
}
function parsePriceToPaise(raw, currency) {
    if (!raw)
        return null;
    const cleaned = raw.replace(/[^\d.,]/g, "").replace(/,/g, "");
    const amount = Number.parseFloat(cleaned);
    if (!Number.isFinite(amount) || amount <= 0)
        return null;
    const zeroDecimal = new Set(["JPY", "KRW"]);
    if (currency && zeroDecimal.has(currency.toUpperCase()))
        return Math.round(amount);
    return Math.round(amount * 100);
}
//# sourceMappingURL=html-metadata.js.map