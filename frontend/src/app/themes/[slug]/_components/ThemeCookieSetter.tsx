"use client";

import { useEffect } from "react";
import { CacheStore } from "@/lib/cache-store";

export function ThemeCookieSetter({ slug }: { slug: string }) {
  useEffect(() => {
    CacheStore.setCookie("vc_selected_theme", slug, 30);
  }, [slug]);
  return null;
}
