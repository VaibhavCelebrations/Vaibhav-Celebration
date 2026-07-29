import { describe, expect, it } from "vitest";
import { attachMediaField, toMediaRef } from "./media-ref";

describe("media-ref", () => {
  it("maps media asset to ref", () => {
    const ref = toMediaRef({
      id: "m1",
      url: "https://example.com/a.jpg",
      altText: "Alt",
      type: "image/jpeg",
      width: 100,
      height: 100,
      deletedAt: null,
      cdnKey: "a.jpg",
      sizeBytes: 1000,
      uploadedByAdminUserId: null,
      createdAt: new Date(),
    });
    expect(ref?.url).toBe("https://example.com/a.jpg");
  });

  it("attaches featured image from map", () => {
    const map = new Map([
      ["m1", { id: "m1", url: "https://example.com/a.jpg", altText: null, type: "image/jpeg", width: null, height: null }],
    ]);
    const row = { id: "p1", featuredImageId: "m1" };
    const out = attachMediaField(row, map, "featuredImageId", "featuredImage");
    expect(out.featuredImage?.url).toBe("https://example.com/a.jpg");
  });
});
