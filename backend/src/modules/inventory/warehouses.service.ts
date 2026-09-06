import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../lib/errors";

export async function listWarehouses() {
  return prisma.warehouse.findMany({
    where: { deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function getWarehouse(id: string) {
  const w = await prisma.warehouse.findFirst({ where: { id, deletedAt: null } });
  if (!w) throw new NotFoundError("Warehouse not found");
  return w;
}

export async function createWarehouse(data: {
  name: string;
  location?: string;
  address?: string;
  isDefault?: boolean;
  isActive?: boolean;
}) {
  // If creating as default, unset all others first
  if (data.isDefault) {
    await prisma.warehouse.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }
  return prisma.warehouse.create({ data: { ...data } });
}

export async function updateWarehouse(
  id: string,
  data: Partial<Parameters<typeof createWarehouse>[0]>,
) {
  const existing = await prisma.warehouse.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Warehouse not found");
  if (data.isDefault) {
    await prisma.warehouse.updateMany({
      where: { isDefault: true, id: { not: id } },
      data: { isDefault: false },
    });
  }
  return prisma.warehouse.update({ where: { id }, data });
}

export async function deleteWarehouse(id: string) {
  const existing = await prisma.warehouse.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Warehouse not found");
  if (existing.isDefault) {
    throw new ConflictError("DEFAULT_WAREHOUSE", "Cannot delete the default warehouse. Set another warehouse as default first.");
  }
  await prisma.warehouse.update({ where: { id }, data: { deletedAt: new Date() } });
}
