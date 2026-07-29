"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPackage = void 0;
exports.listPackages = listPackages;
exports.comparePackages = comparePackages;
exports.getPackageBySlug = getPackageBySlug;
exports.getPackageMatrix = getPackageMatrix;
exports.updatePackage = updatePackage;
exports.deletePackage = deletePackage;
exports.replacePackageServiceItems = replacePackageServiceItems;
exports.savePackageMatrix = savePackageMatrix;
exports.getPackageDetail = getPackageDetail;
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const redis_1 = require("../../lib/redis");
const PUB_TTL = 5 * 60;
const detailInclude = {
    serviceItems: {
        orderBy: { displayOrder: "asc" },
        include: {
            extraService: true,
        },
    },
};
async function listPackages() {
    return (0, redis_1.cached)("pub:packages:list", PUB_TTL, () => prisma_1.prisma.package.findMany({
        where: { deletedAt: null, isActive: true },
        include: detailInclude,
        orderBy: [{ tierRank: "asc" }, { displayOrder: "asc" }],
    }));
}
async function comparePackages(ids) {
    return prisma_1.prisma.package.findMany({
        where: { id: { in: ids }, deletedAt: null, isActive: true },
        include: detailInclude,
        orderBy: { tierRank: "asc" },
    });
}
async function getPackageBySlug(slug) {
    const key = `pub:packages:slug:${slug}`;
    const item = await (0, redis_1.cached)(key, PUB_TTL, () => prisma_1.prisma.package.findFirst({
        where: { slug, deletedAt: null, isActive: true },
        include: detailInclude,
    }));
    if (!item)
        throw new errors_1.NotFoundError("Package not found");
    return item;
}
async function getPackageMatrix() {
    return (0, redis_1.cached)(`pub:packages:matrix`, PUB_TTL, () => Promise.all([
        prisma_1.prisma.package.findMany({
            where: { deletedAt: null },
            include: {
                serviceItems: {
                    orderBy: { displayOrder: "asc" },
                    include: { extraService: true },
                },
            },
            orderBy: [{ tierRank: "asc" }, { displayOrder: "asc" }],
        }),
        prisma_1.prisma.extraService.findMany({
            where: { deletedAt: null },
            orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
        }),
    ]).then(([packages, extraServices]) => ({ packages, extraServices })));
}
const createPackage = async (data) => {
    const pkg = await prisma_1.prisma.package.create({ data });
    void (0, redis_1.delPattern)("pub:packages:*");
    void (0, redis_1.delPattern)("adm:packages:*");
    return pkg;
};
exports.createPackage = createPackage;
async function updatePackage(id, data) {
    const updated = await prisma_1.prisma.package.updateMany({
        where: { id, deletedAt: null },
        data,
    });
    if (!updated.count)
        throw new errors_1.NotFoundError("Package not found");
    const pkg = await prisma_1.prisma.package.findUniqueOrThrow({ where: { id } });
    void (0, redis_1.delPattern)("pub:packages:*");
    void (0, redis_1.delPattern)("adm:packages:*");
    return pkg;
}
async function deletePackage(id) {
    const updated = await prisma_1.prisma.package.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
    });
    if (!updated.count)
        throw new errors_1.NotFoundError("Package not found");
    void (0, redis_1.delPattern)("pub:packages:*");
    void (0, redis_1.delPattern)("adm:packages:*");
}
async function syncPackageServiceItems(tx, packageId, items) {
    const existing = await tx.packageServiceItem.findMany({ where: { packageId } });
    const existingByService = new Map(existing.map((row) => [row.extraServiceId, row]));
    const incomingServiceIds = new Set(items.map((item) => item.extraServiceId));
    const writes = [];
    for (const [index, item] of items.entries()) {
        const current = existingByService.get(item.extraServiceId);
        if (current) {
            writes.push(tx.packageServiceItem.update({
                where: { id: current.id },
                data: {
                    isIncluded: item.isIncluded,
                    displayOrder: item.displayOrder ?? index,
                },
            }));
            continue;
        }
        writes.push(tx.packageServiceItem.create({
            data: {
                packageId,
                extraServiceId: item.extraServiceId,
                isIncluded: item.isIncluded,
                displayOrder: item.displayOrder ?? index,
            },
        }));
    }
    await Promise.all(writes);
    const orphans = existing.filter((row) => !incomingServiceIds.has(row.extraServiceId));
    if (!orphans.length)
        return;
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
async function replacePackageServiceItems(packageId, items) {
    const pkg = await prisma_1.prisma.package.findFirst({
        where: { id: packageId, deletedAt: null },
    });
    if (!pkg)
        throw new errors_1.NotFoundError("Package not found");
    return prisma_1.prisma.$transaction(async (tx) => {
        await syncPackageServiceItems(tx, packageId, items);
        return tx.package.findUniqueOrThrow({
            where: { id: packageId },
            include: detailInclude,
        });
    });
}
/** Bulk-save matrix for all packages at once (Fiverr-style admin UI). */
async function savePackageMatrix({ packages, extraServices }) {
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        if (extraServices?.length) {
            await Promise.all(extraServices.map((svc) => tx.extraService.updateMany({
                where: { id: svc.id, deletedAt: null },
                data: { customizationPriceInPaise: svc.customizationPriceInPaise },
            })));
        }
        for (const row of packages) {
            const { packageId, items, ...pkgData } = row;
            const cleanData = Object.fromEntries(Object.entries(pkgData).filter(([, v]) => v !== undefined));
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
    }, { timeout: 30_000 });
    await (0, redis_1.delPattern)("pub:packages:*");
    await (0, redis_1.delPattern)("adm:packages:*");
    return result;
}
async function getPackageDetail(id) {
    const item = await prisma_1.prisma.package.findFirst({
        where: { id, deletedAt: null },
        include: detailInclude,
    });
    if (!item)
        throw new errors_1.NotFoundError("Package not found");
    return item;
}
//# sourceMappingURL=packages.service.js.map