"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExtraServices = listExtraServices;
exports.getExtraService = getExtraService;
exports.createExtraService = createExtraService;
exports.updateExtraService = updateExtraService;
exports.deleteExtraService = deleteExtraService;
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const redis_1 = require("../../lib/redis");
async function listExtraServices(includeInactive = false) {
    return prisma_1.prisma.extraService.findMany({
        where: { deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
        orderBy: [{ displayOrder: "asc" }, { label: "asc" }],
    });
}
async function getExtraService(id) {
    const item = await prisma_1.prisma.extraService.findFirst({
        where: { id, deletedAt: null },
    });
    if (!item)
        throw new errors_1.NotFoundError("Extra service not found");
    return item;
}
async function createExtraService(data) {
    return prisma_1.prisma.$transaction(async (tx) => {
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
        void (0, redis_1.delPattern)("pub:packages:*");
        return item;
    });
}
async function updateExtraService(id, data) {
    const updated = await prisma_1.prisma.extraService.updateMany({
        where: { id, deletedAt: null },
        data,
    });
    if (!updated.count)
        throw new errors_1.NotFoundError("Extra service not found");
    void (0, redis_1.delPattern)("pub:packages:*");
    return prisma_1.prisma.extraService.findUniqueOrThrow({ where: { id } });
}
async function deleteExtraService(id) {
    const updated = await prisma_1.prisma.extraService.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
    });
    if (!updated.count)
        throw new errors_1.NotFoundError("Extra service not found");
    void (0, redis_1.delPattern)("pub:packages:*");
}
//# sourceMappingURL=extra-services.service.js.map