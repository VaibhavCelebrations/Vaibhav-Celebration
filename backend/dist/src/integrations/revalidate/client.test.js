"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
/** Mirrors frontend/src/app/api/revalidate/route.ts payload handling. */
function parseRevalidateBody(body) {
    const paths = body.paths ?? (body.path ? [body.path] : []);
    const tags = body.tags ?? (body.tag ? [body.tag] : []);
    return { paths, tags };
}
(0, vitest_1.describe)("revalidate webhook payload", () => {
    (0, vitest_1.it)("handles paths array from backend CMS", () => {
        const result = parseRevalidateBody({ paths: ["/", "/about", "/blog"] });
        (0, vitest_1.expect)(result.paths).toEqual(["/", "/about", "/blog"]);
    });
    (0, vitest_1.it)("handles legacy single path", () => {
        const result = parseRevalidateBody({ path: "/gallery" });
        (0, vitest_1.expect)(result.paths).toEqual(["/gallery"]);
    });
    (0, vitest_1.it)("handles tags array from backend CMS", () => {
        const result = parseRevalidateBody({ tags: ["cms:blog", "cms:blog:my-post"] });
        (0, vitest_1.expect)(result.tags).toEqual(["cms:blog", "cms:blog:my-post"]);
    });
});
//# sourceMappingURL=client.test.js.map