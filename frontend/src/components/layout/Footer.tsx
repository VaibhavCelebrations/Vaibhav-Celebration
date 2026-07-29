import { getPublicSettings } from "@/lib/cms/settings";
import { listThemes } from "@/lib/cms/themes";
import { listBlogPosts } from "@/lib/cms/blog";
import {
  DEFAULT_FOOTER_SETTINGS,
  FooterClient,
} from "./FooterClient";

export async function Footer() {
  let settings = DEFAULT_FOOTER_SETTINGS;
  let themeLinks: Array<{ label: string; href: string }> = [{ label: "All Themes", href: "/themes" }];
  let blogLinks: Array<{ label: string; href: string }> = [{ label: "All Articles", href: "/blog" }];

  try {
    settings = await getPublicSettings();
    const themes = await listThemes();
    themeLinks = [
      ...themes.slice(0, 4).map((t) => ({ label: t.title, href: `/themes/${t.slug}` })),
      { label: "All Themes", href: "/themes" },
    ];
    const posts = await listBlogPosts();
    blogLinks = [
      ...posts.slice(0, 4).map((p) => ({ label: p.title, href: `/blog/${p.slug}` })),
      { label: "All Articles", href: "/blog" },
    ];
  } catch {
    // Keep fallback links when API is unavailable
  }

  return (
    <FooterClient
      settings={settings}
      themeLinks={themeLinks}
      blogLinks={blogLinks}
    />
  );
}
