import { describe, expect, it } from "vitest";
import { isGiftRegistryMatrixService, GIFT_REGISTRY_ELIGIBLE_SLUGS, GIFT_REGISTRY_PRICE_IN_PAISE } from "./upgrades.service";

describe("gift registry package service", () => {
  it("identifies the gift-registry extra service", () => {
    expect(isGiftRegistryMatrixService({ slug: "gift-registry" })).toBe(true);
    expect(isGiftRegistryMatrixService({ category: "GIFT_REGISTRY" })).toBe(true);
    expect(isGiftRegistryMatrixService({ label: "Gift Registry" })).toBe(true);
    expect(isGiftRegistryMatrixService({ slug: "digital-invite", label: "Digital Invite" })).toBe(false);
  });

  it("is included on Signature and Grand, with a fixed ₹500 customize price", () => {
    expect(GIFT_REGISTRY_ELIGIBLE_SLUGS).toEqual(["signature", "grand"]);
    expect(GIFT_REGISTRY_PRICE_IN_PAISE).toBe(50_000);
  });
});
