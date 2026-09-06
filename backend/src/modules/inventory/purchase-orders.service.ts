import { PurchaseOrderStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors";
import { parsePagination } from "../../lib/response";
import { adjustInventory } from "../catalog/inventory.service";

function generatePoNumber(): string {
  const date = new Date();
  const yymmdd = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `PO-${yymmdd}-${rand}`;
}

export async function listPurchaseOrders(q: {
  page?: number;
  pageSize?: number;
  status?: PurchaseOrderStatus;
  supplierId?: string;
  search?: string;
}) {
  const { page, pageSize, skip, take } = parsePagination(q);
  const where = {
    deletedAt: null as null,
    ...(q.status ? { status: q.status } : {}),
    ...(q.supplierId ? { supplierId: q.supplierId } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, title: true, sku: true, barcode: true } } } },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getPurchaseOrder(id: string) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, deletedAt: null },
    include: {
      supplier: true,
      items: { include: { product: { select: { id: true, title: true, sku: true, barcode: true, unit: true } } } },
    },
  });
  if (!po) throw new NotFoundError("Purchase order not found");
  return po;
}

export async function createPurchaseOrder(data: {
  supplierId: string;
  warehouseId?: string;
  notes?: string;
  expectedAt?: string;
  adminUserId?: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
}) {
  if (data.items.length === 0) throw new ValidationError("Purchase order must have at least one item");

  const supplier = await prisma.supplier.findFirst({ where: { id: data.supplierId, deletedAt: null } });
  if (!supplier) throw new NotFoundError("Supplier not found");

  // Validate all products exist
  const productIds = data.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: { id: true },
  });
  if (products.length !== productIds.length) {
    throw new ValidationError("One or more products not found");
  }

  const totalInPaise = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: generatePoNumber(),
      supplierId: data.supplierId,
      warehouseId: data.warehouseId ?? null,
      note: data.notes ?? null,
      expectedAt: data.expectedAt ? new Date(data.expectedAt) : null,
      
      totalAmount,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      },
    },
    include: {
      supplier: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, title: true, sku: true } } } },
    },
  });

  return po;
}

export async function updatePurchaseOrder(
  id: string,
  data: {
    notes?: string;
    expectedAt?: string | null;
    status?: PurchaseOrderStatus;
    warehouseId?: string | null;
  },
) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null } });
  if (!po) throw new NotFoundError("Purchase order not found");
  if (po.status === "RECEIVED" || po.status === "CANCELLED") {
    throw new ConflictError("PO_CLOSED", "Cannot update a received or cancelled purchase order");
  }
  return prisma.purchaseOrder.update({
    where: { id },
    data: {
      ...data,
      expectedAt: data.expectedAt !== undefined ? (data.expectedAt ? new Date(data.expectedAt) : null) : undefined,
    },
    include: { supplier: { select: { id: true, name: true } }, items: true },
  });
}

export async function receivePurchaseOrder(
  id: string,
  data: {
    adminUserId?: string;
    items: Array<{ itemId: string; receivedQty: number }>;
  },
) {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, deletedAt: null },
    include: { items: true },
  });
  if (!po) throw new NotFoundError("Purchase order not found");
  if (po.status === "CANCELLED") throw new ConflictError("PO_CANCELLED", "Cannot receive a cancelled purchase order");
  if (po.status === "RECEIVED") throw new ConflictError("PO_ALREADY_RECEIVED", "Purchase order already fully received");

  // Validate item IDs belong to this PO
  const poItemIds = new Set(po.items.map((i) => i.id));
  for (const recv of data.items) {
    if (!poItemIds.has(recv.itemId)) {
      throw new ValidationError(`Item ${recv.itemId} does not belong to this purchase order`);
    }
    if (recv.receivedQty <= 0) throw new ValidationError("receivedQty must be greater than 0");
  }

  // Apply stock adjustments for each received item
  for (const recv of data.items) {
    const poItem = po.items.find((i) => i.id === recv.itemId)!;
    const maxReceivable = poItem.quantity - poItem.receivedQty;
    if (recv.receivedQty > maxReceivable) {
      throw new ValidationError(`Cannot receive ${recv.receivedQty} for item ${recv.itemId}, max is ${maxReceivable}`);
    }

    await adjustInventory({
      productId: poItem.productId,
      delta: recv.receivedQty,
      reason: "RESTOCK",
      note: `Received against PO ${po.poNumber}`,
      
      
    });

    await prisma.purchaseOrderItem.update({
      where: { id: recv.itemId },
      data: { receivedQty: { increment: recv.receivedQty } },
    });
  }

  // Determine new PO status
  const updatedItems = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
  const allReceived = updatedItems.every((i) => i.receivedQty >= i.quantity);
  const anyReceived = updatedItems.some((i) => i.receivedQty > 0);
  const newStatus: PurchaseOrderStatus = allReceived
    ? "RECEIVED"
    : anyReceived
      ? "PARTIALLY_RECEIVED"
      : po.status;

  const updated = await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: newStatus,
      receivedAt: allReceived ? new Date() : po.receivedAt,
    },
    include: { supplier: { select: { id: true, name: true } }, items: true },
  });

  return updated;
}

export async function cancelPurchaseOrder(id: string) {
  const po = await prisma.purchaseOrder.findFirst({ where: { id, deletedAt: null } });
  if (!po) throw new NotFoundError("Purchase order not found");
  if (po.status === "RECEIVED") throw new ConflictError("PO_RECEIVED", "Cannot cancel a fully received purchase order");
  if (po.status === "CANCELLED") throw new ConflictError("PO_ALREADY_CANCELLED", "Purchase order is already cancelled");
  return prisma.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
}
