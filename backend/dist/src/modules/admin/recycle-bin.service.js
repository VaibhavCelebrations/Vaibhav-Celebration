"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECYCLE_BIN_ENTITY_TYPES = void 0;
exports.listDeletedItems = listDeletedItems;
exports.verifySuperAdminPassword = verifySuperAdminPassword;
exports.restoreItem = restoreItem;
exports.restoreItemsBulk = restoreItemsBulk;
exports.hardDeleteItem = hardDeleteItem;
exports.hardDeleteItemsBulk = hardDeleteItemsBulk;
exports.getRecycleBinCount = getRecycleBinCount;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const response_1 = require("../../lib/response");
const redis_1 = require("../../lib/redis");
// ─── Supported entity types ──────────────────────────────────────────────────
exports.RECYCLE_BIN_ENTITY_TYPES = [
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
];
// Which entity types have an `isActive` field — these get reactivated on restore
const ENTITIES_WITH_IS_ACTIVE = new Set([
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
// ─── Helpers to extract display name from a prisma record ────────────────────
function getDisplayName(type, row) {
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
function getMeta(type, row) {
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
async function queryDeleted(type, skip, take) {
    const where = { deletedAt: { not: null } };
    switch (type) {
        case "Theme": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.theme.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.theme.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "Package": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.package.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.package.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "ExtraService": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.extraService.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.extraService.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "GalleryImage": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.galleryImage.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.galleryImage.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "BlogPost": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.blogPost.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.blogPost.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "Event": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.event.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.event.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "Testimonial": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.testimonial.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.testimonial.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "FAQ": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.fAQ.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.fAQ.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "Popup": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.popup.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.popup.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "Product": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.product.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.product.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "MediaAsset": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.mediaAsset.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.mediaAsset.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "Customer": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.customer.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.customer.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "Lead": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.lead.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.lead.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "ConsultationRequest": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.consultationRequest.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.consultationRequest.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "AdminUser": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.adminUser.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.adminUser.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "Invoice": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.invoice.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.invoice.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "ThemeSampleAsset": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.themeSampleAsset.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.themeSampleAsset.count({ where }),
            ]);
            return { rows: rows, total };
        }
        case "EventRegistration": {
            const [rows, total] = await Promise.all([
                prisma_1.prisma.eventRegistration.findMany({ where, skip, take, orderBy: { deletedAt: "desc" } }),
                prisma_1.prisma.eventRegistration.count({ where }),
            ]);
            return { rows: rows, total };
        }
    }
}
// ─── Public service functions ─────────────────────────────────────────────────
/**
 * Returns a paginated list of all soft-deleted records.
 * If `entityType` is provided, only that type is returned.
 * Otherwise, all types are queried and merged, sorted by deletedAt desc.
 */
async function listDeletedItems(opts) {
    const { page, pageSize, skip, take } = (0, response_1.parsePagination)({
        page: opts.page,
        pageSize: opts.pageSize,
    });
    const types = opts.entityType
        ? [opts.entityType]
        : [...exports.RECYCLE_BIN_ENTITY_TYPES];
    if (opts.entityType) {
        // Single type — use DB pagination directly
        const { rows, total } = await queryDeleted(opts.entityType, skip, take);
        const items = rows.map((row) => ({
            id: String(row.id),
            entityType: opts.entityType,
            displayName: getDisplayName(opts.entityType, row),
            deletedAt: row.deletedAt,
            meta: getMeta(opts.entityType, row),
        }));
        return { items, total, page, pageSize, meta: (0, response_1.paginationMeta)(page, pageSize, total) };
    }
    // All types — fetch counts + a page worth across all
    // Strategy: fetch total counts per type, then fetch only from the types
    // that cover the requested page range (interleaved by deletedAt desc).
    // For simplicity (and correctness at small scale) we fetch all deleted IDs
    // in a lightweight way: just id + deletedAt for sorting.
    const allItems = [];
    for (const type of types) {
        const { rows } = await queryDeleted(type, 0, 10000); // fetch all for cross-type sort
        for (const row of rows) {
            allItems.push({
                id: String(row.id),
                entityType: type,
                displayName: getDisplayName(type, row),
                deletedAt: row.deletedAt,
                meta: getMeta(type, row),
            });
        }
    }
    // Sort by deletedAt descending
    allItems.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
    const total = allItems.length;
    const items = allItems.slice(skip, skip + take);
    return { items, total, page, pageSize, meta: (0, response_1.paginationMeta)(page, pageSize, total) };
}
/**
 * Verifies a super admin's password.
 * Returns true if correct; throws UnauthorizedError if wrong.
 */
async function verifySuperAdminPassword(adminId, password) {
    const admin = await prisma_1.prisma.adminUser.findFirst({
        where: { id: adminId, deletedAt: null },
        select: { passwordHash: true },
    });
    if (!admin)
        throw new errors_1.UnauthorizedError("Admin account not found");
    const valid = await bcryptjs_1.default.compare(password, admin.passwordHash);
    if (!valid)
        throw new errors_1.UnauthorizedError("Incorrect password");
    return true;
}
/**
 * Restores a soft-deleted record by clearing deletedAt.
 * Also re-sets isActive = true for entities that have that field.
 * Writes an audit log entry.
 */
async function restoreItem(opts) {
    await verifySuperAdminPassword(opts.adminId, opts.adminPassword);
    return _restoreItem({ entityType: opts.entityType, id: opts.id, adminId: opts.adminId });
}
async function restoreItemsBulk(opts) {
    await verifySuperAdminPassword(opts.adminId, opts.adminPassword);
    let restoredCount = 0;
    const errors = [];
    for (const item of opts.items) {
        try {
            await _restoreItem({ entityType: item.entityType, id: item.id, adminId: opts.adminId });
            restoredCount++;
        }
        catch (err) {
            errors.push({ entityType: item.entityType, id: item.id, error: err.message || String(err) });
        }
    }
    return { restoredCount, errors };
}
async function _restoreItem(opts) {
    const setActive = ENTITIES_WITH_IS_ACTIVE.has(opts.entityType);
    const restoreData = {
        deletedAt: null,
        ...(setActive ? { isActive: true } : {}),
    };
    let displayName = opts.id;
    switch (opts.entityType) {
        case "Theme": {
            const row = await prisma_1.prisma.theme.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`Theme ${opts.id} not found`);
            displayName = row.title;
            await prisma_1.prisma.theme.update({ where: { id: opts.id }, data: restoreData });
            break;
        }
        case "Package": {
            const row = await prisma_1.prisma.package.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`Package ${opts.id} not found`);
            displayName = row.title;
            await prisma_1.prisma.package.update({ where: { id: opts.id }, data: restoreData });
            break;
        }
        case "ExtraService": {
            const row = await prisma_1.prisma.extraService.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`ExtraService ${opts.id} not found`);
            displayName = row.label;
            await prisma_1.prisma.extraService.update({ where: { id: opts.id }, data: restoreData });
            break;
        }
        case "GalleryImage": {
            const row = await prisma_1.prisma.galleryImage.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`GalleryImage ${opts.id} not found`);
            displayName = row.altText;
            await prisma_1.prisma.galleryImage.update({ where: { id: opts.id }, data: restoreData });
            break;
        }
        case "BlogPost": {
            const row = await prisma_1.prisma.blogPost.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`BlogPost ${opts.id} not found`);
            displayName = row.title;
            await prisma_1.prisma.blogPost.update({ where: { id: opts.id }, data: restoreData });
            break;
        }
        case "Event": {
            const row = await prisma_1.prisma.event.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`Event ${opts.id} not found`);
            displayName = row.title;
            await prisma_1.prisma.event.update({ where: { id: opts.id }, data: restoreData });
            break;
        }
        case "Testimonial": {
            const row = await prisma_1.prisma.testimonial.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`Testimonial ${opts.id} not found`);
            displayName = row.customerName;
            await prisma_1.prisma.testimonial.update({ where: { id: opts.id }, data: restoreData });
            break;
        }
        case "FAQ": {
            const row = await prisma_1.prisma.fAQ.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`FAQ ${opts.id} not found`);
            displayName = row.question;
            await prisma_1.prisma.fAQ.update({ where: { id: opts.id }, data: restoreData });
            break;
        }
        case "Popup": {
            const row = await prisma_1.prisma.popup.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`Popup ${opts.id} not found`);
            displayName = row.title;
            await prisma_1.prisma.popup.update({ where: { id: opts.id }, data: restoreData });
            break;
        }
        case "Product": {
            const row = await prisma_1.prisma.product.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`Product ${opts.id} not found`);
            displayName = row.title;
            await prisma_1.prisma.product.update({ where: { id: opts.id }, data: restoreData });
            break;
        }
        case "MediaAsset": {
            const row = await prisma_1.prisma.mediaAsset.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`MediaAsset ${opts.id} not found`);
            displayName = row.altText ?? row.cdnKey;
            // MediaAsset has no isActive — just clear deletedAt
            await prisma_1.prisma.mediaAsset.update({ where: { id: opts.id }, data: { deletedAt: null } });
            break;
        }
        case "Customer": {
            const row = await prisma_1.prisma.customer.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`Customer ${opts.id} not found`);
            displayName = `${row.fullName} (${row.email})`;
            await prisma_1.prisma.customer.update({ where: { id: opts.id }, data: { deletedAt: null } });
            break;
        }
        case "Lead": {
            const row = await prisma_1.prisma.lead.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`Lead ${opts.id} not found`);
            displayName = row.name;
            await prisma_1.prisma.lead.update({ where: { id: opts.id }, data: { deletedAt: null } });
            break;
        }
        case "ConsultationRequest": {
            const row = await prisma_1.prisma.consultationRequest.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`ConsultationRequest ${opts.id} not found`);
            displayName = `${row.name} (${row.email})`;
            await prisma_1.prisma.consultationRequest.update({ where: { id: opts.id }, data: { deletedAt: null } });
            break;
        }
        case "AdminUser": {
            const row = await prisma_1.prisma.adminUser.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`AdminUser ${opts.id} not found`);
            displayName = `${row.name} (${row.email})`;
            await prisma_1.prisma.adminUser.update({ where: { id: opts.id }, data: { deletedAt: null, isActive: true } });
            break;
        }
        case "Invoice": {
            const row = await prisma_1.prisma.invoice.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`Invoice ${opts.id} not found`);
            displayName = row.invoiceNumber;
            await prisma_1.prisma.invoice.update({ where: { id: opts.id }, data: { deletedAt: null } });
            break;
        }
        case "ThemeSampleAsset": {
            const row = await prisma_1.prisma.themeSampleAsset.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`ThemeSampleAsset ${opts.id} not found`);
            displayName = row.title;
            await prisma_1.prisma.themeSampleAsset.update({ where: { id: opts.id }, data: { deletedAt: null } });
            break;
        }
        case "EventRegistration": {
            const row = await prisma_1.prisma.eventRegistration.findFirst({ where: { id: opts.id } });
            if (!row)
                throw new errors_1.NotFoundError(`EventRegistration ${opts.id} not found`);
            displayName = `${row.name} (${row.email})`;
            await prisma_1.prisma.eventRegistration.update({ where: { id: opts.id }, data: { deletedAt: null } });
            break;
        }
    }
    await prisma_1.prisma.auditLog.create({
        data: {
            adminUserId: opts.adminId,
            action: "RESTORE",
            entityType: opts.entityType,
            entityId: opts.id,
            metadata: { displayName },
        },
    });
    void (0, redis_1.delPattern)("pub:*");
    void (0, redis_1.delPattern)("adm:*");
    return { restored: true, entityType: opts.entityType, id: opts.id };
}
/**
 * Permanently deletes a record from the database.
 * MediaAsset hard-delete is blocked — instruct user to remove references first.
 * Writes an audit log entry.
 */
