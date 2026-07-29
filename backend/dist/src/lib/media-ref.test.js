"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const media_ref_1 = require("./media-ref");
(0, vitest_1.describe)("media-ref", () => {
    (0, vitest_1.it)("maps media asset to ref", () => {
        const ref = (0, media_ref_1.toMediaRef)({
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
        (0, vitest_1.expect)(ref?.url).toBe("https://example.com/a.jpg");
    });
    (0, vitest_1.it)("attaches featured image from map", () => {
        const map = new Map([
            ["m1", { id: "m1", url: "https://example.com/a.jpg", altText: null, type: "image/jpeg", width: null, height: null }],
        ]);
        const row = { id: "p1", featuredImageId: "m1" };
        const out = (0, media_ref_1.attachMediaField)(row, map, "featuredImageId", "featuredImage");
        (0, vitest_1.expect)(out.featuredImage?.url).toBe("https://example.com/a.jpg");
    });
});
//# sourceMappingURL=media-ref.test.js.map