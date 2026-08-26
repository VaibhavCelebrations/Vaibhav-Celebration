"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.builderRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const response_1 = require("../../lib/response");
const builder_service_1 = require("./builder.service");
const productsQuerySchema = zod_1.z.object({
    theme: zod_1.z.string().min(1),
    category: zod_1.z.string().min(1),
    tier: zod_1.z.enum(["standard", "premium", "luxe"]),
});
const quoteSchema = zod_1.z.object({
    packageSlug: zod_1.z.enum(["standard", "premium", "luxe"]),
    themeSlug: zod_1.z.string().min(1),
    guestCount: zod_1.z.number().int().min(5).max(200),
    location: zod_1.z.enum(["jaipur", "outside"]),
    selections: zod_1.z.object({
        welcomeItem: zod_1.z.string().min(1).optional().nullable(),
        activity1: zod_1.z.string().min(1).optional().nullable(),
        activity2: zod_1.z.string().min(1).optional().nullable(),
        returnGift: zod_1.z.string().min(1).optional().nullable(),
        familyActivity: zod_1.z.string().min(1).optional().nullable(),
        decor: zod_1.z.boolean().optional().default(false),
        personalization: zod_1.z.record(zod_1.z.string(), zod_1.z.boolean()).optional(),
        giftRegistryCustomize: zod_1.z.boolean().optional().default(false),
    }),
});
exports.builderRouter = (0, express_1.Router)();
exports.builderRouter.get("/products", (0, validate_1.validate)(productsQuerySchema, "query"), async (req, res, next) => {
    try {
        const q = req.query;
        return (0, response_1.ok)(res, await (0, builder_service_1.listBuilderProducts)(q));
    }
    catch (err) {
        return next(err);
    }
});
exports.builderRouter.post("/quote", (0, validate_1.validate)(quoteSchema), async (req, res, next) => {
    try {
        const body = req.body;
        return (0, response_1.ok)(res, await (0, builder_service_1.computeBuilderQuote)(body));
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=builder.routes.js.map