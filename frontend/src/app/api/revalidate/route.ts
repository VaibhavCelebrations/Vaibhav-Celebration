import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Invalid revalidate secret" } },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    path?: string;
    paths?: string[];
    tag?: string;
    tags?: string[];
  };

  const paths = body.paths ?? (body.path ? [body.path] : []);
  const tags = new Set(body.tags ?? (body.tag ? [body.tag] : []));

  for (const path of paths) {
    if (!path) continue;
    revalidatePath(path);
    if (path === "/blog") tags.add("cms:blog");
    else if (path.startsWith("/blog/")) tags.add(`cms:blog:${path.slice("/blog/".length)}`);
    else if (path === "/contact") tags.add("cms:pages:contact");
    else if (path === "/about") tags.add("cms:pages:about");
    else if (path === "/") tags.add("cms:pages:home");
  }

  const tagList = [...tags];
  for (const tag of tagList) {
    if (tag) revalidateTag(tag, "max");
  }

  return NextResponse.json({
    success: true,
    data: { revalidated: true, paths, tags: tagList },
  });
}
