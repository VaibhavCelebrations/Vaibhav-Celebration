import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";
import { cached, cacheKey, delPattern } from "../../lib/redis";

const PUB_TTL = 5 * 60;

const detailInclude = {
  serviceItems: {
    orderBy: { displayOrder: "asc" as const },
    include: {
      extraService: true,
    },
  },
};

export async function listPackages() {
  return cached("pub:packages:list", PUB_TTL, () =>
    prisma.package.findMany({
      where: { deletedAt: null, isActive: true },
      include: detailInclude,
      orderBy: [{ tierRank: "asc" }, { displayOrder: "asc" }],
    }),
  );
}

export async function comparePackages(ids: string[]) {
  return prisma.package.findMany({
    where: { id: { in: ids }, deletedAt: null, isActive: true },
    include: detailInclude,
    orderBy: { tierRank: "asc" },
  });
}

export async function getPackageBySlug(slug: string) {
  const key = `pub:packages:slug:${slug}`;
  const item = await cached(key, PUB_TTL, () =>
    prisma.package.findFirst({
      where: { slug, deletedAt: null, isActive: true },
      include: detailInclude,
    }),
  );
  if (!item) throw new NotFoundError("Package not found");
  return item;
}

export async function getPackageMatrix() {
  return cached(`pub:packages:matrix`, PUB_TTL, () =>
    Promise.all([
      prisma.package.findMany({
        where: { deletedAt: null },
        include: {
          serviceItems: {
            orderBy: { displayOrder: "asc" },
            include: { extraService: true },
          },
        },
        orderBy: [{ tierRank: "asc" }, { displayOrder: "asc" }],
      }),
      prisma.extraService.findMany({
        where: { deletedAt: null },
        orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
      }),
    ]).then(([packages, extraServices]) => ({ packages, extraServices })),
  );
}

export const createPackage = async (data: Prisma.PackageUncheckedCreateInput) => {
  const pkg = await prisma.package.create({ data });
  void delPattern("pub:packages:*");
  void delPattern("adm:packages:*");
  return pkg;
};

export async function updatePackage(
  id: string,
  data: Prisma.PackageUncheckedUpdateInput,
) {
  const updated = await prisma.package.updateMany({
    where: { id, deletedAt: null },
    data,
  });
  if (!updated.count) throw new NotFoundError("Package not found");
  const pkg = await prisma.package.findUniqueOrThrow({ where: { id } });
  void delPattern("pub:packages:*");
  void delPattern("adm:packages:*");
  return pkg;
}

export async function deletePackage(id: string) {
  const updated = await prisma.package.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  if (!updated.count) throw new NotFoundError("Package not found");
  void delPattern("pub:packages:*");
  void delPattern("adm:packages:*");
}

export type ServiceItemInput = {
  extraServiceId: string;
  isIncluded: boolean;
  displayOrder?: number;
};

export type ExtraServicePriceInput = {
  id: string;
  customizationPriceInPaise: number;
};

async function syncPackageServiceItems(
  tx: Prisma.TransactionClient,
  packageId: string,
  items: ServiceItemInput[],
) {
  const existing = await tx.packageServiceItem.findMany({ where: { packageId } });
  const existingByService = new Map(existing.map((row) => [row.extraServiceId, row]));
  const incomingServiceIds = new Set(items.map((item) => item.extraServiceId));
  const writes: Array<Promise<unknown>> = [];

  for (const [index, item] of items.entries()) {
    const current = existingByService.get(item.extraServiceId);
    if (current) {
      writes.push(
        tx.packageServiceItem.update({
          where: { id: current.id },
          data: {
            isIncluded: item.isIncluded,
            displayOrder: item.displayOrder ?? index,
          },
        }),
      );
      continue;
    }

    writes.push(
      tx.packageServiceItem.create({
        data: {
          packageId,
          extraServiceId: item.extraServiceId,
          isIncluded: item.isIncluded,
          displayOrder: item.displayOrder ?? index,
        },
      }),
    );
  }

  await Promise.all(writes);

  const orphans = existing.filter((row) => !incomingServiceIds.has(row.extraServiceId));
  if (!orphans.length) return;

  const orphanIds = orphans.map((row) => row.id);
  const referenced = await tx.bookingCustomization.findMany({
    where: { packageServiceItemId: { in: orphanIds } },
    select: { packageServiceItemId: true },
  });
  const referencedIds = new Set(referenced.map((row) => row.packageServiceItemId));
  const deletableIds = orphanIds.filter((id) => !referencedIds.has(id));
  if (deletableIds.length) {
    await tx.packageServiceItem.deleteMany({ where: { id: { in: deletableIds } } });
  }
}

/** Replace the full service-item matrix for one package. */
export async function replacePackageServiceItems(
  packageId: string,
  items: ServiceItemInput[],
) {
  const pkg = await prisma.package.findFirst({
    where: { id: packageId, deletedAt: null },
  });
  if (!pkg) throw new NotFoundError("Package not found");

  return prisma.$transaction(async (tx) => {
    await syncPackageServiceItems(tx, packageId, items);
    return tx.package.findUniqueOrThrow({
      where: { id: packageId },
      include: detailInclude,
    });
  });
}

export type PackageMatrixSaveInput = {
  packages: Array<{
    packageId: string;
    title?: string;
    description?: string | null;
    priceInPaise?: number;
    isRecommended?: boolean;
    isActive?: boolean;
    isCustomizable?: boolean;
    items: ServiceItemInput[];
  }>;
  extraServices?: ExtraServicePriceInput[];
};

/** Bulk-save matrix for all packages at once (Fiverr-style admin UI). */
export async function savePackageMatrix({ packages, extraServices }: PackageMatrixSaveInput) {
  const result = await prisma.$transaction(
    async (tx) => {
      if (extraServices?.length) {
        await Promise.all(
          extraServices.map((svc) =>
            tx.extraService.updateMany({
              where: { id: svc.id, deletedAt: null },
              data: { customizationPriceInPaise: svc.customizationPriceInPaise },
            }),
          ),
        );
      }

      for (const row of packages) {
        const { packageId, items, ...pkgData } = row;
        const cleanData = Object.fromEntries(
          Object.entries(pkgData).filter(([, v]) => v !== undefined),
        );
        if (Object.keys(cleanData).length) {
          await tx.package.update({ where: { id: packageId }, data: cleanData });
        }
        await syncPackageServiceItems(tx, packageId, items);
      }

      return tx.package.findMany({
        where: { deletedAt: null },
        include: detailInclude,
        orderBy: [{ tierRank: "asc" }, { displayOrder: "asc" }],
      });
    },
    { timeout: 30_000 },
  );
  await delPattern("pub:packages:*");
  await delPattern("adm:packages:*");
  return result;
}

export async function getPackageDetail(id: string) {
  const item = await prisma.package.findFirst({
    where: { id, deletedAt: null },
    include: detailInclude,
  });
  if (!item) throw new NotFoundError("Package not found");
  return item;
}
