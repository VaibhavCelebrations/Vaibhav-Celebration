import bcrypt from "bcryptjs";
import { prisma } from "../../db/prisma";
import { AppError, NotFoundError, UnauthorizedError } from "../../lib/errors";
import { parsePagination, paginationMeta } from "../../lib/response";
import { delPattern } from "../../lib/redis";
import { deleteObjectByKey } from "../../integrations/media/storage";

// ─── Supported entity types ──────────────────────────────────────────────────

export const RECYCLE_BIN_ENTITY_TYPES = [
  "Theme",
  "Package",
  "ExtraService",
  "GalleryImage",
  "BlogPost",
  "Event",
  "Testimonial",
  "FAQ",
  "Popup",
  "Product",
  "MediaAsset",
  "Customer",
  "Lead",
  "ConsultationRequest",
  "AdminUser",
  "Invoice",
  "ThemeSampleAsset",
  "EventRegistration",
] as const;

export type RecycleBinEntityType = (typeof RECYCLE_BIN_ENTITY_TYPES)[number];

// Which entity types have an `isActive` field — these get reactivated on restore
const ENTITIES_WITH_IS_ACTIVE = new Set<RecycleBinEntityType>([
  "Theme",
  "Package",
  "GalleryImage",
  "Event",
  "Testimonial",
  "FAQ",
  "Popup",
  "Product",
  "AdminUser",
]);

// ─── Types ───────────────────────────────────────────────────────────────────

export type RecycleBinItem = {
  id: string;
  entityType: RecycleBinEntityType;
  /** Human-readable name/title for the record */
  displayName: string;
  deletedAt: Date;
  /** Extra context (e.g. slug, email) */
  meta: Record<string, unknown>;
};

// ─── Helpers to extract display name from a prisma record ────────────────────

function getDisplayName(type: RecycleBinEntityType, row: Record<string, unknown>): string {
  switch (type) {
    case "Theme":
    case "Package":
    case "ExtraService":
    case "BlogPost":
    case "Event":
    case "Product":
      return String(row.title ?? row.label ?? row.id);
    case "GalleryImage":
      return String(row.altText ?? row.caption ?? row.id);
    case "Testimonial":
      return `${String(row.customerName ?? "?")} — ${String(row.content ?? "").slice(0, 60)}`;
    case "FAQ":
      return String(row.question ?? row.id);
    case "Popup":
      return String(row.title ?? row.id);
    case "MediaAsset":
      return String(row.altText ?? row.cdnKey ?? row.id);
    case "Customer":
      return `${String(row.fullName ?? "?")} (${String(row.email ?? "?")})`;
    case "Lead":
      return `${String(row.name ?? "?")} — ${String(row.source ?? "")}`;
    case "ConsultationRequest":
      return `${String(row.name ?? "?")} (${String(row.email ?? "?")})`;
    case "AdminUser":
      return `${String(row.name ?? "?")} (${String(row.email ?? "?")})`;
    case "Invoice":
      return String(row.invoiceNumber ?? row.id);
    case "ThemeSampleAsset":
      return String(row.title ?? row.id);
    case "EventRegistration":
      return `${String(row.name ?? "?")} (${String(row.email ?? "?")})`;
    default:
      return String(row.id);
  }
}

function getMeta(type: RecycleBinEntityType, row: Record<string, unknown>): Record<string, unknown> {
  switch (type) {
    case "Theme":
    case "Package":
    case "BlogPost":
    case "Event":
    case "Product":
      return { slug: row.slug };
    case "Customer":
    case "Lead":
    case "ConsultationRequest":
    case "AdminUser":
    case "EventRegistration":
      return { email: row.email, phone: row.phone };
    case "Invoice":
      return { invoiceNumber: row.invoiceNumber };
    case "MediaAsset":
      return { cdnKey: row.cdnKey, type: row.type };
    default:
      return {};
  }
}

// ─── Query helpers for each entity type ─────────────────────────────────────