async function hardDeleteItem(opts) {
    await verifySuperAdminPassword(opts.adminId, opts.adminPassword);
    return _hardDeleteItem({ entityType: opts.entityType, id: opts.id, adminId: opts.adminId });
}
async function hardDeleteItemsBulk(opts) {
    await verifySuperAdminPassword(opts.adminId, opts.adminPassword);
    let deletedCount = 0;
    const errors = [];
    for (const item of opts.items) {
        try {
            await _hardDeleteItem({ entityType: item.entityType, id: item.id, adminId: opts.adminId });
            deletedCount++;
        }
        catch (err) {
            errors.push({ entityType: item.entityType, id: item.id, error: err.message || String(err) });
        }
    }
    return { deletedCount, errors };
}
async function _hardDeleteItem(opts) {
    // MediaAsset — refuse hard delete; too many FK references across the schema
    if (opts.entityType === "MediaAsset") {
        throw new errors_1.AppError("MEDIA_ASSET_HARD_DELETE_BLOCKED", "Media assets cannot be permanently deleted from the Recycle Bin. Remove all references to this asset (blog posts, themes, events, etc.) before deleting it from the Media Library.", 409);
    }
    let displayName = opts.id;
    try {
        await prisma_1.prisma.$transaction(async (tx) => {
            switch (opts.entityType) {
                case "Theme": {
                    const row = await tx.theme.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = row.title;
                    await tx.themePackage.deleteMany({ where: { themeId: opts.id } });
                    await tx.themeSampleAsset.deleteMany({ where: { themeId: opts.id } });
                    await tx.productThemeTag.deleteMany({ where: { themeId: opts.id } });
                    await tx.theme.delete({ where: { id: opts.id } });
                    break;
                }
                case "Package": {
                    const row = await tx.package.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = row.title;
                    await tx.themePackage.deleteMany({ where: { packageId: opts.id } });
                    await tx.package.delete({ where: { id: opts.id } });
                    break;
                }
                case "ExtraService": {
                    const row = await tx.extraService.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = row.label;
                    await tx.extraService.delete({ where: { id: opts.id } });
                    break;
                }
                case "GalleryImage": {
                    const row = await tx.galleryImage.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = row.altText;
                    await tx.galleryImageTag.deleteMany({ where: { galleryImageId: opts.id } });
                    await tx.galleryImage.delete({ where: { id: opts.id } });
                    break;
                }
                case "BlogPost": {
                    const row = await tx.blogPost.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = row.title;
                    await tx.blogPostCategory.deleteMany({ where: { blogPostId: opts.id } });
                    await tx.blogPostTag.deleteMany({ where: { blogPostId: opts.id } });
                    await tx.blogPost.delete({ where: { id: opts.id } });
                    break;
                }
                case "Event": {
                    const row = await tx.event.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = row.title;
                    await tx.event.delete({ where: { id: opts.id } });
                    break;
                }
                case "Testimonial": {
                    const row = await tx.testimonial.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = row.customerName;
                    await tx.testimonial.delete({ where: { id: opts.id } });
                    break;
                }
                case "FAQ": {
                    const row = await tx.fAQ.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = row.question;
                    await tx.fAQ.delete({ where: { id: opts.id } });
                    break;
                }
                case "Popup": {
                    const row = await tx.popup.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = row.title;
                    await tx.popup.delete({ where: { id: opts.id } });
                    break;
                }
                case "Product": {
                    const row = await tx.product.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
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
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = `${row.fullName} (${row.email})`;
                    await tx.customer.delete({ where: { id: opts.id } });
                    break;
                }
                case "Lead": {
                    const row = await tx.lead.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = row.name;
                    await tx.lead.delete({ where: { id: opts.id } });
                    break;
                }
                case "ConsultationRequest": {
                    const row = await tx.consultationRequest.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = `${row.name} (${row.email})`;
                    await tx.consultationRequest.delete({ where: { id: opts.id } });
                    break;
                }
                case "AdminUser": {
                    const row = await tx.adminUser.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    // Prevent hard-deleting self
                    if (row.id === opts.adminId) {
                        throw new errors_1.AppError("CANNOT_DELETE_SELF", "You cannot permanently delete your own admin account.", 409);
                    }
                    displayName = `${row.name} (${row.email})`;
                    await tx.adminUser.delete({ where: { id: opts.id } });
                    break;
                }
                case "Invoice": {
                    const row = await tx.invoice.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = row.invoiceNumber;
                    await tx.invoice.delete({ where: { id: opts.id } });
                    break;
                }
                case "ThemeSampleAsset": {
                    const row = await tx.themeSampleAsset.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = row.title;
                    await tx.themeSampleAsset.delete({ where: { id: opts.id } });
                    break;
                }
                case "EventRegistration": {
                    const row = await tx.eventRegistration.findFirst({ where: { id: opts.id } });
                    if (!row)
                        throw new errors_1.NotFoundError();
                    displayName = `${row.name} (${row.email})`;
                    await tx.eventRegistration.delete({ where: { id: opts.id } });
                    break;
                }
            }
        });
    }
    catch (err) {
        // Re-throw our own errors as-is
        if (err instanceof errors_1.AppError)
            throw err;
        // Prisma FK constraint violation
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Foreign key constraint") || msg.includes("violates foreign key")) {
            throw new errors_1.AppError("FK_CONSTRAINT", "This record cannot be permanently deleted because other records still reference it. Remove all references first.", 409);
        }
        throw err;
    }
    await prisma_1.prisma.auditLog.create({
        data: {
            adminUserId: opts.adminId,
            action: "HARD_DELETE",
            entityType: opts.entityType,
            entityId: opts.id,
            metadata: { displayName },
        },
    });
    void (0, redis_1.delPattern)("pub:*");
    void (0, redis_1.delPattern)("adm:*");
    return { hardDeleted: true, entityType: opts.entityType, id: opts.id };
}
/** Returns the total count of all soft-deleted records across all entity types. */
async function getRecycleBinCount() {
    const where = { deletedAt: { not: null } };
    const counts = await Promise.all([
        prisma_1.prisma.theme.count({ where }),
        prisma_1.prisma.package.count({ where }),
        prisma_1.prisma.extraService.count({ where }),
        prisma_1.prisma.galleryImage.count({ where }),
        prisma_1.prisma.blogPost.count({ where }),
        prisma_1.prisma.event.count({ where }),
        prisma_1.prisma.testimonial.count({ where }),
        prisma_1.prisma.fAQ.count({ where }),
        prisma_1.prisma.popup.count({ where }),
        prisma_1.prisma.product.count({ where }),
        prisma_1.prisma.mediaAsset.count({ where }),
        prisma_1.prisma.customer.count({ where }),
        prisma_1.prisma.lead.count({ where }),
        prisma_1.prisma.consultationRequest.count({ where }),
        prisma_1.prisma.adminUser.count({ where }),
        prisma_1.prisma.invoice.count({ where }),
        prisma_1.prisma.themeSampleAsset.count({ where }),
        prisma_1.prisma.eventRegistration.count({ where }),
    ]);
    return counts.reduce((sum, c) => sum + c, 0);
}
//# sourceMappingURL=recycle-bin.service.js.map