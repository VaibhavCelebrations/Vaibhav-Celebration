import {
  AdminRole,
  BlogStatus,
  BookingStatus,
  CapacityScope,
  ConsultationStatus,
  GalleryCtaType,
  InvoiceLinkedType,
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

async function clearDevData() {
  const tables = [
    "AuditLog",
    "GuestVerificationToken",
    "BookingCustomization",
    "Invoice",
    "Booking",
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
    "LegalPage",
    "Popup",
    "FAQ",
    "Testimonial",
    "GalleryImageTag",
    "GalleryImage",
    "GalleryTag",
    "PackageCustomizationOption",
    "PackageAddOn",
    "AddOnService",
    "PackageFeature",
    "ThemePackage",
    "ThemeSampleAsset",
    "Theme",
    "Package",
    "MediaAsset",
    "BookingCapacityRule",
    "OperationalSetting",
    "SequenceCounter",
    "AdminUser",
  ] as const;

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
}

async function main() {
  console.log("Clearing existing dev data...");
  await clearDevData();

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe_SuperAdmin_123!";
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
      { key: "BOOKING-2026", lastValue: 3 },
      { key: "INVOICE-2026-27", lastValue: 3 },
    ],
  });

  // ── Operational Settings ──────────────────────────────────────────────────
  await prisma.operationalSetting.createMany({
    data: [
      { key: "gst_percent", value: "18" },
      { key: "max_bookings_per_day", value: "2" },
      { key: "min_consultation_advance_days", value: "15" },
      { key: "business_name", value: "Vaibhav Celebrations" },
      { key: "business_phone", value: "+91 98765 43210" },
      { key: "business_email", value: "hello@vaibhavcelebrations.in" },
      { key: "business_address", value: "Vaibhav Farmhouse, Near Surajkund, Faridabad, Haryana 121009" },
      { key: "whatsapp_number", value: "+919876543210" },
      { key: "instagram_url", value: "https://instagram.com/vaibhavcelebrations" },
      { key: "facebook_url", value: "https://facebook.com/vaibhavcelebrations" },
    ],
  });

  // ── Booking Capacity Rules ─────────────────────────────────────────────────
  const today = new Date();
  const blockedDate = new Date(today);
  blockedDate.setDate(blockedDate.getDate() + 45);
  const overrideDate = new Date(today);
  overrideDate.setDate(overrideDate.getDate() + 60);

  await prisma.bookingCapacityRule.createMany({
    data: [
      { scope: CapacityScope.GLOBAL_DEFAULT, maxBookingsPerDay: 2, isBlocked: false },
      {
        scope: CapacityScope.SPECIFIC_DATE,
        specificDate: blockedDate,
        maxBookingsPerDay: 0,
        isBlocked: true,
      },
      {
        scope: CapacityScope.SPECIFIC_DATE,
        specificDate: overrideDate,
        maxBookingsPerDay: 3,
        isBlocked: false,
      },
    ],
  });

  // ── Media Assets ───────────────────────────────────────────────────────────
  const mediaAssets = await Promise.all([
    prisma.mediaAsset.create({
      data: {
        cdnKey: "dev/hero-home.jpg",
        url: img("dev/hero-home.jpg"),
        type: "image/jpeg",
        altText: "Vaibhav Celebrations farmhouse venue at sunset",
        width: 1920,
        height: 1080,
        sizeBytes: 245000,
        uploadedByAdminUserId: contentAdmin.id,
      },
    }),
    prisma.mediaAsset.create({
      data: {
        cdnKey: "dev/themes/royal-mandap.jpg",
        url: img("dev/themes/royal-mandap.jpg"),
        type: "image/jpeg",
        altText: "Royal Mandap theme decoration",
        width: 1600,
        height: 900,
        uploadedByAdminUserId: contentAdmin.id,
      },
    }),
    prisma.mediaAsset.create({
      data: {
        cdnKey: "dev/themes/garden-bloom.jpg",
        url: img("dev/themes/garden-bloom.jpg"),
        type: "image/jpeg",
        altText: "Garden Bloom outdoor theme",
        width: 1600,
        height: 900,
        uploadedByAdminUserId: contentAdmin.id,
      },
    }),
    prisma.mediaAsset.create({
      data: {
        cdnKey: "dev/themes/minimal-elegance.jpg",
        url: img("dev/themes/minimal-elegance.jpg"),
        type: "image/jpeg",
        altText: "Minimal Elegance theme setup",
        width: 1600,
        height: 900,
        uploadedByAdminUserId: contentAdmin.id,
      },
    }),
    prisma.mediaAsset.create({
      data: {
        cdnKey: "dev/gallery/ceremony-1.jpg",
        url: img("dev/gallery/ceremony-1.jpg"),
        type: "image/jpeg",
        altText: "Outdoor wedding ceremony",
        width: 1200,
        height: 800,
        uploadedByAdminUserId: contentAdmin.id,
      },
    }),
    prisma.mediaAsset.create({
      data: {
        cdnKey: "dev/gallery/reception-1.jpg",
        url: img("dev/gallery/reception-1.jpg"),
        type: "image/jpeg",
        altText: "Reception dinner setup",
        width: 1200,
        height: 800,
        uploadedByAdminUserId: contentAdmin.id,
      },
    }),
    prisma.mediaAsset.create({
      data: {
        cdnKey: "dev/blog/wedding-trends.jpg",
        url: img("dev/blog/wedding-trends.jpg"),
        type: "image/jpeg",
        altText: "2026 wedding trends blog cover",
        width: 1200,
        height: 630,
        uploadedByAdminUserId: contentAdmin.id,
      },
    }),
    prisma.mediaAsset.create({
      data: {
        cdnKey: "dev/events/august-open-day.jpg",
        url: img("dev/events/august-open-day.jpg"),
        type: "image/jpeg",
        altText: "August Open Day event banner",
        width: 1920,
        height: 600,
        uploadedByAdminUserId: contentAdmin.id,
      },
    }),
    prisma.mediaAsset.create({
      data: {
        cdnKey: "dev/sample/digital-invite-royal.jpg",
        url: img("dev/sample/digital-invite-royal.jpg"),
        type: "image/jpeg",
        altText: "Royal Mandap digital invite sample",
        width: 800,
        height: 1200,
        uploadedByAdminUserId: contentAdmin.id,
      },
    }),
    prisma.mediaAsset.create({
      data: {
        cdnKey: "dev/gallery/minimal-stage.jpg",
        url: img("dev/gallery/minimal-stage.jpg"),
        type: "image/jpeg",
        altText: "Minimal elegance stage with white drapes",
        width: 1200,
        height: 800,
        uploadedByAdminUserId: contentAdmin.id,
      },
    }),
  ]);

  const [
    heroMedia,
    royalMedia,
    gardenMedia,
    minimalMedia,
    gallery1Media,
    gallery2Media,
    blogCoverMedia,
    eventBannerMedia,
    sampleInviteMedia,
    gallery3Media,
  ] = mediaAssets;

  // ── Packages ─────────────────────────────────────────────────────────────────
  const silverPkg = await prisma.package.create({
    data: {
      title: "Silver Celebration",
      slug: "silver-celebration",
      priceInPaise: 14990000,
      tierRank: 1,
      isRecommended: false,
      isActive: true,
      isCustomizable: true,
      displayOrder: 1,
      description:
        "An elegant package for up to 100 guests with essential décor, seating, and coordination support.",
    },
  });

  const goldPkg = await prisma.package.create({
    data: {
      title: "Gold Celebration",
      slug: "gold-celebration",
      priceInPaise: 24990000,
      tierRank: 2,
      isRecommended: true,
      isActive: true,
      isCustomizable: true,
      displayOrder: 2,
      description:
        "Premium décor, extended hours, and dedicated event manager for up to 200 guests.",
    },
  });

  const platinumPkg = await prisma.package.create({
    data: {
      title: "Platinum Celebration",
      slug: "platinum-celebration",
      priceInPaise: 39990000,
      tierRank: 3,
      isRecommended: false,
      isActive: true,
      isCustomizable: true,
      displayOrder: 3,
      description:
        "Full-day celebration with premium themes, add-ons included, and VIP guest experience for up to 350 guests.",
    },
  });

  await prisma.packageFeature.createMany({
    data: [
      { packageId: silverPkg.id, label: "Basic floral décor", quantity: 1, unit: "set", displayOrder: 1 },
      { packageId: silverPkg.id, label: "Standard seating", quantity: 100, unit: "guests", displayOrder: 2 },
      { packageId: silverPkg.id, label: "Venue access", quantity: 6, unit: "hours", displayOrder: 3 },
      { packageId: goldPkg.id, label: "Premium theme selection", quantity: 1, displayOrder: 1 },
      { packageId: goldPkg.id, label: "Dedicated event manager", quantity: 1, displayOrder: 2 },
      { packageId: goldPkg.id, label: "Venue access", quantity: 8, unit: "hours", displayOrder: 3 },
      { packageId: goldPkg.id, label: "Welcome drink station", quantity: 1, displayOrder: 4 },
      { packageId: platinumPkg.id, label: "All Gold features included", quantity: 1, displayOrder: 1 },
      { packageId: platinumPkg.id, label: "Custom theme design", quantity: 1, displayOrder: 2 },
      { packageId: platinumPkg.id, label: "Full-day venue access", quantity: 12, unit: "hours", displayOrder: 3 },
      { packageId: platinumPkg.id, label: "Bridal suite access", quantity: 1, displayOrder: 4 },
      { packageId: platinumPkg.id, label: "Complimentary photography hour", quantity: 1, unit: "hour", displayOrder: 5, sampleAssetType: SampleAssetType.OTHER },
    ],
  });

  // ── Add-On Services ──────────────────────────────────────────────────────────
  const djAddon = await prisma.addOnService.create({
    data: {
      title: "DJ & Sound System",
      priceInPaise: 3500000,
      isActive: true,
      minQuantity: 1,
      maxQuantity: 1,
    },
  });

  const photoAddon = await prisma.addOnService.create({
    data: {
      title: "Photography Package",
      priceInPaise: 7500000,
      isActive: true,
      minQuantity: 1,
      maxQuantity: 1,
    },
  });

  const cateringAddon = await prisma.addOnService.create({
    data: {
      title: "Premium Catering",
      priceInPaise: 12000000,
      isActive: true,
      minQuantity: 1,
      maxQuantity: 200,
    },
  });

  await prisma.packageAddOn.createMany({
    data: [
      { packageId: silverPkg.id, addOnServiceId: djAddon.id, isDefaultIncluded: false },
      { packageId: silverPkg.id, addOnServiceId: photoAddon.id, isDefaultIncluded: false },
      { packageId: goldPkg.id, addOnServiceId: djAddon.id, isDefaultIncluded: true },
      { packageId: goldPkg.id, addOnServiceId: photoAddon.id, isDefaultIncluded: false },
      { packageId: platinumPkg.id, addOnServiceId: djAddon.id, isDefaultIncluded: true },
      { packageId: platinumPkg.id, addOnServiceId: photoAddon.id, isDefaultIncluded: true },
      { packageId: platinumPkg.id, addOnServiceId: cateringAddon.id, isDefaultIncluded: true },
    ],
  });

  const extraColumnOption = await prisma.packageCustomizationOption.create({
    data: {
      packageId: goldPkg.id,
      label: "Extra floral column",
      extraPriceInPaise: 1500000,
      minQuantity: 0,
      maxQuantity: 4,
      isActive: true,
      displayOrder: 1,
    },
  });

  await prisma.packageCustomizationOption.create({
    data: {
      packageId: goldPkg.id,
      label: "Premium stage backdrop upgrade",
      extraPriceInPaise: 2500000,
      minQuantity: 0,
      maxQuantity: 1,
      isActive: true,
      displayOrder: 2,
    },
  });

  await prisma.packageCustomizationOption.create({
    data: {
      packageId: platinumPkg.id,
      label: "Fireworks display",
      extraPriceInPaise: 5000000,
      minQuantity: 0,
      maxQuantity: 1,
      isActive: true,
      displayOrder: 1,
    },
  });

  // ── Themes ───────────────────────────────────────────────────────────────────
  const royalTheme = await prisma.theme.create({
    data: {
      title: "Royal Mandap",
      slug: "royal-mandap",
      shortDescription: "Regal traditions meet modern elegance",
      storyDescription:
        "Rich maroon and gold décor with ornate mandap, royal seating, and traditional floral arrangements.",
      audienceNote: "Ideal for traditional Hindu weddings with 150–300 guests",
      heroImageId: royalMedia.id,
      isActive: true,
      displayOrder: 1,
      seoTitle: "Royal Mandap Theme | Vaibhav Celebrations",
      seoDescription: "Experience regal wedding décor with our Royal Mandap theme at Vaibhav Farmhouse.",
    },
  });

  const gardenTheme = await prisma.theme.create({
    data: {
      title: "Garden Bloom",
      slug: "garden-bloom",
      shortDescription: "Fresh florals in an open-air paradise",
      storyDescription:
        "Pastel florals, garden arches, and natural greenery for a dreamy outdoor celebration.",
      audienceNote: "Perfect for daytime ceremonies and nature-loving couples",
      heroImageId: gardenMedia.id,
      isActive: true,
      displayOrder: 2,
      seoTitle: "Garden Bloom Theme | Vaibhav Celebrations",
      seoDescription: "Dreamy outdoor wedding theme with pastel florals and garden arches.",
    },
  });

  const minimalTheme = await prisma.theme.create({
    data: {
      title: "Minimal Elegance",
      slug: "minimal-elegance",
      shortDescription: "Less is more — refined and timeless",
      storyDescription:
        "Clean lines, neutral palette, and sophisticated minimal décor for contemporary couples.",
      audienceNote: "Best for intimate gatherings of 50–120 guests",
      heroImageId: minimalMedia.id,
      isActive: true,
      displayOrder: 3,
      seoTitle: "Minimal Elegance Theme | Vaibhav Celebrations",
      seoDescription: "Contemporary minimal wedding décor with clean lines and neutral tones.",
    },
  });

  await prisma.themePackage.createMany({
    data: [
      { themeId: royalTheme.id, packageId: silverPkg.id },
      { themeId: royalTheme.id, packageId: goldPkg.id },
      { themeId: royalTheme.id, packageId: platinumPkg.id },
      { themeId: gardenTheme.id, packageId: goldPkg.id, priceOverrideInPaise: 25990000 },
      { themeId: gardenTheme.id, packageId: platinumPkg.id },
      { themeId: minimalTheme.id, packageId: silverPkg.id },
      { themeId: minimalTheme.id, packageId: goldPkg.id },
    ],
  });

  const sampleAssetDefs: { type: SampleAssetType; title: string; mediaId: string }[] = [
    { type: SampleAssetType.DIGITAL_INVITE, title: "Digital Wedding Invite", mediaId: sampleInviteMedia.id },
    { type: SampleAssetType.VIDEO_INVITE, title: "Video Invite Preview", mediaId: royalMedia.id },
    { type: SampleAssetType.PARENT_PARTY_BRIEF, title: "Parent Party Brief", mediaId: gardenMedia.id },
    { type: SampleAssetType.COUNTDOWN_CARD, title: "Countdown Card", mediaId: minimalMedia.id },
    { type: SampleAssetType.ACTIVITY_KIT, title: "Kids Activity Kit", mediaId: gallery1Media.id },
    { type: SampleAssetType.RETURN_GIFT_PREVIEW, title: "Return Gift Preview", mediaId: gallery2Media.id },
    { type: SampleAssetType.OTHER, title: "Custom Branding Sample", mediaId: heroMedia.id },
  ];

  for (const theme of [royalTheme, gardenTheme, minimalTheme]) {
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

  // ── Gallery ──────────────────────────────────────────────────────────────────
  const tagWedding = await prisma.galleryTag.create({ data: { name: "Wedding" } });
  const tagReception = await prisma.galleryTag.create({ data: { name: "Reception" } });
  const tagOutdoor = await prisma.galleryTag.create({ data: { name: "Outdoor" } });
  const tagMandap = await prisma.galleryTag.create({ data: { name: "Mandap" } });

  const galleryImg1 = await prisma.galleryImage.create({
    data: {
      mediaId: gallery1Media.id,
      caption: "Sunset Mandap Ceremony",
      altText: gallery1Media.altText ?? "Outdoor wedding ceremony",
      themeId: royalTheme.id,
      ctaType: GalleryCtaType.THEME,
      ctaTargetSlug: "royal-mandap",
      isActive: true,
      displayOrder: 1,
    },
  });

  const galleryImg2 = await prisma.galleryImage.create({
    data: {
      mediaId: gallery2Media.id,
      caption: "Garden Reception Dinner",
      altText: gallery2Media.altText ?? "Reception dinner setup",
      themeId: gardenTheme.id,
      ctaType: GalleryCtaType.THEME,
      ctaTargetSlug: "garden-bloom",
      isActive: true,
      displayOrder: 2,
    },
  });

  const galleryImg3 = await prisma.galleryImage.create({
    data: {
      mediaId: gallery3Media.id,
      caption: "Minimal Stage Setup",
      altText: "Minimal elegance stage with white drapes",
      themeId: minimalTheme.id,
      ctaType: GalleryCtaType.BOOKING,
      ctaTargetSlug: "contact",
      isActive: true,
      displayOrder: 3,
    },
  });

  await prisma.galleryImageTag.createMany({
    data: [
      { galleryImageId: galleryImg1.id, tagId: tagWedding.id },
      { galleryImageId: galleryImg1.id, tagId: tagMandap.id },
      { galleryImageId: galleryImg1.id, tagId: tagOutdoor.id },
      { galleryImageId: galleryImg2.id, tagId: tagReception.id },
      { galleryImageId: galleryImg2.id, tagId: tagOutdoor.id },
      { galleryImageId: galleryImg3.id, tagId: tagWedding.id },
    ],
  });

  // ── Testimonials (all subject types) ─────────────────────────────────────────
  await prisma.testimonial.createMany({
    data: [
      {
        customerName: "Priya & Rahul Sharma",
        content:
          "Vaibhav Celebrations made our wedding absolutely magical. The Royal Mandap theme exceeded every expectation.",
        rating: 5,
        subjectType: TestimonialSubjectType.THEME,
        themeId: royalTheme.id,
        isFeatured: true,
        isActive: true,
      },
      {
        customerName: "Ananya & Vikram Mehta",
        content:
          "The Gold package was perfect value — everything was handled professionally from consultation to the final goodbye.",
        rating: 5,
        subjectType: TestimonialSubjectType.PACKAGE,
        packageId: goldPkg.id,
        isFeatured: true,
        isActive: true,
      },
      {
        customerName: "Sneha Kapoor",
        content:
          "We attended the August Open Day and booked the same week. The team is responsive, warm, and detail-oriented.",
        rating: 5,
        subjectType: TestimonialSubjectType.GENERAL,
        isFeatured: false,
        isActive: true,
      },
    ],
  });

  // ── FAQs (all categories as strings) ─────────────────────────────────────────
  const faqData: { category: string; question: string; answer: string }[] = [
    {
      category: "Booking",
      question: "How far in advance should I book?",
      answer: "We recommend booking at least 3–6 months ahead for peak wedding season (Oct–Feb).",
    },
    {
      category: "Booking",
      question: "Can I visit the venue before booking?",
      answer: "Yes! Schedule a free consultation or attend our monthly Open Day events.",
    },
    {
      category: "Packages",
      question: "What is included in the base package price?",
      answer: "Each package includes venue access, base décor, seating, and event coordination.",
    },
    {
      category: "Packages",
      question: "Can I upgrade my package after booking?",
      answer: "Yes, upgrades are possible subject to availability. Contact our operations team.",
    },
    {
      category: "Themes",
      question: "Can themes be customized?",
      answer: "Absolutely. Our design team can tailor colors, florals, and layout to match your vision.",
    },
    {
      category: "Venue",
      question: "What is the venue capacity?",
      answer: "Our farmhouse accommodates 50–350 guests depending on the package and setup.",
    },
    {
      category: "Venue",
      question: "Is parking available?",
      answer: "Yes, complimentary parking for up to 80 vehicles on premises.",
    },
    {
      category: "Payments",
      question: "What is the payment schedule?",
      answer: "40% advance on booking confirmation, 40% two weeks before event, 20% on event day.",
    },
    {
      category: "Payments",
      question: "Do you accept UPI and cards?",
      answer: "Yes, we accept UPI, credit/debit cards, and bank transfers via Razorpay.",
    },
    {
      category: "General",
      question: "Do you provide catering?",
      answer: "Catering is available as an add-on. We partner with trusted vendors for multi-cuisine menus.",
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

  // ── Site Metadata (all page keys) ────────────────────────────────────────────
  const metadataPages: { pageKey: string; metaTitle: string; metaDescription: string; canonicalUrl: string }[] = [
    {
      pageKey: "home",
      metaTitle: "Vaibhav Celebrations | Premium Farmhouse Weddings in Delhi NCR",
      metaDescription: "Premium farmhouse wedding venue near Surajkund, Faridabad. Book your dream celebration today.",
      canonicalUrl: "https://vaibhavcelebrations.in",
    },
    {
      pageKey: "themes",
      metaTitle: "Wedding Themes | Vaibhav Celebrations",
      metaDescription: "Explore Royal Mandap, Garden Bloom, and Minimal Elegance wedding themes.",
      canonicalUrl: "https://vaibhavcelebrations.in/themes",
    },
    {
      pageKey: "packages",
      metaTitle: "Wedding Packages & Pricing | Vaibhav Celebrations",
      metaDescription: "Silver, Gold, and Platinum wedding packages starting from ₹1.49L.",
      canonicalUrl: "https://vaibhavcelebrations.in/packages",
    },
    {
      pageKey: "gallery",
      metaTitle: "Wedding Gallery | Vaibhav Celebrations",
      metaDescription: "Browse real wedding photos from Vaibhav Celebrations farmhouse venue.",
      canonicalUrl: "https://vaibhavcelebrations.in/gallery",
    },
    {
      pageKey: "contact",
      metaTitle: "Contact Us | Vaibhav Celebrations",
      metaDescription: "Schedule a consultation or visit our farmhouse near Surajkund, Faridabad.",
      canonicalUrl: "https://vaibhavcelebrations.in/contact",
    },
    {
      pageKey: "theme:royal-mandap",
      metaTitle: "Royal Mandap Theme | Vaibhav Celebrations",
      metaDescription: "Regal maroon and gold wedding décor with ornate mandap setup.",
      canonicalUrl: "https://vaibhavcelebrations.in/themes/royal-mandap",
    },
    {
      pageKey: "theme:garden-bloom",
      metaTitle: "Garden Bloom Theme | Vaibhav Celebrations",
      metaDescription: "Pastel florals and garden arches for dreamy outdoor weddings.",
      canonicalUrl: "https://vaibhavcelebrations.in/themes/garden-bloom",
    },
    {
      pageKey: "theme:minimal-elegance",
      metaTitle: "Minimal Elegance Theme | Vaibhav Celebrations",
      metaDescription: "Contemporary minimal wedding décor with clean lines.",
      canonicalUrl: "https://vaibhavcelebrations.in/themes/minimal-elegance",
    },
    {
      pageKey: "blog",
      metaTitle: "Wedding Blog | Vaibhav Celebrations",
      metaDescription: "Tips, trends, and inspiration for planning your perfect wedding.",
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
        schemaJsonLd: { "@type": "LocalBusiness", name: "Vaibhav Celebrations" },
      },
    });
  }

  // ── Blog ─────────────────────────────────────────────────────────────────────
  const catPlanning = await prisma.blogCategory.create({ data: { name: "Wedding Planning" } });
  const catTrends = await prisma.blogCategory.create({ data: { name: "Trends & Inspiration" } });
  const catVenue = await prisma.blogCategory.create({ data: { name: "Venue Guide" } });

  const tagDestination = await prisma.blogTag.create({ data: { name: "Destination" } });
  const tagBudget = await prisma.blogTag.create({ data: { name: "Budget Tips" } });
  const tagDecor = await prisma.blogTag.create({ data: { name: "Décor Ideas" } });

  const publishedPost = await prisma.blogPost.create({
    data: {
      title: "Top 10 Wedding Trends for 2026",
      slug: "top-wedding-trends-2026",
      excerpt: "From sustainable florals to intimate micro-weddings — discover what's trending this season.",
      contentHtml: "<p>2026 brings fresh inspiration for couples planning their big day. Sustainable florals, intimate gatherings, and personalized digital invites lead the way.</p>",
      featuredImageId: blogCoverMedia.id,
      authorName: "Content Editor",
      status: BlogStatus.PUBLISHED,
      publishedAt: new Date("2026-01-15"),
      seoTitle: "Top 10 Wedding Trends 2026 | Vaibhav Celebrations",
      seoDescription: "Discover the hottest wedding trends for 2026 at Vaibhav Celebrations.",
    },
  });

  const draftPost = await prisma.blogPost.create({
    data: {
      title: "How to Choose the Perfect Wedding Package",
      slug: "choose-perfect-wedding-package",
      excerpt: "A complete guide to matching your guest count, budget, and vision to the right package.",
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
      activities: ["Venue tour", "Theme showcase", "Q&A with event manager", "Complimentary refreshments"],
      ageGroup: "All ages",
      venue: "Vaibhav Farmhouse, Surajkund Road, Faridabad",
      scheduleStartAt: new Date("2026-08-15T10:00:00+05:30"),
      scheduleEndAt: new Date("2026-08-15T18:00:00+05:30"),
      isRegistrationOpen: true,
      registrationFeeInPaise: 0,
      themeId: royalTheme.id,
      pageTemplate: "CLASSIC_HERO",
      galleryMediaIds: [gallery1Media.id, gallery2Media.id, eventBannerMedia.id],
      faqItems: [
        { question: "Is registration free?", answer: "Yes — Open Day registration is completely free." },
        { question: "Do I need to book a package on the day?", answer: "No, but same-day bookings get exclusive discounts." },
      ],
      ctaLabel: "Register for Free",
      ctaUrl: "#register",
      seoTitle: "August Open Day 2026 | Vaibhav Celebrations",
      seoDescription: "Visit Vaibhav Celebrations on August 15. Tour the venue and get exclusive booking offers.",
      isActive: true,
    },
  });

  const septemberEvent = await prisma.event.create({
    data: {
      title: "Bridal Preview Evening",
      slug: "bridal-preview-september-2026",
      description: "An exclusive evening showcasing our latest themes, packages, and vendor partners.",
      bannerMediaId: heroMedia.id,
      activities: ["Theme walkthrough", "Vendor meet & greet", "Package comparison session"],
      venue: "Vaibhav Farmhouse, Surajkund Road, Faridabad",
      scheduleStartAt: new Date("2026-09-20T11:00:00+05:30"),
      scheduleEndAt: new Date("2026-09-20T15:00:00+05:30"),
      isRegistrationOpen: true,
      registrationFeeInPaise: 50000,
      themeId: gardenTheme.id,
      pageTemplate: "EDITORIAL_SPLIT",
      galleryMediaIds: [gallery1Media.id, heroMedia.id],
      faqItems: [
        { question: "Is there an entry fee?", answer: "Yes, ₹500 per guest — adjustable against your booking." },
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
      activities: ["Live décor demos", "Kids activity corner", "Festive package launches", "Photo booth"],
      ageGroup: "Families & kids",
      venue: "Vaibhav Farmhouse, Surajkund Road, Faridabad",
      scheduleStartAt: new Date("2026-10-12T10:00:00+05:30"),
      scheduleEndAt: new Date("2026-10-12T19:00:00+05:30"),
      isRegistrationOpen: true,
      registrationFeeInPaise: 0,
      themeId: minimalTheme.id,
      pageTemplate: "FESTIVE_IMMERSIVE",
      galleryMediaIds: [gallery2Media.id, gallery3Media.id],
      faqItems: [
        { question: "Can I walk in without registering?", answer: "Registration helps us plan capacity — please register online." },
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
      bodyText: "Join us on August 15 for a free venue tour and exclusive booking discounts.",
      ctaLabel: "Register Free",
      ctaUrl: "/events/august-open-day-2026",
      imageId: eventBannerMedia.id,
      placements: [PopupPlacement.HOMEPAGE, PopupPlacement.THEMES_PAGE, PopupPlacement.PACKAGES_PAGE],
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
      bodyText: "Limited dates available for Oct–Feb season. Secure your date with 40% advance.",
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
        { step: "package_interest", answer: "Gold Celebration" },
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
        interestArea: i % 2 === 0 ? "Gold Celebration" : "Royal Mandap",
        message: `Inquiry via ${source}. Looking for wedding venue in Delhi NCR.`,
        customerId: i === 0 ? customer1.id : undefined,
        chatbotSessionId: source === LeadSource.CHATBOT ? chatbotSession.id : undefined,
      },
    });
  }

  // ── Consultation Requests (all statuses) ─────────────────────────────────────
  await prisma.consultationRequest.create({
    data: {
      name: "Kavita Singh",
      email: "kavita.singh@example.com",
      phone: "+919876111222",
      eventDate: new Date("2027-03-15"),
      childOrEventDetails: "Adult wedding ceremony, 180 guests",
      customRequirements: "Would like to discuss Gold package with Royal Mandap theme.",
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
      childOrEventDetails: "Platinum wedding, 280 guests",
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
      referenceCode: "BOOKING-2026-0001",
      referenceType: "BOOKING",
      email: "priya.sharma@example.com",
      otpHash: await bcrypt.hash("123456", 10),
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      verifiedAt: new Date(),
      attemptCount: 0,
    },
  });

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

  // ── Bookings & Invoices ──────────────────────────────────────────────────────
  const booking1 = await prisma.booking.create({
    data: {
      bookingCode: "BOOKING-2026-0001",
      customerId: customer1.id,
      themeId: royalTheme.id,
      packageId: goldPkg.id,
      eventDate: new Date("2027-02-14"),
      status: BookingStatus.CONFIRMED,
      paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
      basePriceInPaise: 24990000,
      customizationTotalInPaise: 1500000,
      gstInPaise: 4768200,
      totalPriceInPaise: 31258200,
      guestEmail: customer1.email,
      guestPhone: customer1.phone,
      razorpayOrderId: "order_dev_bk001",
      razorpayPaymentId: "pay_dev_bk001",
    },
  });

  await prisma.bookingCustomization.create({
    data: {
      bookingId: booking1.id,
      optionId: extraColumnOption.id,
      quantity: 1,
      unitPriceInPaise: 1500000,
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INVOICE-2026-27-0001",
      linkedType: InvoiceLinkedType.BOOKING,
      bookingId: booking1.id,
      customerId: customer1.id,
      subtotalInPaise: 26490000,
      gstInPaise: 4768200,
      totalInPaise: 31258200,
      pdfUrl: img("invoices/INVOICE-2026-27-0001.pdf"),
      emailSentAt: new Date(),
      issuedAt: new Date(),
    },
  });

  const booking2 = await prisma.booking.create({
    data: {
      bookingCode: "BOOKING-2026-0002",
      customerId: customer2.id,
      themeId: gardenTheme.id,
      packageId: platinumPkg.id,
      eventDate: new Date("2027-11-20"),
      status: BookingStatus.SCHEDULED,
      paymentStatus: PaymentStatus.PENDING,
      basePriceInPaise: 39990000,
      customizationTotalInPaise: 0,
      gstInPaise: 7198200,
      totalPriceInPaise: 47188200,
      guestEmail: customer2.email,
      guestPhone: customer2.phone,
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INVOICE-2026-27-0002",
      linkedType: InvoiceLinkedType.BOOKING,
      bookingId: booking2.id,
      customerId: customer2.id,
      subtotalInPaise: 39990000,
      gstInPaise: 7198200,
      totalInPaise: 47188200,
      issuedAt: new Date(),
    },
  });

  const booking3 = await prisma.booking.create({
    data: {
      bookingCode: "BOOKING-2026-0003",
      customerId: customer3.id,
      themeId: minimalTheme.id,
      packageId: silverPkg.id,
      eventDate: new Date("2026-12-05"),
      status: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      basePriceInPaise: 14990000,
      customizationTotalInPaise: 0,
      gstInPaise: 2698200,
      totalPriceInPaise: 17688200,
      guestEmail: customer3.email,
      guestPhone: customer3.phone,
      razorpayOrderId: "order_dev_bk003",
      razorpayPaymentId: "pay_dev_bk003",
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber: "INVOICE-2026-27-0003",
      linkedType: InvoiceLinkedType.BOOKING,
      bookingId: booking3.id,
      customerId: customer3.id,
      subtotalInPaise: 14990000,
      gstInPaise: 2698200,
      totalInPaise: 17688200,
      pdfUrl: img("invoices/INVOICE-2026-27-0003.pdf"),
      emailSentAt: new Date(),
      whatsappSentAt: new Date(),
      whatsappSendStatus: "delivered",
      issuedAt: new Date("2026-06-01"),
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
        adminUserId: opsAdmin.id,
        action: "BOOKING_CONFIRMED",
        entityType: "Booking",
        entityId: booking1.id,
        metadata: { bookingCode: "BOOKING-2026-0001" },
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
  console.log(`  Email:    ${process.env.SEED_ADMIN_EMAIL ?? "admin@vaibhavcelebrations.in"}`);
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
