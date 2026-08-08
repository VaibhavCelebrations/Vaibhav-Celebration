import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const media = await prisma.mediaAsset.findFirst();
  if (!media) throw new Error("No media asset found");

  let category = await prisma.productCategory.findUnique({ where: { slug: "return-gifts" } });
  if (!category) {
    category = await prisma.productCategory.create({
      data: {
        name: "Return Gifts",
        slug: "return-gifts",
        isActive: true,
        displayOrder: 1
      }
    });
  }

  const p1 = await prisma.product.create({
    data: {
      title: "Space Activity Book",
      slug: "space-activity-book",
      sku: "RGF-SPC-001",
      description: "A fun space themed activity book for kids, packed with puzzles and coloring pages.",
      priceInPaise: 29900,
      compareAtPriceInPaise: 39900,
      images: {
        create: {
          mediaId: media.id,
          displayOrder: 0
        }
      },
      categoryTags: {
        create: {
          categoryId: category.id
        }
      },
      inventory: {
        create: {
          quantityAvailable: 150,
          lowStockThreshold: 20
        }
      }
    }
  });

  const p2 = await prisma.product.create({
    data: {
      title: "Jungle Safari Play Dough Kit",
      slug: "jungle-safari-play-dough",
      sku: "RGF-JGL-002",
      description: "Safe, non-toxic play dough with animal molds.",
      priceInPaise: 45000,
      compareAtPriceInPaise: 55000,
      images: {
        create: {
          mediaId: media.id,
          displayOrder: 0
        }
      },
      categoryTags: {
        create: {
          categoryId: category.id
        }
      },
      inventory: {
        create: {
          quantityAvailable: 50,
          lowStockThreshold: 10
        }
      }
    }
  });

  const p3 = await prisma.product.create({
    data: {
      title: "Princess Tiara & Wand Set",
      slug: "princess-tiara-wand-set",
      sku: "RGF-PRN-003",
      description: "Beautiful glowing tiara and magic wand set for every little princess.",
      priceInPaise: 59900,
      images: {
        create: {
          mediaId: media.id,
          displayOrder: 0
        }
      },
      categoryTags: {
        create: {
          categoryId: category.id
        }
      },
      inventory: {
        create: {
          quantityAvailable: 200,
          lowStockThreshold: 30
        }
      }
    }
  });

  // Link products to some themes if possible
  const spaceTheme = await prisma.theme.findUnique({ where: { slug: "space-theme" }});
  if (spaceTheme) {
    await prisma.productThemeTag.create({ data: { productId: p1.id, themeId: spaceTheme.id }});
  }
  const jungleTheme = await prisma.theme.findUnique({ where: { slug: "jungle-safari-theme" }});
  if (jungleTheme) {
    await prisma.productThemeTag.create({ data: { productId: p2.id, themeId: jungleTheme.id }});
  }
  const princessTheme = await prisma.theme.findUnique({ where: { slug: "princess-theme" }});
  if (princessTheme) {
    await prisma.productThemeTag.create({ data: { productId: p3.id, themeId: princessTheme.id }});
  }

  console.log("Seeded 3 products!");
}

run().catch(console.error).finally(() => prisma.$disconnect());