async function queryDeleted(
  type: RecycleBinEntityType,
  skip: number,
  take: number,
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const where = { deletedAt: { not: null } } as Record<string, unknown>;

  switch (type) {
    case "Theme": {
      const [rows, total] = await Promise.all([
        prisma.theme.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.theme.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "Package": {
      const [rows, total] = await Promise.all([
        prisma.package.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.package.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "ExtraService": {
      const [rows, total] = await Promise.all([
        prisma.extraService.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.extraService.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "GalleryImage": {
      const [rows, total] = await Promise.all([
        prisma.galleryImage.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.galleryImage.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "BlogPost": {
      const [rows, total] = await Promise.all([
        prisma.blogPost.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.blogPost.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "Event": {
      const [rows, total] = await Promise.all([
        prisma.event.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.event.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "Testimonial": {
      const [rows, total] = await Promise.all([
        prisma.testimonial.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.testimonial.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "FAQ": {
      const [rows, total] = await Promise.all([
        prisma.fAQ.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.fAQ.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "Popup": {
      const [rows, total] = await Promise.all([
        prisma.popup.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.popup.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "Product": {
      const [rows, total] = await Promise.all([
        prisma.product.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.product.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "MediaAsset": {
      const [rows, total] = await Promise.all([
        prisma.mediaAsset.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.mediaAsset.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "Customer": {
      const [rows, total] = await Promise.all([
        prisma.customer.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.customer.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "Lead": {
      const [rows, total] = await Promise.all([
        prisma.lead.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.lead.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "ConsultationRequest": {
      const [rows, total] = await Promise.all([
        prisma.consultationRequest.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.consultationRequest.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "AdminUser": {
      const [rows, total] = await Promise.all([
        prisma.adminUser.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.adminUser.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "Invoice": {
      const [rows, total] = await Promise.all([
        prisma.invoice.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.invoice.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "ThemeSampleAsset": {
      const [rows, total] = await Promise.all([
        prisma.themeSampleAsset.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.themeSampleAsset.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
    case "EventRegistration": {
      const [rows, total] = await Promise.all([
        prisma.eventRegistration.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
        prisma.eventRegistration.count({ where }),
      ]);
      return { rows: rows as unknown as Record<string, unknown>[], total };
    }
  }
}

// ─── Public service functions ─────────────────────────────────────────────────

/**
 * Returns a paginated list of all soft-deleted records.
 * If `entityType` is provided, only that type is returned.
 * Otherwise, all types are queried and merged, sorted by deletedAt desc.
 */
export async function listDeletedItems(opts: {
  entityType?: RecycleBinEntityType;
  page?: number;
  pageSize?: number;
}) {
  const { page, pageSize, skip, take } = parsePagination({
    page: opts.page,
    pageSize: opts.pageSize,
  });

  const types: RecycleBinEntityType[] = opts.entityType
    ? [opts.entityType]
    : [...RECYCLE_BIN_ENTITY_TYPES];

  if (opts.entityType) {
    // Single type — use DB pagination directly
    const { rows, total } = await queryDeleted(opts.entityType, skip, take);
    const items: RecycleBinItem[] = rows.map((row) => ({
      id: String(row.id),
      entityType: opts.entityType!,
      displayName: getDisplayName(opts.entityType!, row),
      deletedAt: row.deletedAt as Date,
      meta: getMeta(opts.entityType!, row),
    }));
    return { items, total, page, pageSize, meta: paginationMeta(page, pageSize, total) };
  }

  // All types — fetch counts + a page worth across all
  // Strategy: fetch total counts per type, then fetch only from the types
  // that cover the requested page range (interleaved by deletedAt desc).
  // For simplicity (and correctness at small scale) we fetch all deleted IDs
  // in a lightweight way: just id + deletedAt for sorting.
  const allItems: RecycleBinItem[] = [];

  for (const type of types) {
    const { rows } = await queryDeleted(type, 0, 10000); // fetch all for cross-type sort
    for (const row of rows) {
      allItems.push({
        id: String(row.id),
        entityType: type,
        displayName: getDisplayName(type, row),
        deletedAt: row.deletedAt as Date,
        meta: getMeta(type, row),
      });
    }
  }

  // Sort by deletedAt descending
  allItems.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());

  const total = allItems.length;
  const items = allItems.slice(skip, skip + take);

  return { items, total, page, pageSize, meta: paginationMeta(page, pageSize, total) };
}

/**
 * Verifies a super admin's password.
 * Returns true if correct; throws UnauthorizedError if wrong.
 */
export async function verifySuperAdminPassword(adminId: string, password: string): Promise<true> {
  const admin = await prisma.adminUser.findFirst({
    where: { id: adminId, deletedAt: null },
    select: { passwordHash: true },
  });
  if (!admin) throw new UnauthorizedError("Admin account not found");

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) throw new UnauthorizedError("Incorrect password");

  return true;
}

/**
 * Restores a soft-deleted record by clearing deletedAt.
 * Also re-sets isActive = true for entities that have that field.
 * Writes an audit log entry.
 */
export async function restoreItem(opts: {
  entityType: RecycleBinEntityType;
  id: string;
  adminId: string;
  adminPassword: string;
}): Promise<{ restored: true; entityType: RecycleBinEntityType; id: string }> {
  await verifySuperAdminPassword(opts.adminId, opts.adminPassword);
  return _restoreItem({ entityType: opts.entityType, id: opts.id, adminId: opts.adminId });
}

export async function restoreItemsBulk(opts: {
  items: { entityType: RecycleBinEntityType; id: string }[];
  adminId: string;
  adminPassword: string;
}) {
  await verifySuperAdminPassword(opts.adminId, opts.adminPassword);

  let restoredCount = 0;
  const errors: Array<{ entityType: string; id: string; error: string }> = [];

  for (const item of opts.items) {
    try {
      await _restoreItem({ entityType: item.entityType, id: item.id, adminId: opts.adminId });
      restoredCount++;
    } catch (err: any) {
      errors.push({ entityType: item.entityType, id: item.id, error: err.message || String(err) });
    }
  }

  return { restoredCount, errors };
}

async function _restoreItem(opts: {
  entityType: RecycleBinEntityType;
  id: string;
  adminId: string;
}): Promise<{ restored: true; entityType: RecycleBinEntityType; id: string }> {
  const setActive = ENTITIES_WITH_IS_ACTIVE.has(opts.entityType);
  const restoreData = {
    deletedAt: null,
    ...(setActive ? { isActive: true } : {}),
  };

  let displayName = opts.id;

  switch (opts.entityType) {
    case "Theme": {
      const row = await prisma.theme.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`Theme ${opts.id} not found`);
      displayName = row.title;
      await prisma.theme.update({ where: { id: opts.id }, data: restoreData });
      break;
    }
    case "Package": {
      const row = await prisma.package.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`Package ${opts.id} not found`);
      displayName = row.title;
      await prisma.package.update({ where: { id: opts.id }, data: restoreData });
      break;
    }
    case "ExtraService": {
      const row = await prisma.extraService.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`ExtraService ${opts.id} not found`);
      displayName = row.label;
      await prisma.extraService.update({ where: { id: opts.id }, data: restoreData });
      break;
    }
    case "GalleryImage": {
      const row = await prisma.galleryImage.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`GalleryImage ${opts.id} not found`);
      displayName = row.altText;
      await prisma.galleryImage.update({ where: { id: opts.id }, data: restoreData });
      break;
    }
    case "BlogPost": {
      const row = await prisma.blogPost.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`BlogPost ${opts.id} not found`);
      displayName = row.title;
      await prisma.blogPost.update({ where: { id: opts.id }, data: restoreData });
      break;
    }
    case "Event": {
      const row = await prisma.event.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`Event ${opts.id} not found`);
      displayName = row.title;
      await prisma.event.update({ where: { id: opts.id }, data: restoreData });
      break;
    }
    case "Testimonial": {
      const row = await prisma.testimonial.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`Testimonial ${opts.id} not found`);
      displayName = row.customerName;
      await prisma.testimonial.update({ where: { id: opts.id }, data: restoreData });
      break;
    }
    case "FAQ": {
      const row = await prisma.fAQ.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`FAQ ${opts.id} not found`);
      displayName = row.question;
      await prisma.fAQ.update({ where: { id: opts.id }, data: restoreData });
      break;
    }
    case "Popup": {
      const row = await prisma.popup.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`Popup ${opts.id} not found`);
      displayName = row.title;
      await prisma.popup.update({ where: { id: opts.id }, data: restoreData });
      break;
    }
    case "Product": {
      const row = await prisma.product.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`Product ${opts.id} not found`);
      displayName = row.title;
      await prisma.product.update({ where: { id: opts.id }, data: restoreData });
      break;
    }
    case "MediaAsset": {
      const row = await prisma.mediaAsset.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`MediaAsset ${opts.id} not found`);
      displayName = row.altText ?? row.cdnKey;
      // MediaAsset has no isActive — just clear deletedAt
      await prisma.mediaAsset.update({ where: { id: opts.id }, data: { deletedAt: null } });
      break;
    }
    case "Customer": {
      const row = await prisma.customer.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`Customer ${opts.id} not found`);
      displayName = `${row.fullName} (${row.email})`;
      await prisma.customer.update({ where: { id: opts.id }, data: { deletedAt: null } });
      break;
    }
    case "Lead": {
      const row = await prisma.lead.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`Lead ${opts.id} not found`);
      displayName = row.name;
      await prisma.lead.update({ where: { id: opts.id }, data: { deletedAt: null } });
      break;
    }
    case "ConsultationRequest": {
      const row = await prisma.consultationRequest.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`ConsultationRequest ${opts.id} not found`);
      displayName = `${row.name} (${row.email})`;
      await prisma.consultationRequest.update({ where: { id: opts.id }, data: { deletedAt: null } });
      break;
    }
    case "AdminUser": {
      const row = await prisma.adminUser.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`AdminUser ${opts.id} not found`);
      displayName = `${row.name} (${row.email})`;
      await prisma.adminUser.update({ where: { id: opts.id }, data: { deletedAt: null, isActive: true } });
      break;
    }
    case "Invoice": {
      const row = await prisma.invoice.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`Invoice ${opts.id} not found`);
      displayName = row.invoiceNumber;
      await prisma.invoice.update({ where: { id: opts.id }, data: { deletedAt: null } });
      break;
    }
    case "ThemeSampleAsset": {
      const row = await prisma.themeSampleAsset.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`ThemeSampleAsset ${opts.id} not found`);
      displayName = row.title;
      await prisma.themeSampleAsset.update({ where: { id: opts.id }, data: { deletedAt: null } });
      break;
    }
    case "EventRegistration": {
      const row = await prisma.eventRegistration.findFirst({ where: { id: opts.id } });
      if (!row) throw new NotFoundError(`EventRegistration ${opts.id} not found`);
      displayName = `${row.name} (${row.email})`;
      await prisma.eventRegistration.update({ where: { id: opts.id }, data: { deletedAt: null } });
      break;
    }
  }

  await prisma.auditLog.create({
    data: {
      adminUserId: opts.adminId,
      action: "RESTORE",
      entityType: opts.entityType,
      entityId: opts.id,
      metadata: { displayName },
    },
  });

  void delPattern("pub:*");
  void delPattern("adm:*");

  return { restored: true, entityType: opts.entityType, id: opts.id };
}

/**
 * Permanently deletes a record from the database.
 * MediaAsset hard-delete is blocked — instruct user to remove references first.
 * Writes an audit log entry.
 */
export async function hardDeleteItem(opts: {
  entityType: RecycleBinEntityType;
  id: string;
  adminId: string;
  adminPassword: string;
}): Promise<{ hardDeleted: true; entityType: RecycleBinEntityType; id: string }> {
  await verifySuperAdminPassword(opts.adminId, opts.adminPassword);
  return _hardDeleteItem({ entityType: opts.entityType, id: opts.id, adminId: opts.adminId });
}

export async function getMediaAssetsUsage(ids: string[]) {
  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: ids } },
    include: {
      _count: {
        select: {
          blogFeaturedImages: true,
          eventBanners: true,
          galleryImages: true,
          popupImages: true,
          productCollections: true,
          productImages: true,
          metadataOgImages: true,
          themeHeroes: true,
          themeOgImages: true,
          sampleAssets: true,
        },
      },
    },
  });

  const usageByAsset: Record<string, number> = {};
  let totalUsage = 0;

  for (const asset of assets) {
    const usage =
      asset._count.blogFeaturedImages +
      asset._count.eventBanners +
      asset._count.galleryImages +
      asset._count.popupImages +
      asset._count.productCollections +
      asset._count.productImages +
      asset._count.metadataOgImages +
      asset._count.themeHeroes +
      asset._count.themeOgImages +
      asset._count.sampleAssets;
    
    usageByAsset[asset.id] = usage;
    totalUsage += usage;
  }

  return { usageByAsset, totalUsage, assetsFound: assets.length };
}

export async function hardDeleteItemsBulk(opts: {
  items: { entityType: RecycleBinEntityType; id: string }[];
  adminId: string;
  adminPassword: string;
}) {
  await verifySuperAdminPassword(opts.adminId, opts.adminPassword);

  let deletedCount = 0;
  const errors: Array<{ entityType: string; id: string; error: string }> = [];

  for (const item of opts.items) {
    try {
      await _hardDeleteItem({ entityType: item.entityType, id: item.id, adminId: opts.adminId });
      deletedCount++;
    } catch (err: any) {
      errors.push({ entityType: item.entityType, id: item.id, error: err.message || String(err) });
    }
  }

  return { deletedCount, errors };
}

async function _hardDeleteItem(opts: {
  entityType: RecycleBinEntityType;
  id: string;
  adminId: string;
}): Promise<{ hardDeleted: true; entityType: RecycleBinEntityType; id: string }> {
  let displayName = opts.id;

  try {
    await prisma.$transaction(async (tx) => {
      switch (opts.entityType) {
        case "MediaAsset": {
          const row = await tx.mediaAsset.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.cdnKey;
          await deleteObjectByKey(row.cdnKey);
          await tx.mediaAsset.delete({ where: { id: opts.id } });
          break;
        }
        case "Theme": {
          const row = await tx.theme.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.title;
          await tx.themePackage.deleteMany({ where: { themeId: opts.id } });
          await tx.themeSampleAsset.deleteMany({ where: { themeId: opts.id } });
          await tx.productThemeTag.deleteMany({ where: { themeId: opts.id } });
          await tx.theme.delete({ where: { id: opts.id } });
          break;
        }
        case "Package": {
          const row = await tx.package.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.title;
          await tx.themePackage.deleteMany({ where: { packageId: opts.id } });
          await tx.package.delete({ where: { id: opts.id } });
          break;
        }
        case "ExtraService": {
          const row = await tx.extraService.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.label;
          await tx.extraService.delete({ where: { id: opts.id } });
          break;
        }
        case "GalleryImage": {
          const row = await tx.galleryImage.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.altText;
          await tx.galleryImageTag.deleteMany({ where: { galleryImageId: opts.id } });
          await tx.galleryImage.delete({ where: { id: opts.id } });
          break;
        }
        case "BlogPost": {
          const row = await tx.blogPost.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.title;
          await tx.blogPostCategory.deleteMany({ where: { blogPostId: opts.id } });
          await tx.blogPostTag.deleteMany({ where: { blogPostId: opts.id } });
          await tx.blogPost.delete({ where: { id: opts.id } });
          break;
        }
        case "Event": {
          const row = await tx.event.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.title;
          await tx.event.delete({ where: { id: opts.id } });
          break;
        }
        case "Testimonial": {
          const row = await tx.testimonial.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.customerName;
          await tx.testimonial.delete({ where: { id: opts.id } });
          break;
        }
        case "FAQ": {
          const row = await tx.fAQ.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.question;
          await tx.fAQ.delete({ where: { id: opts.id } });
          break;
        }
        case "Popup": {
          const row = await tx.popup.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.title;
          await tx.popup.delete({ where: { id: opts.id } });
          break;
        }
        case "Product": {
          const row = await tx.product.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.title;
          await tx.productCategoryTag.deleteMany({ where: { productId: opts.id } });
          await tx.productThemeTag.deleteMany({ where: { productId: opts.id } });
          await tx.productImage.deleteMany({ where: { productId: opts.id } });
          await tx.productPersonalizationField.deleteMany({ where: { productId: opts.id } });
          await tx.product.delete({ where: { id: opts.id } });
          break;
        }
        case "Customer": {
          const row = await tx.customer.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = `${row.fullName} (${row.email})`;
          await tx.customer.delete({ where: { id: opts.id } });
          break;
        }
        case "Lead": {
          const row = await tx.lead.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.name;
          await tx.lead.delete({ where: { id: opts.id } });
          break;
        }
        case "ConsultationRequest": {
          const row = await tx.consultationRequest.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = `${row.name} (${row.email})`;
          await tx.consultationRequest.delete({ where: { id: opts.id } });
          break;
        }
        case "AdminUser": {
          const row = await tx.adminUser.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          // Prevent hard-deleting self
          if (row.id === opts.adminId) {
            throw new AppError("CANNOT_DELETE_SELF", "You cannot permanently delete your own admin account.", 409);
          }
          displayName = `${row.name} (${row.email})`;
          await tx.adminUser.delete({ where: { id: opts.id } });
          break;
        }
        case "Invoice": {
          const row = await tx.invoice.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.invoiceNumber;
          await tx.invoice.delete({ where: { id: opts.id } });
          break;
        }
        case "ThemeSampleAsset": {
          const row = await tx.themeSampleAsset.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = row.title;
          await tx.themeSampleAsset.delete({ where: { id: opts.id } });
          break;
        }
        case "EventRegistration": {
          const row = await tx.eventRegistration.findFirst({ where: { id: opts.id } });
          if (!row) throw new NotFoundError();
          displayName = `${row.name} (${row.email})`;
          await tx.eventRegistration.delete({ where: { id: opts.id } });
          break;
        }
      }
    });
  } catch (err) {
    // Re-throw our own errors as-is
    if (err instanceof AppError) throw err;
    // Prisma FK constraint violation
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Foreign key constraint") || msg.includes("violates foreign key")) {
      throw new AppError(
        "FK_CONSTRAINT",
        "This record cannot be permanently deleted because other records still reference it. Remove all references first.",
        409,
      );
    }
    throw err;
  }

  await prisma.auditLog.create({
    data: {
      adminUserId: opts.adminId,
      action: "HARD_DELETE",
      entityType: opts.entityType,
      entityId: opts.id,
      metadata: { displayName },
    },
  });

  void delPattern("pub:*");
  void delPattern("adm:*");

  return { hardDeleted: true, entityType: opts.entityType, id: opts.id };
}

/** Returns the total count of all soft-deleted records across all entity types. */
export async function getRecycleBinCount(): Promise<number> {
  const where = { deletedAt: { not: null } };
  const counts = await Promise.all([
    prisma.theme.count({ where }),
    prisma.package.count({ where }),
    prisma.extraService.count({ where }),
    prisma.galleryImage.count({ where }),
    prisma.blogPost.count({ where }),
    prisma.event.count({ where }),
    prisma.testimonial.count({ where }),
    prisma.fAQ.count({ where }),
    prisma.popup.count({ where }),
    prisma.product.count({ where }),
    prisma.mediaAsset.count({ where }),
    prisma.customer.count({ where }),
    prisma.lead.count({ where }),
    prisma.consultationRequest.count({ where }),
    prisma.adminUser.count({ where }),
    prisma.invoice.count({ where }),
    prisma.themeSampleAsset.count({ where }),
    prisma.eventRegistration.count({ where }),
  ]);
  return counts.reduce((sum, c) => sum + c, 0);
}
