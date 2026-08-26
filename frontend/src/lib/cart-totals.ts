import type { CartPackage } from "@/lib/ecom-types";
import type { CartQuote } from "@/lib/shop-types";

const DEFAULT_THRESHOLD = 299_900;
const DEFAULT_SHIPPING_FEE = 19_900;
const DEFAULT_GST_PERCENT = 18;

type QuoteSnapshot = {
  subtotalInPaise?: number;
  shippingInPaise?: number;
  shippingWaived?: boolean;
  freeShippingThresholdInPaise?: number;
  gstPercent?: number;
};

function snapshotOf(pkg: CartPackage): QuoteSnapshot | undefined {
  const raw = pkg.builderInput?.quoteSnapshot;
  if (!raw || typeof raw !== "object") return undefined;
  return raw as QuoteSnapshot;
}

function addonMerchandiseInPaise(pkg: CartPackage): number {
  return (pkg.addons ?? []).reduce((sum, addon) => sum + addon.product.priceInPaise * addon.quantity, 0);
}

/** Pre-GST merchandise value of event packages (excludes shipping). */
export function packagesMerchandiseInPaise(packages: CartPackage[]): number {
  return packages.reduce((sum, pkg) => {
    const snap = snapshotOf(pkg);
    if (typeof snap?.subtotalInPaise === "number" && Number.isFinite(snap.subtotalInPaise)) {
      return sum + snap.subtotalInPaise + addonMerchandiseInPaise(pkg);
    }
    return sum + Math.round((pkg.basePrice || 0) * 100) + addonMerchandiseInPaise(pkg);
  }, 0);
}

function shippingFeeFromQuotes(shopQuote: CartQuote, packages: CartPackage[], fallback: number): number {
  if (!shopQuote.shippingWaived && shopQuote.shippingInPaise > 0) return shopQuote.shippingInPaise;
  const snap = packages[0] ? snapshotOf(packages[0]) : undefined;
  if (snap && !snap.shippingWaived && typeof snap.shippingInPaise === "number" && snap.shippingInPaise > 0) {
    return snap.shippingInPaise;
  }
  return fallback;
}

/**
 * One shipping calculation across shop cart + event packages.
 * Packages are stored client-side, so this is display-only; checkout recomputes server-side.
 */
export function combineCartQuote(
  shopQuote: CartQuote,
  packages: CartPackage[],
  shippingFeeFallbackInPaise = DEFAULT_SHIPPING_FEE,
): CartQuote {
  const packageMerch = packagesMerchandiseInPaise(packages);
  if (packageMerch <= 0) return shopQuote;

  const snap = packages[0] ? snapshotOf(packages[0]) : undefined;
  const subtotalInPaise = shopQuote.subtotalInPaise + packageMerch;
  const freeShippingThresholdInPaise =
    shopQuote.freeShippingThresholdInPaise || snap?.freeShippingThresholdInPaise || DEFAULT_THRESHOLD;
  const shippingFee = shippingFeeFromQuotes(shopQuote, packages, shippingFeeFallbackInPaise);
  const shippingWaived = subtotalInPaise >= freeShippingThresholdInPaise;
  const shippingInPaise = shippingWaived ? 0 : shippingFee;
  const gstPercent = shopQuote.gstPercent || snap?.gstPercent || DEFAULT_GST_PERCENT;
  const gstInPaise = Math.round(((subtotalInPaise + shippingInPaise) * gstPercent) / 100);

  return {
    subtotalInPaise,
    shippingInPaise,
    shippingWaived,
    freeShippingThresholdInPaise,
    amountUntilFreeShippingInPaise: Math.max(0, freeShippingThresholdInPaise - subtotalInPaise),
    gstPercent,
    gstInPaise,
    totalInPaise: subtotalInPaise + shippingInPaise + gstInPaise,
    lines: shopQuote.lines,
  };
}
