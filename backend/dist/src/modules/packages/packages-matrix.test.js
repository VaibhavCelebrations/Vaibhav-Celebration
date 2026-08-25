"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const prisma_1 = require("../../db/prisma");
const extra_services_service_1 = require("../extra-services/extra-services.service");
const packages_service_1 = require("./packages.service");
const testLabel = `Vitest Extra Service ${Date.now()}`;
let createdServiceId = null;
(0, vitest_1.describe)("extra services CRUD", () => {
    (0, vitest_1.it)("creates an extra service with matrix rows for all packages", async () => {
        const item = await (0, extra_services_service_1.createExtraService)({
            label: testLabel,
            description: "Test service",
            customizationPriceInPaise: 99000,
            displayOrder: 999,
            isActive: true,
        });
        createdServiceId = item.id;
        (0, vitest_1.expect)(item.label).toBe(testLabel);
        (0, vitest_1.expect)(item.customizationPriceInPaise).toBe(99000);
        const packageCount = await prisma_1.prisma.package.count({ where: { deletedAt: null, isActive: true } });
        const itemCount = await prisma_1.prisma.packageServiceItem.count({
            where: { extraServiceId: item.id },
        });
        (0, vitest_1.expect)(itemCount).toBe(packageCount);
    });
    (0, vitest_1.it)("reads the created extra service", async () => {
        (0, vitest_1.expect)(createdServiceId).toBeTruthy();
        const item = await (0, extra_services_service_1.getExtraService)(createdServiceId);
        (0, vitest_1.expect)(item.label).toBe(testLabel);
    });
    (0, vitest_1.it)("updates the extra service price", async () => {
        (0, vitest_1.expect)(createdServiceId).toBeTruthy();
        const updated = await (0, extra_services_service_1.updateExtraService)(createdServiceId, {
            customizationPriceInPaise: 149000,
            description: "Updated description",
        });
        (0, vitest_1.expect)(updated.customizationPriceInPaise).toBe(149000);
        (0, vitest_1.expect)(updated.description).toBe("Updated description");
    });
    (0, vitest_1.it)("lists extra services including inactive", async () => {
        const items = await (0, extra_services_service_1.listExtraServices)(true);
        (0, vitest_1.expect)(items.some((item) => item.id === createdServiceId)).toBe(true);
    });
    (0, vitest_1.it)("archives the extra service", async () => {
        (0, vitest_1.expect)(createdServiceId).toBeTruthy();
        await (0, extra_services_service_1.deleteExtraService)(createdServiceId);
        const archived = await prisma_1.prisma.extraService.findUnique({ where: { id: createdServiceId } });
        (0, vitest_1.expect)(archived?.deletedAt).not.toBeNull();
        (0, vitest_1.expect)(archived?.isActive).toBe(false);
    });
});
(0, vitest_1.describe)("package matrix save", () => {
    let premiumPkgId;
    let videoServiceId;
    let originalPrice;
    let originalIncluded;
    let originalVideoPrice;
    (0, vitest_1.beforeAll)(async () => {
        const matrix = await (0, packages_service_1.getPackageMatrix)();
        const premium = matrix.packages.find((p) => p.slug === "premium");
        const videoSvc = matrix.extraServices.find((s) => s.label === "Video invites");
        if (!premium || !videoSvc) {
            throw new Error("Seed data missing premium package or Video invites service");
        }
        premiumPkgId = premium.id;
        videoServiceId = videoSvc.id;
        originalPrice = premium.priceInPaise;
        originalVideoPrice = videoSvc.customizationPriceInPaise;
        const cell = premium.serviceItems.find((i) => i.extraServiceId === videoSvc.id);
        originalIncluded = cell?.isIncluded ?? false;
    });
    (0, vitest_1.it)("loads the package matrix", async () => {
        const matrix = await (0, packages_service_1.getPackageMatrix)();
        (0, vitest_1.expect)(matrix.packages.length).toBeGreaterThanOrEqual(3);
        (0, vitest_1.expect)(matrix.extraServices.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("updates package pricing without breaking order package line references", async () => {
        const matrix = await (0, packages_service_1.getPackageMatrix)();
        const packages = matrix.packages.map((pkg) => ({
            packageId: pkg.id,
            title: pkg.title,
            description: pkg.description,
            priceInPaise: pkg.id === premiumPkgId ? originalPrice + 10000 : pkg.priceInPaise,
            isRecommended: pkg.isRecommended,
            isActive: pkg.isActive,
            isCustomizable: pkg.isCustomizable,
            items: matrix.extraServices.map((svc, index) => {
                const existing = pkg.serviceItems.find((i) => i.extraServiceId === svc.id);
                return {
                    extraServiceId: svc.id,
                    isIncluded: existing?.isIncluded ?? false,
                    displayOrder: index,
                };
            }),
        }));
        const beforeCount = await prisma_1.prisma.orderPackageLine.count({
            where: {
                packageServiceItem: { packageId: premiumPkgId, extraServiceId: videoServiceId },
            },
        });
        const saved = await (0, packages_service_1.savePackageMatrix)({
            packages,
            extraServices: matrix.extraServices.map((svc) => ({
                id: svc.id,
                customizationPriceInPaise: svc.customizationPriceInPaise,
            })),
        });
        const updatedPremium = saved.find((p) => p.id === premiumPkgId);
        (0, vitest_1.expect)(updatedPremium?.priceInPaise).toBe(originalPrice + 10000);
        const afterCount = await prisma_1.prisma.orderPackageLine.count({
            where: {
                packageServiceItem: { packageId: premiumPkgId, extraServiceId: videoServiceId },
            },
        });
        (0, vitest_1.expect)(afterCount).toBe(beforeCount);
    });
    (0, vitest_1.it)("updates inclusion flags and service customization prices", async () => {
        const matrix = await (0, packages_service_1.getPackageMatrix)();
        const toggledIncluded = !originalIncluded;
        await (0, packages_service_1.savePackageMatrix)({
            packages: matrix.packages.map((pkg) => ({
                packageId: pkg.id,
                items: matrix.extraServices.map((svc, index) => {
                    const existing = pkg.serviceItems.find((i) => i.extraServiceId === svc.id);
                    const isIncluded = pkg.id === premiumPkgId && svc.id === videoServiceId
                        ? toggledIncluded
                        : (existing?.isIncluded ?? false);
                    return {
                        extraServiceId: svc.id,
                        isIncluded,
                        displayOrder: index,
                    };
                }),
            })),
            extraServices: matrix.extraServices.map((svc) => ({
                id: svc.id,
                customizationPriceInPaise: svc.id === videoServiceId ? svc.customizationPriceInPaise + 5000 : svc.customizationPriceInPaise,
            })),
        });
        const refreshed = await (0, packages_service_1.getPackageMatrix)();
        const premium = refreshed.packages.find((p) => p.id === premiumPkgId);
        const cell = premium.serviceItems.find((i) => i.extraServiceId === videoServiceId);
        (0, vitest_1.expect)(cell.isIncluded).toBe(toggledIncluded);
        const videoSvc = refreshed.extraServices.find((s) => s.id === videoServiceId);
        (0, vitest_1.expect)(videoSvc.customizationPriceInPaise).toBe(matrix.extraServices.find((s) => s.id === videoServiceId).customizationPriceInPaise + 5000);
    });
    (0, vitest_1.afterAll)(async () => {
        const matrix = await (0, packages_service_1.getPackageMatrix)();
        await (0, packages_service_1.savePackageMatrix)({
            packages: matrix.packages.map((pkg) => ({
                packageId: pkg.id,
                priceInPaise: pkg.id === premiumPkgId ? originalPrice : pkg.priceInPaise,
                items: matrix.extraServices.map((svc, index) => {
                    const existing = pkg.serviceItems.find((i) => i.extraServiceId === svc.id);
                    const isIncluded = pkg.id === premiumPkgId && svc.id === videoServiceId
                        ? originalIncluded
                        : (existing?.isIncluded ?? false);
                    return {
                        extraServiceId: svc.id,
                        isIncluded,
                        displayOrder: index,
                    };
                }),
            })),
            extraServices: matrix.extraServices.map((svc) => ({
                id: svc.id,
                customizationPriceInPaise: svc.id === videoServiceId ? originalVideoPrice : svc.customizationPriceInPaise,
            })),
        });
    });
});
(0, vitest_1.afterAll)(async () => {
    await prisma_1.prisma.$disconnect();
});
//# sourceMappingURL=packages-matrix.test.js.map