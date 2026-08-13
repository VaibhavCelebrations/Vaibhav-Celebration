import { describe, expect, it } from "vitest";
import { parsePriceToPaise, parseProductHtml } from "./html-metadata";
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
