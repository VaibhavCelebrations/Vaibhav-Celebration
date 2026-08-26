"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeQuote = computeQuote;
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const settings_1 = require("../../lib/settings");
/**
 * Authoritative pricing engine — Document 04 §3.2.
 * Frontend must never compute final totals; only this module does.
 */
async function computeQuote(input) {
    const pkg = await prisma_1.prisma.package.findFirst({
        where: { id: input.packageId, deletedAt: null, isActive: true },
        include: {
            serviceItems: {
                where: { extraService: { deletedAt: null } },
                orderBy: { displayOrder: "asc" },
                include: { extraService: true },
            },
        },
    });
    if (!pkg)
        throw new errors_1.NotFoundError("Package not found");
    let basePriceInPaise = pkg.priceInPaise;
    let priceOverrideApplied = false;
    let themeTitle = null;
    if (input.themeId) {
        const link = await prisma_1.prisma.themePackage.findFirst({
            where: { themeId: input.themeId, packageId: pkg.id },
            include: { theme: { select: { title: true, deletedAt: true, isActive: true } } },
        });
        if (!link || link.theme.deletedAt || !link.theme.isActive) {
            throw new errors_1.ValidationError("Selected theme is not available for this package");
        }
        themeTitle = link.theme.title;
        if (link.priceOverrideInPaise != null) {
            basePriceInPaise = link.priceOverrideInPaise;
            priceOverrideApplied = true;
        }
    }
    const includedServices = pkg.serviceItems
        .filter((s) => s.isIncluded && s.extraService.isActive && !s.extraService.deletedAt)
        .map((s) => ({ label: s.extraService.label, extraServiceId: s.extraServiceId }));
    const customizableItems = pkg.serviceItems.filter((s) => !s.isIncluded &&
        s.extraService.customizationPriceInPaise > 0 &&
        s.extraService.isActive &&
        !s.extraService.deletedAt);
    const optionMap = new Map(customizableItems.map((s) => [s.id, s]));
    const options = [];
    for (const sel of input.selectedOptions ?? []) {
        if (sel.quantity <= 0)
            continue;
        const item = optionMap.get(sel.optionId);
        if (!item)
            throw new errors_1.ValidationError(`Unknown customization option: ${sel.optionId}`);
        if (sel.quantity !== 1) {
            throw new errors_1.ValidationError(`Quantity for "${item.extraService.label}" must be 1`);
        }
        const lineTotalInPaise = item.extraService.customizationPriceInPaise;
        options.push({
            optionId: item.id,
            label: item.extraService.label,
            quantity: sel.quantity,
            unitPriceInPaise: item.extraService.customizationPriceInPaise,
            lineTotalInPaise,
        });
    }
    const customizationTotalInPaise = options.reduce((s, o) => s + o.lineTotalInPaise, 0);
    const subtotalInPaise = basePriceInPaise + customizationTotalInPaise;
    const gstPercent = await (0, settings_1.getGstPercent)();
    const gstInPaise = (0, settings_1.gstOn)(subtotalInPaise, gstPercent);
    const totalInPaise = subtotalInPaise + gstInPaise;
    return {
        packageId: pkg.id,
        themeId: input.themeId ?? null,
        packageTitle: pkg.title,
        themeTitle,
        basePriceInPaise,
        priceOverrideApplied,
        options,
        customizationTotalInPaise,
        subtotalInPaise,
        gstPercent,
        gstInPaise,
        totalInPaise,
        includedServices,
        availableCustomizations: customizableItems.map((s) => ({
            optionId: s.id,
            label: s.extraService.label,
            customizationPriceInPaise: s.extraService.customizationPriceInPaise,
        })),
    };
}
//# sourceMappingURL=pricing.service.js.map