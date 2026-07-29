import { describe, expect, it } from "vitest";

/** Mirrors frontend/src/app/api/revalidate/route.ts payload handling. */
function parseRevalidateBody(body: { path?: string; paths?: string[]; tag?: string; tags?: string[] }) {
  const paths = body.paths ?? (body.path ? [body.path] : []);
  const tags = body.tags ?? (body.tag ? [body.tag] : []);
  return { paths, tags };
}

describe("revalidate webhook payload", () => {
  it("handles paths array from backend CMS", () => {
    const result = parseRevalidateBody({ paths: ["/", "/about", "/blog"] });
    expect(result.paths).toEqual(["/", "/about", "/blog"]);
  });

  it("handles legacy single path", () => {
    const result = parseRevalidateBody({ path: "/gallery" });
    expect(result.paths).toEqual(["/gallery"]);
  });

  it("handles tags array from backend CMS", () => {
    const result = parseRevalidateBody({ tags: ["cms:blog", "cms:blog:my-post"] });
    expect(result.tags).toEqual(["cms:blog", "cms:blog:my-post"]);
  });
});
