import { describe, expect, it } from "vitest";
import { parsePriceToPaise, parseProductHtml, normalizeRetailImageUrl } from "./html-metadata";
import { isPrivateIp, normalizeHttpUrl } from "./url-safety";
import { availableToReserve, derivedItemStatus, remainingQuantity } from "./registry-qty";

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

describe("parseProductHtml", () => {
  it("prefers Open Graph metadata", () => {
    const parsed = parseProductHtml(OG_HTML, "https://example.com/p/1");
    expect(parsed.title).toBe("KitchenAid Mixer");
    expect(parsed.image).toBe("https://cdn.example.com/mixer.jpg");
    expect(parsed.storeName).toBe("Example Store");
    expect(parsed.extractionMethod).toContain("og:image");
  });

  it("falls back to twitter:image", () => {
    const parsed = parseProductHtml(TWITTER_HTML, "https://shop.test/item");
    expect(parsed.title).toBe("Twitter Product");
    expect(parsed.image).toBe("https://cdn.example.com/tw.jpg");
    expect(parsed.extractionMethod).toContain("twitter:image");
  });

  it("reads JSON-LD Product schema including price", () => {
    const parsed = parseProductHtml(JSONLD_HTML, "https://shop.test/lamp");
    expect(parsed.title).toBe("JSON-LD Lamp");
    expect(parsed.image).toBe("https://cdn.example.com/lamp.jpg");
    expect(parsed.price).toBe("2499.00");
    expect(parsed.currency).toBe("INR");
    expect(parsePriceToPaise(parsed.price, parsed.currency)).toBe(249900);
  });

  it("does not crash on empty html", () => {
    const parsed = parseProductHtml("<html></html>", "https://example.com");
    expect(parsed.title).toBeNull();
    expect(parsed.image).toBeNull();
  });

  it("ignores Amazon logo Open Graph and uses the product landing image", () => {
    const html = `
<html><head>
<meta property="og:title" content="LEGO Classic Bricks">
<meta property="og:image" content="https://m.media-amazon.com/images/G/01/social_share/amazon_logo_white.png">
<meta property="og:site_name" content="Amazon.in">
</head><body>
<img id="landingImage" src="https://m.media-amazon.com/images/I/81abcPRODUCT._AC_SL1500_.jpg" data-old-hires="https://m.media-amazon.com/images/I/81abcPRODUCT._AC_SL1500_.jpg" />
<img src="https://m.media-amazon.com/images/G/31/gno/sprites/nav-sprite-global-1x.png" alt="Amazon" />
</body></html>`;
    const parsed = parseProductHtml(html, "https://www.amazon.in/dp/B0EXAMPLE");
    expect(parsed.image).toBe("https://m.media-amazon.com/images/I/81abcPRODUCT._AC_SL1500_.jpg");
    expect(parsed.image).not.toContain("/images/G/");
  });

  it("cleans Amazon overlay Open Graph URLs into a product photo", () => {
    const html = `
<html><head>
<meta property="og:title" content="Apple iPhone 13">
<meta property="og:image" content="https://m.media-amazon.com/images/I/71xb2xkN5qL.jpg_BO30,255,255,255_UF750,750_SR1910,1000,0,C_QL100_.jpg">
</head>
<body>
<link rel="stylesheet" href="https://m.media-amazon.com/images/I/21b2CPPFLqL._RC|51nfWTBkewL.css_.css" />
</body></html>`;
    const parsed = parseProductHtml(html, "https://www.amazon.in/dp/B09G9BL5CP");
    expect(parsed.image).toBe("https://m.media-amazon.com/images/I/71xb2xkN5qL._AC_SL1500_.jpg");
  });

  it("upscales Flipkart thumbnail Open Graph images", () => {
    const html = `
<html><head>
<meta property="og:title" content="Apple iPhone 15">
<meta property="og:image" content="https://rukminim2.flixcart.com/image/300/300/xif0q/mobile/h/d/9/-original-imagtc2qzgnnuhxh.jpeg">
</head></html>`;
    const parsed = parseProductHtml(html, "https://www.flipkart.com/apple-iphone-15/p/itm6ac6485515ae4");
    expect(parsed.image).toBe(
      "https://rukminim2.flixcart.com/image/832/832/xif0q/mobile/h/d/9/-original-imagtc2qzgnnuhxh.jpeg",
    );
  });

  it("ignores Flipkart promo template images", () => {
    const html = `
<html><head>
<meta property="og:title" content="Apple iPhone 15">
<meta property="og:image" content="https://rukminim2.flixcart.com/image/300/300/xif0q/mobile/h/d/9/-original-imagtc2qzgnnuhxh.jpeg">
</head>
<script>{"imageUrl":"https://rukminim1.flixcart.com/www/{@width}/{@height}/promos/31/10/2016/f7634981.png?q={@quality}"}</script>
</html>`;
    const parsed = parseProductHtml(html, "https://www.flipkart.com/apple-iphone-15/p/itm6ac6485515ae4");
    expect(parsed.image).toBe(
      "https://rukminim2.flixcart.com/image/832/832/xif0q/mobile/h/d/9/-original-imagtc2qzgnnuhxh.jpeg",
    );
  });

  it("decodes JSON unicode escapes in Flipkart image URLs", () => {
    expect(
      normalizeRetailImageUrl(
        "https:\\u002F\\u002Frukminim2.flixcart.com\\u002Fimage\\u002F300\\u002F300\\u002Fmixer.jpeg",
      ),
    ).toBe("https://rukminim2.flixcart.com/image/832/832/mixer.jpeg");
  });
});

describe("url safety", () => {
  it("rejects non-http protocols", () => {
    expect(() => normalizeHttpUrl("file:///etc/passwd")).toThrow();
    expect(() => normalizeHttpUrl("ftp://example.com")).toThrow();
  });

  it("flags private IPs", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.8")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });
});

describe("registry quantities", () => {
  it("computes remaining and availability without trusting the frontend", () => {
    const item = { quantityDesired: 3, quantityPurchased: 1, quantityReserved: 1 };
    expect(remainingQuantity(item)).toBe(2);
    expect(availableToReserve(item)).toBe(1);
    expect(derivedItemStatus(item)).toBe("PARTIALLY_PURCHASED");
  });

  it("marks fully purchased when purchased meets desired", () => {
    expect(derivedItemStatus({ quantityDesired: 2, quantityPurchased: 2 })).toBe("PURCHASED");
  });
});
