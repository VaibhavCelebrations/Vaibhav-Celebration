/**
 * Uploads frontend local images to Cloudflare R2 (or local uploads fallback),
 * registers MediaAsset rows, and rewires CMS content to match the original
 * kids-celebration placeholder site (themes, gallery, hero, blog, events).
 *
 * Run: npm run db:sync-media
 * Safe to re-run — assets are keyed by sync:* altText markers.
 */
import { config as loadDotenv } from "dotenv";
import fs from "fs/promises";
import path from "path";
import {
  GalleryCtaType,
  PrismaClient,
  SampleAssetType,
} from "@prisma/client";
import {
  deleteObjectByKey,
  isR2Enabled,
  storeMediaBuffer,
  type MediaPrefixKind,
} from "../src/integrations/media/storage";
import { delPattern, getRedisClient } from "../src/lib/redis";
import { triggerRevalidate } from "../src/integrations/revalidate/client";

loadDotenv({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();
const ROOT = path.resolve(__dirname, "../..");
const PUBLIC_THEME = path.join(ROOT, "frontend/public/theme");
const ASSETS = path.join(ROOT, "frontend/src/assets");

type UploadDef = {
  syncKey: string;
  filePath: string;
  kind: MediaPrefixKind;
  scope: string;
  role: string;
  altText: string;
};

const UPLOAD_MANIFEST: UploadDef[] = [
  {
    syncKey: "space_theme",
    filePath: path.join(PUBLIC_THEME, "space_theme.png"),
    kind: "themes",
    scope: "space-theme",
    role: "cover",
    altText: "Space theme birthday celebration setup",
  },
  {
    syncKey: "cocomelon_theme",
    filePath: path.join(PUBLIC_THEME, "cocomelon_theme.png"),
    kind: "themes",
    scope: "cocomelon-theme",
    role: "cover",
    altText: "Cocomelon theme birthday celebration setup",
  },
  {
    syncKey: "princess_theme",
    filePath: path.join(PUBLIC_THEME, "princess_theme.png"),
    kind: "themes",
    scope: "princess-theme",
    role: "cover",
    altText: "Princess theme birthday celebration setup",
  },
  {
    syncKey: "jungle_safari_theme",
    filePath: path.join(PUBLIC_THEME, "jungle_safari_theme.png"),
    kind: "themes",
    scope: "jungle-safari-theme",
    role: "cover",
    altText: "Jungle safari theme birthday celebration setup",
  },
  {
    syncKey: "gallery_balloons",
    filePath: path.join(PUBLIC_THEME, "gallery_balloons.png"),
    kind: "gallery",
    scope: "general",
    role: "balloons",
    altText: "Colorful birthday balloon celebration",
  },
  {
    syncKey: "gallery_setup",
    filePath: path.join(PUBLIC_THEME, "gallery_setup.png"),
    kind: "gallery",
    scope: "general",
    role: "setup",
    altText: "Beautiful party decorations with lights",
  },
  {
    syncKey: "gallery_cake",
    filePath: path.join(PUBLIC_THEME, "gallery_cake.png"),
    kind: "gallery",
    scope: "general",
    role: "cake",
    altText: "Custom themed birthday cake",
  },
  {
    syncKey: "hero_bg",
    filePath: path.join(ASSETS, "bg-1.png"),
    kind: "media",
    scope: "home",
    role: "hero-bg",
    altText: "Vaibhav Celebrations kids birthday hero background",
  },
  {
    syncKey: "about_bg",
    filePath: path.join(ASSETS, "about_bg.png"),
    kind: "media",
    scope: "about",
    role: "hero-bg",
    altText: "About Vaibhav Celebrations background",
  },
  {
    syncKey: "theme_explore",
    filePath: path.join(ASSETS, "Theme_explore.png"),
    kind: "media",
    scope: "home",
    role: "theme-explore",
    altText: "Explore our celebration themes",
  },
  {
    syncKey: "logo",
    filePath: path.join(ASSETS, "logo.png"),
    kind: "media",
    scope: "brand",
    role: "logo",
    altText: "Vaibhav Celebrations logo",
  },
];


function cdnKeyPrefix(def: Pick<UploadDef, "kind" | "scope" | "role">) {
  return `${def.kind}/${def.scope}/${def.role}`;
}

function fixedCdnKeyFor(def: UploadDef) {
  const ext = def.filePath.endsWith(".png") ? ".png" : ".jpg";
  return `${cdnKeyPrefix(def)}${ext}`;
}

async function uploadAsset(def: UploadDef, adminId: string | null) {
  await fs.access(def.filePath);
  const buffer = await fs.readFile(def.filePath);
  const mimeType = def.filePath.endsWith(".png") ? "image/png" : "image/jpeg";
  const fileName = path.basename(def.filePath);
  const fixedKey = fixedCdnKeyFor(def);

  const existing = await prisma.mediaAsset.findFirst({
    where: {
      deletedAt: null,
      OR: [{ cdnKey: fixedKey }, { cdnKey: { startsWith: `${cdnKeyPrefix(def)}-` } }],
    },
    orderBy: { createdAt: "desc" },
  });

  const stored = await storeMediaBuffer({
    buffer,
    originalName: fileName,
    mimeType,
    kind: def.kind,
    scope: def.scope,
    role: def.role,
    fixedCdnKey: fixedKey,
  });

  if (existing) {
    if (existing.cdnKey !== stored.cdnKey) {
      void deleteObjectByKey(existing.cdnKey).catch(() => undefined);
    }
    return prisma.mediaAsset.update({
      where: { id: existing.id },
      data: {
        url: stored.url,
        cdnKey: stored.cdnKey,
        type: mimeType,
        altText: def.altText,
        sizeBytes: stored.sizeBytes,
      },
    });
  }

  return prisma.mediaAsset.create({
    data: {
      url: stored.url,
      cdnKey: stored.cdnKey,
      type: mimeType,
      altText: def.altText,
      sizeBytes: stored.sizeBytes,
      uploadedByAdminUserId: adminId ?? undefined,
    },
  });
}

const KIDS_THEMES = [
  {
    slug: "space-theme",
    title: "Space Theme Celebration",
    shortDescription:
      "A cosmic adventure beyond imagination! Turn your child's birthday into an exciting space mission filled with imagination, discovery, and unforgettable memories.",
    storyDescription:
      "Our Space Birthday Theme creates an immersive celebration where every detail follows one carefully crafted story — from personalised invitations to themed experiences and thoughtful keepsakes.",
    audienceNote: "Cosmic & Adventurous · Ages 4–10",
    displayOrder: 1,
    seoTitle: "Space Theme Birthday Celebration | Vaibhav Celebrations",
    seoDescription:
      "Launch into an unforgettable space birthday celebration — immersive, themed, and memorable for curious young explorers.",
    mediaKey: "space_theme",
  },
  {
    slug: "cocomelon-theme",
    title: "Cocomelon Theme Celebration",
    shortDescription:
      "Fun, colors and joy with Cocomelon & friends! Bring your child's favourite Cocomelon world to life with a thoughtfully designed birthday celebration.",
    storyDescription:
      "Every element follows one beautiful theme, creating a seamless experience that children love and parents genuinely enjoy.",
    audienceNote: "Musical & Joyful · Ages 1–4",
    displayOrder: 2,
    seoTitle: "Cocomelon Theme Birthday Celebration | Vaibhav Celebrations",
    seoDescription:
      "A joyful Cocomelon birthday celebration with music, laughter, and beautifully planned details for toddlers.",
    mediaKey: "cocomelon_theme",
  },
  {
    slug: "princess-theme",
    title: "Princess Birthday Theme",
    shortDescription:
      "An enchanting fairytale celebration! Create a magical birthday experience where dreams become reality for your little princess.",
    storyDescription:
      "Our Princess Birthday Theme is thoughtfully designed to make your child feel truly special through elegant details and beautifully coordinated moments.",
    audienceNote: "Magical & Elegant · Ages 3–8",
    displayOrder: 3,
    seoTitle: "Princess Birthday Theme Celebration | Vaibhav Celebrations",
    seoDescription:
      "A magical princess birthday celebration with enchanting fairytale details for young dreamers.",
    mediaKey: "princess_theme",
  },
  {
    slug: "jungle-safari-theme",
    title: "Jungle Safari Birthday Theme",
    shortDescription:
      "Step into a world of adventure! A celebration inspired by the beauty of the jungle for little explorers and animal lovers.",
    storyDescription:
      "Every part of the celebration follows one beautifully connected theme — from personalised invitations to immersive experiences and thoughtful keepsakes.",
    audienceNote: "Wild & Fun · Ages 2–8",
    displayOrder: 4,
    seoTitle: "Jungle Safari Birthday Theme | Vaibhav Celebrations",
    seoDescription:
      "A wild jungle safari birthday adventure with immersive experiences for young animal lovers.",
    mediaKey: "jungle_safari_theme",
  },
] as const;

const GALLERY_ITEMS: {
  caption: string;
  altText: string;
  mediaKey: string;
  tag: string;
  themeSlug?: string;
  aspectOrder: number;
}[] = [
  { caption: "Balloon Celebration Setup", altText: "Colorful birthday balloon celebration", mediaKey: "gallery_balloons", tag: "General", aspectOrder: 1 },
  { caption: "Party Lights & Décor", altText: "Beautiful party decorations with lights", mediaKey: "gallery_setup", tag: "General", aspectOrder: 2 },
  { caption: "Gift Wrapping Station", altText: "Beautifully wrapped birthday gifts", mediaKey: "gallery_cake", tag: "General", aspectOrder: 3 },
  { caption: "Space Theme Setup", altText: "Space themed balloon setup", mediaKey: "space_theme", tag: "Space", themeSlug: "space-theme", aspectOrder: 4 },
  { caption: "Kids Birthday Celebration", altText: "Children celebrating birthday", mediaKey: "gallery_setup", tag: "General", aspectOrder: 5 },
  { caption: "Custom Birthday Cake", altText: "Custom themed birthday cake", mediaKey: "gallery_cake", tag: "Cocomelon", themeSlug: "cocomelon-theme", aspectOrder: 6 },
  { caption: "Pink Princess Setup", altText: "Pink themed party decorations", mediaKey: "princess_theme", tag: "Princess", themeSlug: "princess-theme", aspectOrder: 7 },
  { caption: "Jungle Theme Décor", altText: "Jungle safari themed party setup", mediaKey: "jungle_safari_theme", tag: "Jungle Safari", themeSlug: "jungle-safari-theme", aspectOrder: 8 },
  { caption: "Happy Birthday Moment", altText: "Birthday celebration with family", mediaKey: "gallery_balloons", tag: "Princess", aspectOrder: 9 },
  { caption: "Activity Corner", altText: "Kids activity corner at party", mediaKey: "gallery_cake", tag: "General", aspectOrder: 10 },
  { caption: "Party Vibes", altText: "Fun party atmosphere with confetti", mediaKey: "space_theme", tag: "Space", themeSlug: "space-theme", aspectOrder: 11 },
  { caption: "Grand Event Setup", altText: "Complete event setup", mediaKey: "cocomelon_theme", tag: "Cocomelon", themeSlug: "cocomelon-theme", aspectOrder: 12 },
];

async function ensureGalleryTag(name: string) {
  return prisma.galleryTag.upsert({
    where: { name },
    create: { name },
    update: {},
  });
}

async function flushCaches() {
  const client = getRedisClient();
  if (client) {
    try {
      await client.connect();
    } catch {
      // already connected
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  await delPattern("pub:*");
  await delPattern("adm:*");
}

async function main() {
  console.log(`R2 enabled: ${isR2Enabled()}`);

  const admin = await prisma.adminUser.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const adminId = admin?.id ?? null;

  const mediaMap = new Map<string, { id: string; url: string }>();
  for (const def of UPLOAD_MANIFEST) {
    const asset = await uploadAsset(def, adminId);
    mediaMap.set(def.syncKey, { id: asset.id, url: asset.url });
    console.log(`Uploaded ${def.syncKey} → ${asset.url}`);
  }

  const weddingSlugs = ["royal-mandap", "garden-bloom", "minimal-elegance"];
  await prisma.theme.updateMany({
    where: { slug: { in: weddingSlugs } },
    data: { isActive: false, deletedAt: new Date() },
  });

  const themeRecords = new Map<string, { id: string }>();
  for (const def of KIDS_THEMES) {
    const hero = mediaMap.get(def.mediaKey);
    if (!hero) throw new Error(`Missing media for theme ${def.slug}`);

    const theme = await prisma.theme.upsert({
      where: { slug: def.slug },
      create: {
        title: def.title,
        slug: def.slug,
        shortDescription: def.shortDescription,
        storyDescription: def.storyDescription,
        audienceNote: def.audienceNote,
        heroImageId: hero.id,
        ogImageId: hero.id,
        isActive: true,
        displayOrder: def.displayOrder,
        seoTitle: def.seoTitle,
        seoDescription: def.seoDescription,
      },
      update: {
        title: def.title,
        shortDescription: def.shortDescription,
        storyDescription: def.storyDescription,
        audienceNote: def.audienceNote,
        heroImageId: hero.id,
        ogImageId: hero.id,
        isActive: true,
        displayOrder: def.displayOrder,
        seoTitle: def.seoTitle,
        seoDescription: def.seoDescription,
        deletedAt: null,
      },
    });
    themeRecords.set(def.slug, { id: theme.id });
  }

  const packages = await prisma.package.findMany({
    where: { slug: { in: ["standard", "premium", "lux"] }, deletedAt: null },
    select: { id: true, slug: true },
  });
  for (const theme of themeRecords.values()) {
    for (const pkg of packages) {
      await prisma.themePackage.upsert({
        where: { themeId_packageId: { themeId: theme.id, packageId: pkg.id } },
        create: { themeId: theme.id, packageId: pkg.id },
        update: {},
      });
    }
  }

  await prisma.galleryImageTag.deleteMany({});
  await prisma.galleryImage.updateMany({
    where: { deletedAt: null },
    data: { deletedAt: new Date() },
  });

  for (const item of GALLERY_ITEMS) {
    const media = mediaMap.get(item.mediaKey);
    if (!media) continue;
    const tag = await ensureGalleryTag(item.tag);
    const themeId = item.themeSlug ? themeRecords.get(item.themeSlug)?.id : undefined;

    const image = await prisma.galleryImage.create({
      data: {
        mediaId: media.id,
        caption: item.caption,
        altText: item.altText,
        themeId,
        ctaType: themeId ? GalleryCtaType.THEME : GalleryCtaType.NONE,
        ctaTargetSlug: item.themeSlug,
        isActive: true,
        displayOrder: item.aspectOrder,
      },
    });
    await prisma.galleryImageTag.create({
      data: { galleryImageId: image.id, tagId: tag.id },
    });
  }

  const heroBg = mediaMap.get("hero_bg");
  if (heroBg) {
    const homePage = await prisma.pageContent.findUnique({ where: { pageKey: "home" } });
    if (homePage) {
      const sections = homePage.sections as Record<string, unknown>;
      const hero = (sections.hero ?? {}) as Record<string, unknown>;
      hero.backgroundImage = { mediaId: heroBg.id };
      sections.hero = hero;
      await prisma.pageContent.update({
        where: { pageKey: "home" },
        data: { sections: sections as object },
      });
    } else {
      const { defaultPageSections } = await import("../src/modules/pages/pages.service");
      const sections = JSON.parse(JSON.stringify(defaultPageSections.home)) as {
        hero?: { backgroundImage?: { mediaId: string } };
      };
      if (sections.hero) sections.hero.backgroundImage = { mediaId: heroBg.id };
      await prisma.pageContent.create({
        data: { pageKey: "home", sections: sections as object },
      });
    }
  }

  const blogCover = mediaMap.get("gallery_cake");
  if (blogCover) {
    await prisma.blogPost.updateMany({
      where: { status: "PUBLISHED", deletedAt: null },
      data: { featuredImageId: blogCover.id },
    });
  }

  const eventBanner = mediaMap.get("gallery_setup");
  if (eventBanner) {
    await prisma.event.updateMany({
      where: { deletedAt: null },
      data: { bannerMediaId: eventBanner.id },
    });
  }

  if (heroBg) {
    await prisma.siteMetadata.updateMany({
      where: { pageKey: { in: ["home", "global"] } },
      data: { ogImageId: heroBg.id },
    });
  }

  for (const [slug, theme] of themeRecords) {
    const hero = mediaMap.get(KIDS_THEMES.find((t) => t.slug === slug)!.mediaKey)!;
    const galleryMedia = mediaMap.get("gallery_balloons")!;
    const existingSamples = await prisma.themeSampleAsset.count({ where: { themeId: theme.id } });
    if (existingSamples === 0) {
      await prisma.themeSampleAsset.createMany({
        data: [
          {
            themeId: theme.id,
            type: SampleAssetType.DIGITAL_INVITE,
            title: "Digital Birthday Invite",
            mediaId: hero.id,
            description: `Sample digital invite for ${slug}`,
            displayOrder: 1,
          },
          {
            themeId: theme.id,
            type: SampleAssetType.ACTIVITY_KIT,
            title: "Activity Corner Preview",
            mediaId: galleryMedia.id,
            description: `Sample activity setup for ${slug}`,
            displayOrder: 2,
          },
        ],
      });
    }
  }

  await prisma.siteMetadata.updateMany({
    where: { pageKey: "home" },
    data: {
      metaTitle: "Kids Birthday Celebrations | Vaibhav Celebrations",
      metaDescription:
        "Thoughtfully curated kids birthday celebrations with Space, Cocomelon, Princess, and Jungle Safari themes in Delhi NCR.",
    },
  });

  console.log("\nSync complete.");
  console.log(`Themes: ${KIDS_THEMES.map((t) => t.slug).join(", ")}`);
  console.log(`Gallery images: ${GALLERY_ITEMS.length}`);
  console.log(`Media assets: ${mediaMap.size}`);

  await flushCaches();
  void triggerRevalidate(["/", "/themes", "/gallery", "/about", "/blog", "/events"]);
  console.log("Cache cleared and frontend revalidation triggered.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
