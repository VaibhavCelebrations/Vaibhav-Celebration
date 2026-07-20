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
    tag?: string;
  };

  if (body.path) revalidatePath(body.path);
  // Next.js 16 cacheLife profile — "max" = long-lived tag invalidation
  if (body.tag) revalidateTag(body.tag, "max");

  return NextResponse.json({
    success: true,
    data: { revalidated: true, path: body.path ?? null, tag: body.tag ?? null },
  });
}
