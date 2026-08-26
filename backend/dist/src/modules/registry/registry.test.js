"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const html_metadata_1 = require("./html-metadata");
const url_safety_1 = require("./url-safety");
const registry_qty_1 = require("./registry-qty");
const OG_HTML = `
<html><head>
<meta property="og:title" content="KitchenAid Mixer">
<meta property="og:image" content="https://cdn.example.com/mixer.jpg">
<meta property="og:description" content="A stand mixer">
<meta property="og:site_name" content="Example Store">
</head><body></body></html>`;
const TWITTER_HTML = `
<html><head>
<meta name="twitter:title" content="Twitter Product">
<meta name="twitter:image" content="https://cdn.example.com/tw.jpg">
<title>Fallback</title>
</head></html>`;
const JSONLD_HTML = `
<html><head><title>Page</title>
<script type="application/ld+json">
{"@type":"Product","name":"JSON-LD Lamp","image":"https://cdn.example.com/lamp.jpg","offers":{"@type":"Offer","price":"2499.00","priceCurrency":"INR"}}
</script>
</head></html>`;
(0, vitest_1.describe)("parseProductHtml", () => {
    (0, vitest_1.it)("prefers Open Graph metadata", () => {
        const parsed = (0, html_metadata_1.parseProductHtml)(OG_HTML, "https://example.com/p/1");
        (0, vitest_1.expect)(parsed.title).toBe("KitchenAid Mixer");
        (0, vitest_1.expect)(parsed.image).toBe("https://cdn.example.com/mixer.jpg");
        (0, vitest_1.expect)(parsed.storeName).toBe("Example Store");
        (0, vitest_1.expect)(parsed.extractionMethod).toContain("og:image");
    });
    (0, vitest_1.it)("falls back to twitter:image", () => {
        const parsed = (0, html_metadata_1.parseProductHtml)(TWITTER_HTML, "https://shop.test/item");
        (0, vitest_1.expect)(parsed.title).toBe("Twitter Product");
        (0, vitest_1.expect)(parsed.image).toBe("https://cdn.example.com/tw.jpg");
        (0, vitest_1.expect)(parsed.extractionMethod).toContain("twitter:image");
    });
    (0, vitest_1.it)("reads JSON-LD Product schema including price", () => {
        const parsed = (0, html_metadata_1.parseProductHtml)(JSONLD_HTML, "https://shop.test/lamp");
        (0, vitest_1.expect)(parsed.title).toBe("JSON-LD Lamp");
        (0, vitest_1.expect)(parsed.image).toBe("https://cdn.example.com/lamp.jpg");
        (0, vitest_1.expect)(parsed.price).toBe("2499.00");
        (0, vitest_1.expect)(parsed.currency).toBe("INR");
        (0, vitest_1.expect)((0, html_metadata_1.parsePriceToPaise)(parsed.price, parsed.currency)).toBe(249900);
    });
    (0, vitest_1.it)("does not crash on empty html", () => {
        const parsed = (0, html_metadata_1.parseProductHtml)("<html></html>", "https://example.com");
        (0, vitest_1.expect)(parsed.title).toBeNull();
        (0, vitest_1.expect)(parsed.image).toBeNull();
    });
    (0, vitest_1.it)("ignores Amazon logo Open Graph and uses the product landing image", () => {
        const html = `
<html><head>
<meta property="og:title" content="LEGO Classic Bricks">
<meta property="og:image" content="https://m.media-amazon.com/images/G/01/social_share/amazon_logo_white.png">
<meta property="og:site_name" content="Amazon.in">
</head><body>
<img id="landingImage" src="https://m.media-amazon.com/images/I/81abcPRODUCT._AC_SL1500_.jpg" data-old-hires="https://m.media-amazon.com/images/I/81abcPRODUCT._AC_SL1500_.jpg" />
<img src="https://m.media-amazon.com/images/G/31/gno/sprites/nav-sprite-global-1x.png" alt="Amazon" />
</body></html>`;
        const parsed = (0, html_metadata_1.parseProductHtml)(html, "https://www.amazon.in/dp/B0EXAMPLE");
        (0, vitest_1.expect)(parsed.image).toBe("https://m.media-amazon.com/images/I/81abcPRODUCT._AC_SL1500_.jpg");
        (0, vitest_1.expect)(parsed.image).not.toContain("/images/G/");
    });
    (0, vitest_1.it)("cleans Amazon overlay Open Graph URLs into a product photo", () => {
        const html = `
<html><head>
<meta property="og:title" content="Apple iPhone 13">
<meta property="og:image" content="https://m.media-amazon.com/images/I/71xb2xkN5qL.jpg_BO30,255,255,255_UF750,750_SR1910,1000,0,C_QL100_.jpg">
</head>
<body>
<link rel="stylesheet" href="https://m.media-amazon.com/images/I/21b2CPPFLqL._RC|51nfWTBkewL.css_.css" />
</body></html>`;
        const parsed = (0, html_metadata_1.parseProductHtml)(html, "https://www.amazon.in/dp/B09G9BL5CP");
        (0, vitest_1.expect)(parsed.image).toBe("https://m.media-amazon.com/images/I/71xb2xkN5qL._AC_SL1500_.jpg");
    });
    (0, vitest_1.it)("upscales Flipkart thumbnail Open Graph images", () => {
        const html = `
<html><head>
<meta property="og:title" content="Apple iPhone 15">
<meta property="og:image" content="https://rukminim2.flixcart.com/image/300/300/xif0q/mobile/h/d/9/-original-imagtc2qzgnnuhxh.jpeg">
</head></html>`;
        const parsed = (0, html_metadata_1.parseProductHtml)(html, "https://www.flipkart.com/apple-iphone-15/p/itm6ac6485515ae4");
        (0, vitest_1.expect)(parsed.image).toBe("https://rukminim2.flixcart.com/image/832/832/xif0q/mobile/h/d/9/-original-imagtc2qzgnnuhxh.jpeg");
    });
    (0, vitest_1.it)("ignores Flipkart promo template images", () => {
        const html = `
<html><head>
<meta property="og:title" content="Apple iPhone 15">
<meta property="og:image" content="https://rukminim2.flixcart.com/image/300/300/xif0q/mobile/h/d/9/-original-imagtc2qzgnnuhxh.jpeg">
</head>
<script>{"imageUrl":"https://rukminim1.flixcart.com/www/{@width}/{@height}/promos/31/10/2016/f7634981.png?q={@quality}"}</script>
</html>`;
        const parsed = (0, html_metadata_1.parseProductHtml)(html, "https://www.flipkart.com/apple-iphone-15/p/itm6ac6485515ae4");
        (0, vitest_1.expect)(parsed.image).toBe("https://rukminim2.flixcart.com/image/832/832/xif0q/mobile/h/d/9/-original-imagtc2qzgnnuhxh.jpeg");
    });
    (0, vitest_1.it)("decodes JSON unicode escapes in Flipkart image URLs", () => {
        (0, vitest_1.expect)((0, html_metadata_1.normalizeRetailImageUrl)("https:\\u002F\\u002Frukminim2.flixcart.com\\u002Fimage\\u002F300\\u002F300\\u002Fmixer.jpeg")).toBe("https://rukminim2.flixcart.com/image/832/832/mixer.jpeg");
    });
    (0, vitest_1.it)("reads a Meesho product title from the URL slug when HTML is blocked", () => {
        (0, vitest_1.expect)((0, html_metadata_1.titleFromProductUrl)("https://www.meesho.com/rain-coat-for-mens-womens-waterproof-reversible-double-layer-with-hood-set-of-top-and-bottom-packed-in-a-storage-bag-2-way-both-side-wearable/p/ozsgf")).toBe("Rain Coat For Mens Womens Waterproof Reversible Double Layer With Hood Set Of Top And Bottom Packed In A Storage Bag 2 Way Both Side Wearable");
    });
    (0, vitest_1.it)("upscales Meesho thumbnail image URLs", () => {
        (0, vitest_1.expect)((0, html_metadata_1.normalizeRetailImageUrl)("https://images.meesho.com/images/products/325828959/mqpvo_512.jpg")).toBe("https://images.meesho.com/images/products/325828959/mqpvo_1200.jpg");
    });
});
(0, vitest_1.describe)("url safety", () => {
    (0, vitest_1.it)("rejects non-http protocols", () => {
        (0, vitest_1.expect)(() => (0, url_safety_1.normalizeHttpUrl)("file:///etc/passwd")).toThrow();
        (0, vitest_1.expect)(() => (0, url_safety_1.normalizeHttpUrl)("ftp://example.com")).toThrow();
    });
    (0, vitest_1.it)("flags private IPs", () => {
        (0, vitest_1.expect)((0, url_safety_1.isPrivateIp)("127.0.0.1")).toBe(true);
        (0, vitest_1.expect)((0, url_safety_1.isPrivateIp)("10.0.0.8")).toBe(true);
        (0, vitest_1.expect)((0, url_safety_1.isPrivateIp)("192.168.1.1")).toBe(true);
        (0, vitest_1.expect)((0, url_safety_1.isPrivateIp)("169.254.169.254")).toBe(true);
        (0, vitest_1.expect)((0, url_safety_1.isPrivateIp)("8.8.8.8")).toBe(false);
    });
});
(0, vitest_1.describe)("registry quantities", () => {
    (0, vitest_1.it)("computes remaining and availability without trusting the frontend", () => {
        const item = { quantityDesired: 3, quantityPurchased: 1, quantityReserved: 1 };
        (0, vitest_1.expect)((0, registry_qty_1.remainingQuantity)(item)).toBe(2);
        (0, vitest_1.expect)((0, registry_qty_1.availableToReserve)(item)).toBe(1);
        (0, vitest_1.expect)((0, registry_qty_1.derivedItemStatus)(item)).toBe("PARTIALLY_PURCHASED");
    });
    (0, vitest_1.it)("marks fully purchased when purchased meets desired", () => {
        (0, vitest_1.expect)((0, registry_qty_1.derivedItemStatus)({ quantityDesired: 2, quantityPurchased: 2 })).toBe("PURCHASED");
    });
});
//# sourceMappingURL=registry.test.js.map