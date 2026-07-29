"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const response_1 = require("../../lib/response");
const pricing_service_1 = require("./pricing.service");
const quoteSchema = zod_1.z.object({
    packageId: zod_1.z.string().min(1),
    themeId: zod_1.z.string().min(1).optional().nullable(),
    selectedOptions: zod_1.z
        .array(zod_1.z.object({
        optionId: zod_1.z.string().min(1),
        quantity: zod_1.z.number().int().min(0),
    }))
        .default([]),
});
exports.pricingRouter = (0, express_1.Router)();
exports.pricingRouter.post("/quote", (0, validate_1.validate)(quoteSchema), async (req, res, next) => {
    try {
        const body = req.body;
        const quote = await (0, pricing_service_1.computeQuote)(body);
        return (0, response_1.ok)(res, quote);
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=pricing.routes.js.map