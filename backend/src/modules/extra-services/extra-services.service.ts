import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";
import { delPattern } from "../../lib/redis";

export async function listExtraServices(includeInactive = false) {
  return prisma.extraService.findMany({
    where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
  });
}

export async function getExtraService(id: string) {
  const item = await prisma.extraService.findFirst({
    where: { id, deletedAt: null },
  });
  if (!item) throw new NotFoundError("Extra service not found");
  return item;
}

export async function createExtraService(data: Prisma.ExtraServiceUncheckedCreateInput) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.extraService.create({ data });
    const packages = await tx.package.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true },
      orderBy: [{ tierRank: "asc" }, { displayOrder: "asc" }],
    });
    if (packages.length) {
      await tx.packageServiceItem.createMany({
        data: packages.map((pkg, index) => ({
          packageId: pkg.id,
          extraServiceId: item.id,
          isIncluded: false,
          displayOrder: data.displayOrder ?? index,
        })),
      });
    }
    void delPattern("pub:packages:*");
    return item;
  });
}

export async function updateExtraService(
  id: string,
  data: Prisma.ExtraServiceUncheckedUpdateInput,
) {
  const updated = await prisma.extraService.updateMany({
    where: { id, deletedAt: null },
    data,
  });
  if (!updated.count) throw new NotFoundError("Extra service not found");
  void delPattern("pub:packages:*");
  return prisma.extraService.findUniqueOrThrow({ where: { id } });
}

export async function deleteExtraService(id: string) {
  const updated = await prisma.extraService.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  if (!updated.count) throw new NotFoundError("Extra service not found");
  void delPattern("pub:packages:*");
}
