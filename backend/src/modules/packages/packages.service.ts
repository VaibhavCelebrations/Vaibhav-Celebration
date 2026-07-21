import { Prisma, SampleAssetType } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";

const detailInclude = {
  features: {
    where: { deletedAt: null },
    orderBy: { displayOrder: "asc" as const },
  },
  addOns: { include: { addOnService: true } },
  customizationOptions: {
    where: { deletedAt: null },
    orderBy: { displayOrder: "asc" as const },
  },
};

export async function listPackages() {
  return prisma.package.findMany({
    where: { deletedAt: null, isActive: true },
    include: { features: { where: { deletedAt: null } } },
    orderBy: [{ tierRank: "asc" }, { displayOrder: "asc" }],
  });
}
export async function comparePackages(ids: string[]) {
  return prisma.package.findMany({
    where: { id: { in: ids }, deletedAt: null, isActive: true },
    include: detailInclude,
    orderBy: { tierRank: "asc" },
  });
}
export async function getPackageBySlug(slug: string) {
  const item = await prisma.package.findFirst({
    where: { slug, deletedAt: null, isActive: true },
    include: detailInclude,
  });
  if (!item) throw new NotFoundError("Package not found");
  return item;
}
export const createPackage = (data: Prisma.PackageUncheckedCreateInput) =>
  prisma.package.create({ data });
export async function updatePackage(
  id: string,
  data: Prisma.PackageUncheckedUpdateInput,
) {
  const updated = await prisma.package.updateMany({
    where: { id, deletedAt: null },
    data,
  });
  if (!updated.count) throw new NotFoundError("Package not found");
  return prisma.package.findUniqueOrThrow({ where: { id } });
}
export async function deletePackage(id: string) {
  const updated = await prisma.package.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  if (!updated.count) throw new NotFoundError("Package not found");
}
export async function replaceFeatures(
  packageId: string,
  features: Array<{
    label: string;
    quantity: number;
    unit?: string;
    sampleAssetType?: SampleAssetType;
    displayOrder?: number;
  }>,
) {
  const item = await prisma.package.findFirst({
    where: { id: packageId, deletedAt: null },
  });
  if (!item) throw new NotFoundError("Package not found");
  return prisma.$transaction(async (tx) => {
    await tx.packageFeature.updateMany({
      where: { packageId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return tx.packageFeature.createMany({
      data: features.map((feature, index) => ({
        packageId,
        ...feature,
        displayOrder: feature.displayOrder ?? index,
      })),
    });
  });
}
export async function upsertCustomizationOptions(
  packageId: string,
  options: Array<{
    id?: string;
    label: string;
    extraPriceInPaise: number;
    minQuantity?: number;
    maxQuantity?: number | null;
    isActive?: boolean;
    displayOrder?: number;
  }>,
) {
  const item = await prisma.package.findFirst({
    where: { id: packageId, deletedAt: null },
  });
  if (!item) throw new NotFoundError("Package not found");

  return prisma.$transaction(
    options.map((option, index) => {
      const { id, ...rest } = option;
      const data = { ...rest, displayOrder: option.displayOrder ?? index };
      if (id) {
        return prisma.packageCustomizationOption.update({
          where: { id },
          data,
        });
      }
      return prisma.packageCustomizationOption.create({
        data: { packageId, ...data },
      });
    }),
  );
}
