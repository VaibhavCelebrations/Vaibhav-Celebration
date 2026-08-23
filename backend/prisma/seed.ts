import {
  AdminRole,
  BlogStatus,
  ConsultationStatus,
  GalleryCtaType,
  LeadSource,
  LeadStatus,
  LegalPageType,
  PaymentStatus,
  PopupPlacement,
  PrismaClient,
  SampleAssetType,
  TestimonialSubjectType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CDN = "https://cdn.vaibhavcelebrations.in";
const img = (path: string) => `${CDN}/${path}`;

// Kids theme image paths (uploaded via sync-site-media.ts → Cloudflare R2)
const THEME_IMGS = {
  space: img("themes/space-theme/cover.png"),
  cocomelon: img("themes/cocomelon-theme/cover.png"),
  princess: img("themes/princess-theme/cover.png"),
  jungle: img("themes/jungle-safari-theme/cover.png"),
  gallery_balloons: img("gallery/general/balloons.png"),
  gallery_setup: img("gallery/general/setup.png"),
  gallery_cake: img("gallery/general/cake.png"),
  hero_bg: img("media/home/hero-bg.png"),
} as const;

async function clearDevData() {
  const tables = [
    "GiftRegistryContribution",
    "GiftRegistryItem",
    "GiftRegistry",
    "Invoice",
    "OrderPackageLine",
    "OrderPackage",
    "OrderItem",
    "Order",
    "WishlistItem",
    "CartItem",
    "Cart",
    "InventoryLedgerEntry",
    "InventoryRecord",
    "ProductPersonalizationField",
    "ProductThemeTag",
    "ProductCategoryTag",
    "ProductImage",
    "Product",
    "ProductCategory",
    "EmailVerificationToken",
    "PasswordResetToken",
    "CustomerSession",
    "User",
    "AuditLog",
    "GuestVerificationToken",
    "ConsultationRequest",
    "Lead",
    "ChatbotSession",
    "CustomerNote",
    "Customer",
    "EventRegistration",
    "Event",
    "BlogPostTag",
    "BlogPostCategory",
    "BlogPost",
    "BlogTag",
    "BlogCategory",
    "SiteMetadata",
    "PageContent",
    "LegalPage",
    "Popup",
    "FAQ",
    "Testimonial",
    "GalleryImageTag",
    "GalleryImage",
    "GalleryTag",
    "PackageServiceItem",
    "ExtraService",
    "ThemePackage",
    "ThemeSampleAsset",
    "Theme",
    "Package",
    "MediaAsset",
    "OperationalSetting",
    "SequenceCounter",
    "AdminRefreshToken",
    "AdminUser",
  ] as const;

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
}

async function main() {
  console.log("Clearing existing dev data...");
  await clearDevData();

  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe_SuperAdmin_123!";
  const adminHash = await bcrypt.hash(adminPassword, 12);
  const staffHash = await bcrypt.hash("ChangeMe_Staff_123!", 12);

  // ── Admin Users ─────────────────────────────────────────────────────────────
  const superAdmin = await prisma.adminUser.create({
    data: {
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@vaibhavcelebrations.in",
      passwordHash: adminHash,
      name: process.env.SEED_ADMIN_NAME ?? "Super Admin",
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      lastLoginAt: new Date(),
    },
  });

  const opsAdmin = await prisma.adminUser.create({
    data: {
      email: "operations@vaibhavcelebrations.in",
      passwordHash: staffHash,
      name: "Operations Manager",
      role: AdminRole.OPERATIONS,
      isActive: true,
    },
  });

  const contentAdmin = await prisma.adminUser.create({
    data: {
      email: "content@vaibhavcelebrations.in",
      passwordHash: staffHash,
      name: "Content Editor",
      role: AdminRole.CONTENT_EDITOR,
      isActive: true,
    },
  });

  console.log("Admin users seeded");

  // ── Sequence Counters ───────────────────────────────────────────────────────
  await prisma.sequenceCounter.createMany({
    data: [
      { key: "ORDER-2026", lastValue: 0 },
      { key: "INVOICE-2026-27", lastValue: 3 },
    ],
  });

  // ── Operational Settings ──────────────────────────────────────────────────
  await prisma.operationalSetting.createMany({
    data: [
      { key: "gst_percent", value: "18" },
      { key: "GST_PERCENT", value: "18" },
      { key: "max_bookings_per_day", value: "2" },
      { key: "min_consultation_advance_days", value: "15" },
      { key: "FREE_SHIPPING_THRESHOLD_IN_PAISE", value: "299900" },
      { key: "SHIPPING_FEE_IN_PAISE", value: "19900" },
      { key: "business_name", value: "Vaibhav Celebrations" },
      { key: "business_phone", value: "+91 98765 43210" },
      { key: "business_email", value: "hello@vaibhavcelebrations.in" },
      {
        key: "business_address",
        value: "Vaibhav Farmhouse, Near Surajkund, Faridabad, Haryana 121009",
      },
      { key: "whatsapp_number", value: "+919876543210" },
      {
        key: "instagram_url",
        value: "https://instagram.com/vaibhavcelebrations",
      },
      {
        key: "facebook_url",
        value: "https://facebook.com/vaibhavcelebrations",
      },
    ],
  });

  // ── Media Assets (kids birthday themes) ───────────────────────────────────
  // NOTE: Real images are uploaded to R2 via `npm run db:sync-media`.
  // Seed uses the canonical CDN URLs that sync-site-media.ts sets.
  const heroMedia = await prisma.mediaAsset.create({
    data: {
      cdnKey: "media/home/hero-bg.png",
      url: THEME_IMGS.hero_bg,
      type: "image/png",
      altText: "Vaibhav Celebrations kids birthday hero background",
      category: "media",
      folder: "home",
      width: 1920,
      height: 1080,
      sizeBytes: 1624884,
      uploadedByAdminUserId: contentAdmin.id,
    },
  });

  const spaceMedia = await prisma.mediaAsset.create({
    data: {
      cdnKey: "themes/space-theme/cover.png",
      url: THEME_IMGS.space,
      type: "image/png",
      altText: "Space theme birthday celebration setup",
      category: "themes",
      folder: "space-theme",
      width: 1600,
      height: 900,
      sizeBytes: 2043024,
      uploadedByAdminUserId: contentAdmin.id,
    },
  });

  const cocomelonMedia = await prisma.mediaAsset.create({
    data: {
      cdnKey: "themes/cocomelon-theme/cover.png",
      url: THEME_IMGS.cocomelon,
      type: "image/png",
      altText: "Cocomelon theme birthday celebration setup",
      category: "themes",
      folder: "cocomelon-theme",
      width: 1600,
      height: 900,
      sizeBytes: 1835597,
      uploadedByAdminUserId: contentAdmin.id,
    },
  });

  const princessMedia = await prisma.mediaAsset.create({
    data: {
      cdnKey: "themes/princess-theme/cover.png",
      url: THEME_IMGS.princess,
      type: "image/png",
      altText: "Princess theme birthday celebration setup",
      category: "themes",
      folder: "princess-theme",
      width: 1600,
      height: 900,
      sizeBytes: 1815158,
      uploadedByAdminUserId: contentAdmin.id,
    },
  });

  const jungleMedia = await prisma.mediaAsset.create({
    data: {
      cdnKey: "themes/jungle-safari-theme/cover.png",
      url: THEME_IMGS.jungle,
      type: "image/png",
      altText: "Jungle safari theme birthday celebration setup",
      category: "themes",
      folder: "jungle-safari-theme",
      width: 1600,
      height: 900,
      sizeBytes: 1047637,
      uploadedByAdminUserId: contentAdmin.id,
    },
  });

  const galleryBalloons = await prisma.mediaAsset.create({
    data: {
      cdnKey: "gallery/general/balloons.png",
      url: THEME_IMGS.gallery_balloons,
      type: "image/png",
      altText: "Colorful birthday balloon celebration",
      category: "gallery",
      folder: "general",
      width: 1200,
      height: 800,
      sizeBytes: 749119,
      uploadedByAdminUserId: contentAdmin.id,
    },
  });

  const gallerySetup = await prisma.mediaAsset.create({
    data: {
      cdnKey: "gallery/general/setup.png",
      url: THEME_IMGS.gallery_setup,
      type: "image/png",
      altText: "Beautiful party decorations with lights",
      category: "gallery",
      folder: "general",
      width: 1200,
      height: 800,
      sizeBytes: 953060,
      uploadedByAdminUserId: contentAdmin.id,
    },
  });

  const galleryCake = await prisma.mediaAsset.create({
    data: {
      cdnKey: "gallery/general/cake.png",
      url: THEME_IMGS.gallery_cake,
      type: "image/png",
      altText: "Custom themed birthday cake",
      category: "gallery",
      folder: "general",
      width: 1200,
      height: 800,
      sizeBytes: 888583,
      uploadedByAdminUserId: contentAdmin.id,
    },
  });

  const blogCoverMedia = galleryCake;
  const eventBannerMedia = gallerySetup;
  const sampleInviteMedia = spaceMedia;

  // ── Packages (Standard / Premium / Luxe) ─────────────────────────────────────
  const standardPkg = await prisma.package.create({
    data: {
      title: "Thoughtful Essentials",
      slug: "standard",
      priceInPaise: 4990000,
      tierRank: 1,
      isRecommended: false,
      isActive: true,
      isCustomizable: true,
      displayOrder: 1,
      description:
        "Thoughtful essentials for a coordinated celebration — static invite, one activity, return gift, and basic personalization.",
    },
  });

  const premiumPkg = await prisma.package.create({
    data: {
      title: "Complete Celebration Experience",
      slug: "premium",
      priceInPaise: 7990000,
      tierRank: 2,
      isRecommended: true,
      isActive: true,
      isCustomizable: true,
      displayOrder: 2,
      description:
        "Complete celebration experience with video invite, welcome item, two activities, countdown cards, and gift registry.",
    },
  });

  const luxPkg = await prisma.package.create({
    data: {
      title: "The Signature Celebration Experience",
      slug: "luxe",
      priceInPaise: 11990000,
      tierRank: 3,
      isRecommended: false,
      isActive: true,
      isCustomizable: true,
      displayOrder: 3,
      description:
        "Signature celebration with keepsake PDF, family activity, custom gift bags, and priority consultation.",
    },
  });

  // ── Extra Services (global catalog — Fiverr-style rows) ─────────────────────
  const svcReturnGift = await prisma.extraService.create({
    data: {
      label: "Return gift",
      description: "Curated return gifts matching your theme and guest count.",
      requirements:
        "Guest count and theme preference required at least 7 days before the event.",
      displayOrder: 1,
      isActive: true,
    },
  });

  const svcVideoInvites = await prisma.extraService.create({
    data: {
      label: "Video invites",
      description:
        "Animated or live-action video invitations for your celebration.",
      requirements:
        "Provide child name, event date, venue, and theme artwork references.",
      displayOrder: 2,
      isActive: true,
    },
  });

  const svcThemeDecor = await prisma.extraService.create({
    data: {
      label: "Theme based decorations",
      description:
        "Full theme-aligned décor including backdrop, props, and table styling.",
      requirements: "Theme selection and venue walkthrough recommended.",
      displayOrder: 3,
      isActive: true,
    },
  });

  const svcDigitalInvites = await prisma.extraService.create({
    data: {
      label: "Digital invites",
      description:
        "Shareable digital invitation cards for WhatsApp and social media.",
      requirements:
        "Event details, RSVP contact, and preferred colour palette.",
      displayOrder: 4,
      isActive: true,
    },
  });

  const svcCustomBackdrop = await prisma.extraService.create({
    data: {
      label: "Custom backdrop",
      description:
        "Personalised photo backdrop with name, age, and theme elements.",
      requirements:
        "Child name, age, and high-resolution theme assets if available.",
      displayOrder: 5,
      isActive: true,
    },
  });

  const svcPersonalized = await prisma.extraService.create({
    data: {
      label: "Personalized details",
      description:
        "Custom signage, name boards, cake toppers, and themed printables.",
      requirements: "Spelling of names and any special messages to include.",
      displayOrder: 6,
      isActive: true,
    },
  });

  const svcActivities = await prisma.extraService.create({
    data: {
      label: "Activities & games",
      description:
        "Hosted games, craft stations, and age-appropriate party activities.",
      requirements:
        "Guest age range and headcount; outdoor space details if applicable.",
      displayOrder: 7,
      isActive: true,
    },
  });

  const svcOrganiser = await prisma.extraService.create({
    data: {
      label: "Organiser support",
      description:
        "Dedicated on-day coordinator to manage vendors, timeline, and guests.",
      requirements: "Final run-sheet shared 48 hours before the event.",
      displayOrder: 8,
      isActive: true,
    },
  });

  const svcPhotoDoc = await prisma.extraService.create({
    data: {
      label: "Photo documentation",
      description:
        "Professional photo coverage of décor, candid moments, and cake cutting.",
      requirements: "Coverage hours and key moments list.",
      displayOrder: 9,
      isActive: true,
    },
  });

  const svcBalloons = await prisma.extraService.create({
    data: {
      label: "Balloons & props",
      description: "Balloon garlands, arches, and themed prop sets.",
      displayOrder: 10,
      isActive: true,
    },
  });

  const svcWelcomeBoard = await prisma.extraService.create({
    data: {
      label: "Welcome board",
      description: "Entrance welcome board with theme styling.",
      displayOrder: 11,
      isActive: true,
    },
  });

  type MatrixRow = {
    svcId: string;
    standard: boolean;
    premium: boolean;
    lux: boolean;
    customPrice: number;
  };

  const matrix: MatrixRow[] = [
    {
      svcId: svcReturnGift.id,
      standard: true,
      premium: true,
      lux: true,
      customPrice: 250000,
    },
    {
      svcId: svcVideoInvites.id,
      standard: false,
      premium: true,
      lux: true,
      customPrice: 500000,
    },
    {
      svcId: svcThemeDecor.id,
      standard: true,
      premium: true,
      lux: true,
      customPrice: 0,
    },
    {
      svcId: svcDigitalInvites.id,
      standard: true,
      premium: true,
      lux: true,
      customPrice: 150000,
    },
    {
      svcId: svcCustomBackdrop.id,
      standard: false,
      premium: true,
      lux: true,
      customPrice: 800000,
    },
    {
      svcId: svcPersonalized.id,
      standard: false,
      premium: true,
      lux: true,
      customPrice: 600000,
    },
    {
      svcId: svcActivities.id,
      standard: false,
      premium: false,
      lux: true,
      customPrice: 1200000,
    },
    {
      svcId: svcOrganiser.id,
      standard: false,
      premium: false,
      lux: true,
      customPrice: 1500000,
    },
    {
      svcId: svcPhotoDoc.id,
      standard: false,
      premium: false,
      lux: true,
      customPrice: 1000000,
    },
    {
      svcId: svcBalloons.id,
      standard: true,
      premium: true,
      lux: true,
      customPrice: 300000,
    },
    {
      svcId: svcWelcomeBoard.id,
      standard: true,
      premium: true,
      lux: true,
      customPrice: 200000,
    },
  ];

  for (const row of matrix) {
    await prisma.extraService.update({
      where: { id: row.svcId },
      data: { customizationPriceInPaise: row.customPrice },
    });
  }

  const packageServiceItems: Array<{
    packageId: string;
    extraServiceId: string;
    isIncluded: boolean;
    displayOrder: number;
  }> = [];

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i]!;
    packageServiceItems.push(
      {
        packageId: standardPkg.id,
        extraServiceId: row.svcId,
        isIncluded: row.standard,
        displayOrder: i,
      },
      {
        packageId: premiumPkg.id,
        extraServiceId: row.svcId,
        isIncluded: row.premium,
        displayOrder: i,
      },
      {
        packageId: luxPkg.id,
        extraServiceId: row.svcId,
        isIncluded: row.lux,
        displayOrder: i,
      },
    );
  }

  await prisma.packageServiceItem.createMany({ data: packageServiceItems });

  const premiumVideoItem = await prisma.packageServiceItem.findFirst({
    where: { packageId: premiumPkg.id, extraServiceId: svcVideoInvites.id },
  });

  // ── Kids Birthday Themes ─────────────────────────────────────────────────────
  const spaceTheme = await prisma.theme.create({
    data: {
      title: "Space Theme Celebration",
      slug: "space-theme",
      shortDescription:
        "A cosmic adventure beyond imagination! Turn your child's birthday into an exciting space mission.",
      storyDescription:
        "Our Space Birthday Theme creates an immersive celebration where every detail follows one carefully crafted story — from personalised invitations to themed experiences and thoughtful keepsakes.",
      audienceNote: "Cosmic & Adventurous · Ages 4–10",
      heroImageId: spaceMedia.id,
      ogImageId: spaceMedia.id,
      isActive: true,
      displayOrder: 1,
      seoTitle: "Space Theme Birthday Celebration | Vaibhav Celebrations",
      seoDescription:
        "Launch into an unforgettable space birthday celebration — immersive, themed, and memorable for curious young explorers.",
    },
  });

  const cocomelonTheme = await prisma.theme.create({
    data: {
      title: "Cocomelon Theme Celebration",
      slug: "cocomelon-theme",
      shortDescription:
        "Fun, colors and joy with Cocomelon & friends! Bring your child's favourite Cocomelon world to life.",
      storyDescription:
        "Every element follows one beautiful theme, creating a seamless experience that children love and parents genuinely enjoy.",
      audienceNote: "Musical & Joyful · Ages 1–4",
      heroImageId: cocomelonMedia.id,
      ogImageId: cocomelonMedia.id,
      isActive: true,
      displayOrder: 2,
      seoTitle: "Cocomelon Theme Birthday Celebration | Vaibhav Celebrations",
      seoDescription:
        "A joyful Cocomelon birthday celebration with music, laughter, and beautifully planned details for toddlers.",
    },
  });

  const princessTheme = await prisma.theme.create({
    data: {
      title: "Princess Birthday Theme",
      slug: "princess-theme",
      shortDescription:
        "An enchanting fairytale celebration! Create a magical birthday experience for your little princess.",
      storyDescription:
        "Our Princess Birthday Theme is thoughtfully designed to make your child feel truly special through elegant details and beautifully coordinated moments.",
      audienceNote: "Magical & Elegant · Ages 3–8",
      heroImageId: princessMedia.id,
      ogImageId: princessMedia.id,
      isActive: true,
      displayOrder: 3,
      seoTitle: "Princess Birthday Theme Celebration | Vaibhav Celebrations",
      seoDescription:
        "A magical princess birthday celebration with enchanting fairytale details for young dreamers.",
    },
  });

  const jungleTheme = await prisma.theme.create({
    data: {
      title: "Jungle Safari Birthday Theme",
      slug: "jungle-safari-theme",
      shortDescription:
        "Step into a world of adventure! A celebration inspired by the beauty of the jungle.",
      storyDescription:
        "Every part of the celebration follows one beautifully connected theme — from personalised invitations to immersive experiences and thoughtful keepsakes.",
      audienceNote: "Wild & Fun · Ages 2–8",
      heroImageId: jungleMedia.id,
      ogImageId: jungleMedia.id,
      isActive: true,
      displayOrder: 4,
      seoTitle: "Jungle Safari Birthday Theme | Vaibhav Celebrations",
      seoDescription:
        "A wild jungle safari birthday adventure with immersive experiences for young animal lovers.",
    },
  });

  await prisma.themePackage.createMany({
    data: [
      { themeId: spaceTheme.id, packageId: standardPkg.id },
      { themeId: spaceTheme.id, packageId: premiumPkg.id },
      { themeId: spaceTheme.id, packageId: luxPkg.id },
      { themeId: cocomelonTheme.id, packageId: standardPkg.id },
      { themeId: cocomelonTheme.id, packageId: premiumPkg.id },
      { themeId: cocomelonTheme.id, packageId: luxPkg.id },
      { themeId: princessTheme.id, packageId: standardPkg.id },
      { themeId: princessTheme.id, packageId: premiumPkg.id },
      { themeId: princessTheme.id, packageId: luxPkg.id },
      { themeId: jungleTheme.id, packageId: standardPkg.id },
      { themeId: jungleTheme.id, packageId: premiumPkg.id },
      { themeId: jungleTheme.id, packageId: luxPkg.id },
    ],
  });

  const sampleAssetDefs: {
    type: SampleAssetType;
    title: string;
    mediaId: string;
  }[] = [
    {
      type: SampleAssetType.DIGITAL_INVITE,
      title: "Digital Birthday Invite",
      mediaId: sampleInviteMedia.id,
    },
    {
      type: SampleAssetType.ACTIVITY_KIT,
      title: "Activity Corner Preview",
      mediaId: galleryBalloons.id,
    },
    {
      type: SampleAssetType.RETURN_GIFT_PREVIEW,
      title: "Return Gift Preview",
      mediaId: galleryCake.id,
    },
    {
      type: SampleAssetType.OTHER,
      title: "Custom Branding Sample",
      mediaId: heroMedia.id,
    },
  ];

  for (const theme of [
    spaceTheme,
    cocomelonTheme,
    princessTheme,
    jungleTheme,
  ]) {
    for (let i = 0; i < sampleAssetDefs.length; i++) {
      const def = sampleAssetDefs[i]!;
      await prisma.themeSampleAsset.create({
        data: {
          themeId: theme.id,
          type: def.type,
          title: `${theme.title} — ${def.title}`,
          mediaId: def.mediaId,
          description: `Sample ${def.title.toLowerCase()} for ${theme.title}`,
          displayOrder: i + 1,
        },
      });
    }
  }

  // ── Gallery (kids birthday) ──────────────────────────────────────────────────
  const tagGeneral = await prisma.galleryTag.create({
    data: { name: "General" },
  });
  const tagSpace = await prisma.galleryTag.create({ data: { name: "Space" } });
  const tagCocomelon = await prisma.galleryTag.create({
    data: { name: "Cocomelon" },
  });
  const tagPrincess = await prisma.galleryTag.create({
    data: { name: "Princess" },
  });
  const tagJungle = await prisma.galleryTag.create({
    data: { name: "Jungle Safari" },
  });

  type GalleryDef = {
    mediaId: string;
    caption: string;
    altText: string;
    themeId?: string;
    ctaSlug?: string;
    tag: typeof tagGeneral;
    order: number;
  };
  const galleryDefs: GalleryDef[] = [
    {
      mediaId: galleryBalloons.id,
      caption: "Balloon Celebration Setup",
      altText: "Colorful birthday balloon celebration",
      tag: tagGeneral,
      order: 1,
    },
    {
      mediaId: gallerySetup.id,
      caption: "Party Lights & Décor",
      altText: "Beautiful party decorations with lights",
      tag: tagGeneral,
      order: 2,
    },
    {
      mediaId: galleryCake.id,
      caption: "Gift Wrapping Station",
      altText: "Beautifully wrapped birthday gifts",
      tag: tagGeneral,
      order: 3,
    },
    {
      mediaId: spaceMedia.id,
      caption: "Space Theme Setup",
      altText: "Space themed balloon setup",
      tag: tagSpace,
      order: 4,
      themeId: spaceTheme.id,
      ctaSlug: "space-theme",
    },
    {
      mediaId: gallerySetup.id,
      caption: "Kids Birthday Celebration",
      altText: "Children celebrating birthday",
      tag: tagGeneral,
      order: 5,
    },
    {
      mediaId: galleryCake.id,
      caption: "Custom Birthday Cake",
      altText: "Custom themed birthday cake",
      tag: tagCocomelon,
      order: 6,
      themeId: cocomelonTheme.id,
      ctaSlug: "cocomelon-theme",
    },
    {
      mediaId: princessMedia.id,
      caption: "Pink Princess Setup",
      altText: "Pink themed party decorations",
      tag: tagPrincess,
      order: 7,
      themeId: princessTheme.id,
      ctaSlug: "princess-theme",
    },
    {
      mediaId: jungleMedia.id,
      caption: "Jungle Theme Décor",
      altText: "Jungle safari themed party setup",
      tag: tagJungle,
      order: 8,
      themeId: jungleTheme.id,
      ctaSlug: "jungle-safari-theme",
    },
    {
      mediaId: galleryBalloons.id,
      caption: "Happy Birthday Moment",
      altText: "Birthday celebration with family",
      tag: tagPrincess,
      order: 9,
    },
    {
      mediaId: galleryCake.id,
      caption: "Activity Corner",
      altText: "Kids activity corner at party",
      tag: tagGeneral,
      order: 10,
    },
    {
      mediaId: spaceMedia.id,
      caption: "Party Vibes",
      altText: "Fun party atmosphere with confetti",
      tag: tagSpace,
      order: 11,
      themeId: spaceTheme.id,
      ctaSlug: "space-theme",
    },
    {
      mediaId: cocomelonMedia.id,
      caption: "Grand Event Setup",
      altText: "Complete event setup",
      tag: tagCocomelon,
      order: 12,
      themeId: cocomelonTheme.id,
      ctaSlug: "cocomelon-theme",
    },
  ];

  for (const def of galleryDefs) {
    const image = await prisma.galleryImage.create({
      data: {
        mediaId: def.mediaId,
        caption: def.caption,
        altText: def.altText,
        themeId: def.themeId ?? null,
        ctaType: def.themeId ? GalleryCtaType.THEME : GalleryCtaType.NONE,
        ctaTargetSlug: def.ctaSlug ?? null,
        isActive: true,
        displayOrder: def.order,
      },
    });
    await prisma.galleryImageTag.create({
      data: { galleryImageId: image.id, tagId: def.tag.id },
    });
  }

  // ── Testimonials (kids birthday) ─────────────────────────────────────────────
  await prisma.testimonial.createMany({
    data: [
      {
        customerName: "Priya Sharma",
        content:
          "My son's Space Theme birthday was absolutely out of this world! Every detail was perfectly planned and the kids were amazed.",
        rating: 5,
        subjectType: TestimonialSubjectType.THEME,
        themeId: spaceTheme.id,
        isFeatured: true,
        isActive: true,
      },
      {
        customerName: "Ananya Mehta",
        content:
          "The Cocomelon theme was a dream come true for our toddler. From the balloons to the cake, everything was perfect!",
        rating: 5,
        subjectType: TestimonialSubjectType.THEME,
        themeId: cocomelonTheme.id,
        isFeatured: true,
        isActive: true,
      },
      {
        customerName: "Sunita Kapoor",
        content:
          "Our daughter felt like a real princess! The Premium package was worth every rupee — seamless coordination and stunning decor.",
        rating: 5,
        subjectType: TestimonialSubjectType.PACKAGE,
        packageId: premiumPkg.id,
        isFeatured: true,
        isActive: true,
      },
      {
        customerName: "Ravi & Neha Gupta",
        content:
          "The Jungle Safari theme had kids running around with excitement. Best birthday party we've ever hosted!",
        rating: 5,
        subjectType: TestimonialSubjectType.THEME,
        themeId: jungleTheme.id,
        isFeatured: false,
        isActive: true,
      },
    ],
  });

  // ── FAQs (kids birthday) ─────────────────────────────────────────────────────
  const faqData: { category: string; question: string; answer: string }[] = [
    {
      category: "Booking",
      question: "How far in advance should I book a birthday celebration?",
      answer:
        "We recommend booking at least 4–6 weeks in advance. For weekends and holidays, book 2–3 months ahead.",
    },
    {
      category: "Booking",
      question: "Can I visit before booking?",
      answer:
        "Yes! Schedule a free consultation or visit our showroom to see setups in person.",
    },
    {
      category: "Packages",
      question: "What is included in the base package price?",
      answer:
        "Each package includes themed décor, balloons, a welcome board, and on-day coordination.",
    },
    {
      category: "Packages",
      question: "Can I upgrade my package after booking?",
      answer:
        "Yes, upgrades are possible subject to availability. Contact our team at least 2 weeks before the event.",
    },
    {
      category: "Themes",
      question: "Can I mix elements from different themes?",
      answer:
        "Absolutely! Our design team can create a custom blend. Share your references during consultation.",
    },
    {
      category: "Themes",
      question: "Do you have themes other than the four shown?",
      answer:
        "Yes — we offer many more themes including Superhero, Frozen, Cars, Dinosaur, and custom designs.",
    },
    {
      category: "Venue",
      question: "How many guests can be accommodated?",
      answer:
        "Our venue accommodates 20–150 guests for indoor setups and up to 200 for outdoor celebrations.",
    },
    {
      category: "Payments",
      question: "What is the payment schedule?",
      answer:
        "50% advance on booking confirmation, 50% one week before the event.",
    },
    {
      category: "Payments",
      question: "Do you accept UPI and cards?",
      answer:
        "Yes, we accept UPI, credit/debit cards, and bank transfers via Razorpay.",
    },
    {
      category: "General",
      question: "Do you provide a photographer?",
      answer:
        "Photo documentation is available as an add-on with the Premium and Lux packages.",
    },
  ];

  for (let i = 0; i < faqData.length; i++) {
    const item = faqData[i]!;
    await prisma.fAQ.create({
      data: { ...item, displayOrder: i + 1, isActive: true },
    });
  }

  // ── Legal Pages (all types) ──────────────────────────────────────────────────
  for (const type of Object.values(LegalPageType)) {
    await prisma.legalPage.create({
      data: {
        type,
        title: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        bodyHtml: `<h1>${type.replace(/_/g, " ")}</h1><p>This is placeholder legal content for development. Replace with lawyer-reviewed text before go-live.</p>`,
        publishedAt: new Date(),
      },
    });
  }

  // ── Site Metadata (kids birthday) ────────────────────────────────────────────
  const metadataPages: {
    pageKey: string;
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
  }[] = [
    {
      pageKey: "home",
      metaTitle: "Kids Birthday Celebrations | Vaibhav Celebrations",
      metaDescription:
        "Thoughtfully curated kids birthday celebrations with Space, Cocomelon, Princess, and Jungle Safari themes in Jaipur.",
      canonicalUrl: "https://vaibhavcelebrations.in",
    },
    {
      pageKey: "themes",
      metaTitle: "Birthday Themes for Kids | Vaibhav Celebrations",
      metaDescription:
        "Choose from Space, Cocomelon, Princess, Jungle Safari and many more kids birthday themes.",
      canonicalUrl: "https://vaibhavcelebrations.in/themes",
    },
    {
      pageKey: "packages",
      metaTitle: "Birthday Party Packages & Pricing | Vaibhav Celebrations",
      metaDescription:
        "Standard, Premium, and Lux celebration packages for unforgettable kids birthdays.",
      canonicalUrl: "https://vaibhavcelebrations.in/packages",
    },
    {
      pageKey: "gallery",
      metaTitle: "Birthday Celebration Gallery | Vaibhav Celebrations",
      metaDescription:
        "Browse real kids birthday celebration photos from Vaibhav Celebrations.",
      canonicalUrl: "https://vaibhavcelebrations.in/gallery",
    },
    {
      pageKey: "contact",
      metaTitle: "Contact Us | Vaibhav Celebrations",
      metaDescription:
        "Book a consultation or plan your child's dream birthday celebration today.",
      canonicalUrl: "https://vaibhavcelebrations.in/contact",
    },
    {
      pageKey: "theme:space-theme",
      metaTitle: "Space Theme Birthday | Vaibhav Celebrations",
      metaDescription:
        "Launch into an unforgettable space birthday — cosmic, immersive, and magical.",
      canonicalUrl: "https://vaibhavcelebrations.in/themes/space-theme",
    },
    {
      pageKey: "theme:cocomelon-theme",
      metaTitle: "Cocomelon Theme Birthday | Vaibhav Celebrations",
      metaDescription:
        "A joyful Cocomelon birthday with music, laughter, and beautifully planned details.",
      canonicalUrl: "https://vaibhavcelebrations.in/themes/cocomelon-theme",
    },
    {
      pageKey: "theme:princess-theme",
      metaTitle: "Princess Birthday Theme | Vaibhav Celebrations",
      metaDescription:
        "A magical princess birthday with enchanting fairytale details for young dreamers.",
      canonicalUrl: "https://vaibhavcelebrations.in/themes/princess-theme",
    },
    {
      pageKey: "theme:jungle-safari-theme",
      metaTitle: "Jungle Safari Birthday Theme | Vaibhav Celebrations",
      metaDescription:
        "A wild jungle safari birthday adventure with immersive experiences for young animal lovers.",
      canonicalUrl: "https://vaibhavcelebrations.in/themes/jungle-safari-theme",
    },
    {
      pageKey: "blog",
      metaTitle: "Kids Birthday Blog | Vaibhav Celebrations",
      metaDescription:
        "Tips, trends, and inspiration for planning your child's perfect birthday celebration.",
      canonicalUrl: "https://vaibhavcelebrations.in/blog",
    },
  ];

  for (const meta of metadataPages) {
    await prisma.siteMetadata.create({
      data: {
        pageKey: meta.pageKey,
        metaTitle: meta.metaTitle,
        metaDescription: meta.metaDescription,
        canonicalUrl: meta.canonicalUrl,
        ogImageId: heroMedia.id,
        schemaJsonLd: {
          "@type": "LocalBusiness",
          name: "Vaibhav Celebrations",
        },
      },
    });
  }

  // ── Page Content (Home / About / Contact) ───────────────────────────────────
  const { defaultPageSections } =
    await import("../src/modules/pages/pages.service");
  for (const pageKey of ["home", "about", "contact"] as const) {
    const sections = JSON.parse(
      JSON.stringify(defaultPageSections[pageKey]),
    ) as {
      hero?: { backgroundImage?: { mediaId: string } };
    };
    if (pageKey === "home" && sections.hero) {
      sections.hero.backgroundImage = { mediaId: heroMedia.id };
    }
    await prisma.pageContent.create({
      data: { pageKey, sections: sections as object },
    });
  }

  // ── Blog ─────────────────────────────────────────────────────────────────────
  const catPlanning = await prisma.blogCategory.create({
    data: { name: "Wedding Planning" },
  });
  const catTrends = await prisma.blogCategory.create({
    data: { name: "Trends & Inspiration" },
  });
  const catVenue = await prisma.blogCategory.create({
    data: { name: "Venue Guide" },
  });

  const tagDestination = await prisma.blogTag.create({
    data: { name: "Destination" },
  });
  const tagBudget = await prisma.blogTag.create({
    data: { name: "Budget Tips" },
  });
  const tagDecor = await prisma.blogTag.create({
    data: { name: "Décor Ideas" },
  });

  const publishedPost = await prisma.blogPost.create({
    data: {
      title: "Top 10 Wedding Trends for 2026",
      slug: "top-wedding-trends-2026",
      excerpt:
        "From sustainable florals to intimate micro-weddings — discover what's trending this season.",
      contentHtml:
        "<p>2026 brings fresh inspiration for couples planning their big day. Sustainable florals, intimate gatherings, and personalized digital invites lead the way.</p>",
      featuredImageId: blogCoverMedia.id,
      authorName: "Content Editor",
      status: BlogStatus.PUBLISHED,
      publishedAt: new Date("2026-01-15"),
      isFeatured: true,
      seoTitle: "Top 10 Wedding Trends 2026 | Vaibhav Celebrations",
      seoDescription:
        "Discover the hottest wedding trends for 2026 at Vaibhav Celebrations.",
    },
  });

  const draftPost = await prisma.blogPost.create({
    data: {
      title: "How to Choose the Perfect Wedding Package",
      slug: "choose-perfect-wedding-package",
      excerpt:
        "A complete guide to matching your guest count, budget, and vision to the right package.",
      contentHtml: "<p>Draft content — to be published soon.</p>",
      authorName: "Content Editor",
      status: BlogStatus.DRAFT,
    },
  });

  const unpublishedPost = await prisma.blogPost.create({
    data: {
      title: "Farmhouse Wedding Venue Guide",
      slug: "farmhouse-wedding-venue-guide",
      excerpt: "Why a farmhouse venue might be perfect for your celebration.",
      contentHtml: "<p>Previously published, now under review.</p>",
      authorName: "Content Editor",
      status: BlogStatus.UNPUBLISHED,
      publishedAt: new Date("2025-12-01"),
    },
  });

  await prisma.blogPostCategory.createMany({
    data: [
      { blogPostId: publishedPost.id, categoryId: catTrends.id },
      { blogPostId: publishedPost.id, categoryId: catPlanning.id },
      { blogPostId: draftPost.id, categoryId: catPlanning.id },
      { blogPostId: unpublishedPost.id, categoryId: catVenue.id },
    ],
  });

  await prisma.blogPostTag.createMany({
    data: [
      { blogPostId: publishedPost.id, tagId: tagDecor.id },
      { blogPostId: publishedPost.id, tagId: tagBudget.id },
      { blogPostId: draftPost.id, tagId: tagBudget.id },
      { blogPostId: draftPost.id, tagId: tagDestination.id },
      { blogPostId: unpublishedPost.id, tagId: tagDecor.id },
    ],
  });

  // ── Events ───────────────────────────────────────────────────────────────────
  const augustEvent = await prisma.event.create({
    data: {
      title: "August Open Day — Visit & Book",
      slug: "august-open-day-2026",
      description:
        "Tour our farmhouse venue, meet our team, and enjoy complimentary refreshments. Special booking discounts for same-day confirmations.",
      bannerMediaId: eventBannerMedia.id,
      activities: [
        "Venue tour",
        "Theme showcase",
        "Q&A with event manager",
        "Complimentary refreshments",
      ],
      ageGroup: "All ages",
      venue: "Vaibhav Farmhouse, Surajkund Road, Faridabad",
      scheduleStartAt: new Date("2026-08-15T10:00:00+05:30"),
      scheduleEndAt: new Date("2026-08-15T18:00:00+05:30"),
      isRegistrationOpen: true,
      registrationFeeInPaise: 0,
      themeId: spaceTheme.id,
      pageTemplate: "CLASSIC_HERO",
      galleryMediaIds: [
        galleryBalloons.id,
        gallerySetup.id,
        eventBannerMedia.id,
      ],
      faqItems: [
        {
          question: "Is registration free?",
          answer: "Yes — Open Day registration is completely free.",
        },
        {
          question: "Do I need to book a package on the day?",
          answer: "No, but same-day bookings get exclusive discounts.",
        },
      ],
      ctaLabel: "Register for Free",
      ctaUrl: "#register",
      seoTitle: "August Open Day 2026 | Vaibhav Celebrations",
      seoDescription:
        "Visit Vaibhav Celebrations on August 15. Tour the venue and get exclusive booking offers.",
      isActive: true,
    },
  });

  const septemberEvent = await prisma.event.create({
    data: {
      title: "Bridal Preview Evening",
      slug: "bridal-preview-september-2026",
      description:
        "An exclusive evening showcasing our latest themes, packages, and vendor partners.",
      bannerMediaId: heroMedia.id,
      activities: [
        "Theme walkthrough",
        "Vendor meet & greet",
        "Package comparison session",
      ],
      venue: "Vaibhav Farmhouse, Surajkund Road, Faridabad",
      scheduleStartAt: new Date("2026-09-20T11:00:00+05:30"),
      scheduleEndAt: new Date("2026-09-20T15:00:00+05:30"),
      isRegistrationOpen: true,
      registrationFeeInPaise: 50000,
      themeId: cocomelonTheme.id,
      pageTemplate: "EDITORIAL_SPLIT",
      galleryMediaIds: [galleryBalloons.id, heroMedia.id],
      faqItems: [
        {
          question: "Is there an entry fee?",
          answer: "Yes, ₹500 per guest — adjustable against your booking.",
        },
      ],
      ctaLabel: "Reserve Your Seat",
      ctaUrl: "#register",
      isActive: true,
    },
  });

  // Third template demo (festive / campaign)
  await prisma.event.create({
    data: {
      title: "Festive Celebration Fair",
      slug: "festive-celebration-fair-2026",
      description:
        "A vibrant open fair with live décor demos, kids activities, and limited-time festive package offers — perfect for ad campaigns.",
      bannerMediaId: eventBannerMedia.id,
      activities: [
        "Live décor demos",
        "Kids activity corner",
        "Festive package launches",
        "Photo booth",
      ],
      ageGroup: "Families & kids",
      venue: "Vaibhav Farmhouse, Surajkund Road, Faridabad",
      scheduleStartAt: new Date("2026-10-12T10:00:00+05:30"),
      scheduleEndAt: new Date("2026-10-12T19:00:00+05:30"),
      isRegistrationOpen: true,
      registrationFeeInPaise: 0,
      themeId: jungleTheme.id,
      pageTemplate: "FESTIVE_IMMERSIVE",
      galleryMediaIds: [gallerySetup.id, galleryCake.id],
      faqItems: [
        {
          question: "Can I walk in without registering?",
          answer:
            "Registration helps us plan capacity — please register online.",
        },
      ],
      ctaLabel: "Join the Fair",
      ctaUrl: "#register",
      seoTitle: "Festive Celebration Fair 2026 | Vaibhav Celebrations",
      isActive: true,
    },
  });

  // ── Popups (all placements) ──────────────────────────────────────────────────
  await prisma.popup.create({
    data: {
      title: "August Open Day — Register Now!",
      bodyText:
        "Join us on August 15 for a free venue tour and exclusive booking discounts.",
      ctaLabel: "Register Free",
      ctaUrl: "/events/august-open-day-2026",
      imageId: eventBannerMedia.id,
      placements: [
        PopupPlacement.HOMEPAGE,
        PopupPlacement.THEMES_PAGE,
        PopupPlacement.PACKAGES_PAGE,
      ],
      linkedEventId: augustEvent.id,
      triggerAfterSeconds: 5,
      isActive: true,
      startsAt: new Date("2026-07-01"),
      endsAt: new Date("2026-08-14"),
    },
  });

  await prisma.popup.create({
    data: {
      title: "Book Your 2026 Wedding Today",
      bodyText:
        "Limited dates available for Oct–Feb season. Secure your date with 40% advance.",
      ctaLabel: "Check Availability",
      ctaUrl: "/contact",
      placements: [PopupPlacement.GALLERY_PAGE],
      triggerAfterSeconds: 8,
      isActive: true,
    },
  });

  // ── Customers & CRM ──────────────────────────────────────────────────────────
  const customer1 = await prisma.customer.create({
    data: {
      fullName: "Priya Sharma",
      email: "priya.sharma@example.com",
      phone: "+919876543210",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      fullName: "Ananya Mehta",
      email: "ananya.mehta@example.com",
      phone: "+919123456789",
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      fullName: "Rohit Verma",
      email: "rohit.verma@example.com",
      phone: "+919988776655",
    },
  });

  await prisma.customerNote.createMany({
    data: [
      {
        customerId: customer1.id,
        note: "Interested in Royal Mandap + Gold package for March 2027. Follow up after Open Day.",
        authorAdminUserId: opsAdmin.id,
      },
      {
        customerId: customer2.id,
        note: "Referred by Priya Sharma. Wants Garden Bloom theme, ~150 guests.",
        authorAdminUserId: opsAdmin.id,
      },
    ],
  });

  // ── Chatbot Session ──────────────────────────────────────────────────────────
  const chatbotSession = await prisma.chatbotSession.create({
    data: {
      path: [
        { step: "welcome", answer: null },
        { step: "package_interest", answer: "Premium" },
        { step: "guest_count", answer: "180" },
        { step: "contact", answer: "+919555555555" },
      ],
      resultTag: "qualified_lead",
    },
  });

  // ── Leads (all sources & statuses) ───────────────────────────────────────────
  const leadSources = Object.values(LeadSource);
  const leadStatuses = Object.values(LeadStatus);

  for (let i = 0; i < leadSources.length; i++) {
    const source = leadSources[i]!;
    await prisma.lead.create({
      data: {
        name: `Lead ${i + 1} — ${source}`,
        email: `lead${i + 1}@example.com`,
        phone: `+91900000${String(i).padStart(4, "0")}`,
        source,
        status: leadStatuses[i % leadStatuses.length]!,
        interestArea: i % 2 === 0 ? "Premium" : "Royal Mandap",
        message: `Inquiry via ${source}. Looking for wedding venue in Jaipur.`,
        customerId: i === 0 ? customer1.id : undefined,
        chatbotSessionId:
          source === LeadSource.CHATBOT ? chatbotSession.id : undefined,
      },
    });
  }

  // ── Consultation Requests (all statuses) ─────────────────────────────────────
  const today = new Date();
  await prisma.consultationRequest.create({
    data: {
      name: "Kavita Singh",
      email: "kavita.singh@example.com",
      phone: "+919876111222",
      eventDate: new Date("2027-03-15"),
      childOrEventDetails: "Adult wedding ceremony, 180 guests",
      customRequirements:
        "Would like to discuss Gold package with Royal Mandap theme.",
      advanceNoticeDays: 240,
      belowMinimumNotice: false,
      status: ConsultationStatus.PENDING,
      customerId: customer1.id,
    },
  });

  await prisma.consultationRequest.create({
    data: {
      name: "Urgent Couple",
      email: "urgent@example.com",
      phone: "+919876333444",
      eventDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
      childOrEventDetails: "Birthday celebration, 50 guests",
      customRequirements: "Need venue in 1 week — is anything available?",
      advanceNoticeDays: 7,
      belowMinimumNotice: true,
      status: ConsultationStatus.PENDING,
    },
  });

  await prisma.consultationRequest.create({
    data: {
      name: "Confirmed Visitor",
      email: "confirmed@example.com",
      phone: "+919876555666",
      eventDate: new Date("2027-12-05"),
      childOrEventDetails: "Lux celebration, 80 guests",
      customRequirements: "Outdoor ceremony preferred with indoor backup.",
      advanceNoticeDays: 500,
      belowMinimumNotice: false,
      status: ConsultationStatus.SCHEDULED,
      customerId: customer2.id,
    },
  });

  await prisma.consultationRequest.create({
    data: {
      name: "Reviewed Inquiry",
      email: "reviewed@example.com",
      phone: "+919876777888",
      eventDate: new Date("2027-06-20"),
      advanceNoticeDays: 365,
      belowMinimumNotice: false,
      status: ConsultationStatus.REVIEWED,
    },
  });

  await prisma.consultationRequest.create({
    data: {
      name: "Completed Consultation",
      email: "completed@example.com",
      phone: "+919876999000",
      eventDate: new Date("2026-11-20"),
      advanceNoticeDays: 120,
      belowMinimumNotice: false,
      status: ConsultationStatus.COMPLETED,
      customerId: customer3.id,
    },
  });

  await prisma.consultationRequest.create({
    data: {
      name: "Declined Request",
      email: "declined@example.com",
      phone: "+919876000111",
      eventDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
      advanceNoticeDays: 3,
      belowMinimumNotice: true,
      status: ConsultationStatus.DECLINED,
    },
  });

  // ── Event Registrations (all payment statuses) ───────────────────────────────
  await prisma.eventRegistration.createMany({
    data: [
      {
        eventId: augustEvent.id,
        name: "Neha Gupta",
        email: "neha.gupta@example.com",
        phone: "+919111222333",
        guestCount: 2,
        notes: "Excited to visit the venue!",
        paymentStatus: PaymentStatus.NOT_REQUIRED,
      },
      {
        eventId: augustEvent.id,
        name: "Amit & Pooja",
        email: "amit.pooja@example.com",
        phone: "+919444555666",
        guestCount: 2,
        paymentStatus: PaymentStatus.NOT_REQUIRED,
      },
      {
        eventId: septemberEvent.id,
        name: "Divya Reddy",
        email: "divya.reddy@example.com",
        phone: "+919777888999",
        guestCount: 1,
        paymentStatus: PaymentStatus.PAID,
        amountPaidInPaise: 50000,
        razorpayOrderId: "order_dev_sep001",
        razorpayPaymentId: "pay_dev_sep001",
      },
      {
        eventId: septemberEvent.id,
        name: "Pending Payment User",
        email: "pending@example.com",
        phone: "+919333444555",
        guestCount: 2,
        paymentStatus: PaymentStatus.PENDING,
        amountPaidInPaise: 0,
        razorpayOrderId: "order_dev_sep002",
      },
      {
        eventId: septemberEvent.id,
        name: "Failed Payment User",
        email: "failed@example.com",
        phone: "+919666777888",
        guestCount: 1,
        paymentStatus: PaymentStatus.FAILED,
        razorpayOrderId: "order_dev_sep003",
      },
    ],
  });

  // ── Guest Verification Tokens ────────────────────────────────────────────────
  await prisma.guestVerificationToken.create({
    data: {
      referenceCode: "CONSULT-001",
      referenceType: "CONSULTATION",
      email: "urgent@example.com",
      otpHash: await bcrypt.hash("654321", 10),
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attemptCount: 2,
    },
  });

  // ── Audit Logs ───────────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        adminUserId: superAdmin.id,
        action: "ADMIN_LOGIN",
        entityType: "AdminUser",
        entityId: superAdmin.id,
        metadata: { userAgent: "seed-script" },
        ipAddress: "127.0.0.1",
      },
      {
        adminUserId: contentAdmin.id,
        action: "BLOG_PUBLISHED",
        entityType: "BlogPost",
        entityId: publishedPost.id,
        metadata: { slug: "top-wedding-trends-2026" },
      },
      {
        adminUserId: superAdmin.id,
        action: "SETTINGS_UPDATED",
        entityType: "OperationalSetting",
        entityId: "gst_percent",
        metadata: { value: "18" },
      },
    ],
  });

  console.log("\n✅ Seed completed successfully!");
  console.log("─────────────────────────────────────────");
  console.log("Admin login:");
  console.log(
    `  Email:    ${process.env.SEED_ADMIN_EMAIL ?? "admin@vaibhavcelebrations.in"}`,
  );
  console.log(`  Password: ${adminPassword}`);
  console.log("\nStaff logins (password: ChangeMe_Staff_123!):");
  console.log("  operations@vaibhavcelebrations.in (OPERATIONS)");
  console.log("  content@vaibhavcelebrations.in (CONTENT_EDITOR)");
  console.log("─────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
