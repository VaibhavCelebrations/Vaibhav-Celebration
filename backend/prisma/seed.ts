import { PrismaClient, AdminRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@vaibhavcelebrations.in").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe_SuperAdmin_123!";
  const name = process.env.SEED_ADMIN_NAME ?? "Super Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      deletedAt: null,
    },
    create: {
      email,
      name,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  const settings: Array<{ key: string; value: string }> = [
    { key: "DEFAULT_GST_PERCENT", value: process.env.DEFAULT_GST_PERCENT ?? "18" },
    {
      key: "DEFAULT_MAX_BOOKINGS_PER_DAY",
      value: process.env.DEFAULT_MAX_BOOKINGS_PER_DAY ?? "2",
    },
    {
      key: "MIN_CONSULTATION_ADVANCE_DAYS",
      value: process.env.MIN_CONSULTATION_ADVANCE_DAYS ?? "15",
    },
    {
      key: "GIFT_REGISTRY_VALIDITY_DAYS",
      value: process.env.GIFT_REGISTRY_VALIDITY_DAYS ?? "30",
    },
    { key: "ECOM_MAX_QTY_PER_PRODUCT", value: "10" },
    { key: "OUT_OF_STOCK_AUTO_FLAG_DAYS", value: "45" },
  ];

  for (const setting of settings) {
    await prisma.operationalSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  await prisma.bookingCapacityRule.deleteMany({
    where: { scope: "GLOBAL_DEFAULT" },
  });
  await prisma.bookingCapacityRule.create({
    data: {
      scope: "GLOBAL_DEFAULT",
      maxBookingsPerDay: Number(process.env.DEFAULT_MAX_BOOKINGS_PER_DAY ?? 2),
      isBlocked: false,
    },
  });

  // Demo packages for FE/Admin parallel work (Document 05 §1.0)
  const packages = [
    {
      title: "Standard",
      slug: "standard",
      priceInPaise: 1499900,
      tierRank: 1,
      isRecommended: false,
      description: "Essential celebration package — perfect for intimate gatherings.",
      features: [
        { label: "Digital Invite", quantity: 1 },
        { label: "Countdown Cards", quantity: 5, unit: "cards" },
        { label: "Activity Kit", quantity: 1, unit: "kit" },
      ],
    },
    {
      title: "Premium",
      slug: "premium",
      priceInPaise: 2499900,
      tierRank: 2,
      isRecommended: true,
      description: "Our most popular package — curated experiences families love.",
      features: [
        { label: "Digital Invite", quantity: 1 },
        { label: "Video Invite", quantity: 1 },
        { label: "Parent Party Brief", quantity: 1 },
        { label: "Countdown Cards", quantity: 10, unit: "cards" },
        { label: "Activity Kits", quantity: 2, unit: "kits" },
        { label: "Return Gift Bag", quantity: 1 },
      ],
    },
    {
      title: "Luxe",
      slug: "luxe",
      priceInPaise: 3999900,
      tierRank: 3,
      isRecommended: false,
      description: "Full luxury celebration experience with premium deliverables.",
      features: [
        { label: "Digital Invite", quantity: 1 },
        { label: "Video Invite", quantity: 1 },
        { label: "Parent Party Brief", quantity: 1 },
        { label: "Countdown Cards", quantity: 15, unit: "cards" },
        { label: "Activity Kits", quantity: 3, unit: "kits" },
        { label: "Return Gift Bags", quantity: 1 },
        { label: "Gift Registry Access", quantity: 1 },
      ],
    },
  ];

  for (const pkg of packages) {
    const { features, ...data } = pkg;
    const created = await prisma.package.upsert({
      where: { slug: data.slug },
      update: {
        title: data.title,
        priceInPaise: data.priceInPaise,
        tierRank: data.tierRank,
        isRecommended: data.isRecommended,
        description: data.description,
        isActive: true,
        deletedAt: null,
      },
      create: data,
    });

    await prisma.packageFeature.deleteMany({ where: { packageId: created.id } });
    await prisma.packageFeature.createMany({
      data: features.map((f, i) => ({
        packageId: created.id,
        label: f.label,
        quantity: f.quantity,
        unit: f.unit,
        displayOrder: i,
      })),
    });
  }

  const themes = [
    {
      title: "Princess Theme",
      slug: "princess-theme-birthday-party",
      shortDescription: "A dreamy royal celebration for little princesses.",
      storyDescription:
        "Step into a world of tiaras, soft pastels, and magical moments crafted for your child's special day.",
      audienceNote: "Ideal for ages 3–8 who love fairytales and royal play.",
      seoTitle: "Princess Theme Birthday Party | Vaibhav Celebrations",
      seoDescription:
        "Premium princess theme birthday celebrations in Jaipur with curated packages and memorable experiences.",
    },
    {
      title: "Space Theme",
      slug: "space-theme-birthday-party",
      shortDescription: "Blast off into an unforgettable cosmic adventure.",
      storyDescription:
        "Rockets, stars, and planetary wonders come together for a celebration that feels out of this world.",
      audienceNote: "Perfect for curious kids who love science and adventure.",
      seoTitle: "Space Theme Birthday Party | Vaibhav Celebrations",
      seoDescription:
        "Space theme kids birthday planner in Jaipur — packages, invites, activities and more.",
    },
    {
      title: "Dinosaur Theme",
      slug: "dinosaur-theme-birthday-party",
      shortDescription: "Roar into a prehistoric party filled with wonder.",
      storyDescription:
        "Jurassic fun with curated décor cues, activity kits, and return gifts that kids remember.",
      audienceNote: "Great for energetic kids who love dinosaurs and outdoor play.",
      seoTitle: "Dinosaur Theme Birthday Party | Vaibhav Celebrations",
      seoDescription: "Dinosaur theme birthday packages and celebration experiences in Jaipur.",
    },
  ];

  for (const [index, theme] of themes.entries()) {
    await prisma.theme.upsert({
      where: { slug: theme.slug },
      update: { ...theme, isActive: true, displayOrder: index, deletedAt: null },
      create: { ...theme, displayOrder: index, isActive: true },
    });
  }

  // Link all packages to all themes
  const allThemes = await prisma.theme.findMany({ where: { deletedAt: null } });
  const allPackages = await prisma.package.findMany({ where: { deletedAt: null } });

  for (const theme of allThemes) {
    for (const pkg of allPackages) {
      await prisma.themePackage.upsert({
        where: {
          themeId_packageId: { themeId: theme.id, packageId: pkg.id },
        },
        update: { isActive: true },
        create: { themeId: theme.id, packageId: pkg.id, isActive: true },
      });
    }
  }

  const blogCategories = [
    "Birthday Planning",
    "Theme Ideas",
    "Party Games",
    "Return Gifts",
    "Kids Activities",
    "Parenting",
    "Celebration Ideas",
    "Festivals",
    "DIY",
    "Budget Planning",
  ];

  for (const name of blogCategories) {
    await prisma.blogCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  await prisma.siteMetadata.upsert({
    where: { pageKey: "home" },
    update: {
      metaTitle: "Luxury Theme Birthday Planner in Jaipur | Vaibhav Celebrations",
      metaDescription:
        "Premium theme-based birthday celebrations, personalized invitations, return gifts, activities, and unforgettable experiences for kids.",
    },
    create: {
      pageKey: "home",
      metaTitle: "Luxury Theme Birthday Planner in Jaipur | Vaibhav Celebrations",
      metaDescription:
        "Premium theme-based birthday celebrations, personalized invitations, return gifts, activities, and unforgettable experiences for kids.",
    },
  });

  console.log("Seed complete.");
  console.log(`  SUPER_ADMIN: ${admin.email}`);
  console.log(`  Packages: ${allPackages.length}, Themes: ${allThemes.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
