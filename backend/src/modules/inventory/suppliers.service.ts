import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { parsePagination } from "../../lib/response";
import { slugify } from "../../lib/validators";

function shapeSupplier(s: {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  gstin: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}) {
  return {
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    deletedAt: s.deletedAt?.toISOString() ?? null,
  };
}

export async function listSuppliers(q: {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: string;
}) {
  const { page, pageSize, skip, take } = parsePagination(q);
  const where: Prisma.SupplierWhereInput = {
    deletedAt: null,
    ...(q.isActive !== undefined ? { isActive: q.isActive === "true" } : {}),
    ...(q.search
      ? { name: { contains: q.search, mode: "insensitive" } }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.supplier.findMany({ where, skip, take, orderBy: { name: "asc" } }),
    prisma.supplier.count({ where }),
  ]);
  return { items: items.map(shapeSupplier), total, page, pageSize };
}

export async function getSupplier(id: string) {
  const s = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!s) throw new NotFoundError("Supplier not found");
  return shapeSupplier(s);
}

export async function createSupplier(data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  gstin?: string;
  notes?: string;
  isActive?: boolean;
}) {
  // GSTIN uniqueness check
  if (data.gstin) {
    const existing = await prisma.supplier.findFirst({ where: { gstin: data.gstin, deletedAt: null } });
    if (existing) throw new ConflictError("DUPLICATE_GSTIN", `A supplier with GSTIN ${data.gstin} already exists`);
  }
  const s = await prisma.supplier.create({ data: { ...data, isActive: data.isActive ?? true } });
  return shapeSupplier(s);
}

export async function updateSupplier(id: string, data: Partial<Parameters<typeof createSupplier>[0]>) {
  const existing = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Supplier not found");
  if (data.gstin && data.gstin !== existing.gstin) {
    const dup = await prisma.supplier.findFirst({ where: { gstin: data.gstin, deletedAt: null, id: { not: id } } });
    if (dup) throw new ConflictError("DUPLICATE_GSTIN", `A supplier with GSTIN ${data.gstin} already exists`);
  }
  const s = await prisma.supplier.update({ where: { id }, data });
  return shapeSupplier(s);
}

export async function deleteSupplier(id: string) {
  const existing = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Supplier not found");
  // Soft delete
  await prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function getSupplierHistory(id: string, q: { page?: number; pageSize?: number }) {
  const existing = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError("Supplier not found");
  const { page, pageSize, skip, take } = parsePagination(q);
  const [items, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { supplierId: id, deletedAt: null },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: { select: { id: true, title: true, sku: true } } } } },
    }),
    prisma.purchaseOrder.count({ where: { supplierId: id, deletedAt: null } }),
  ]);
  return { items, total, page, pageSize };
}
