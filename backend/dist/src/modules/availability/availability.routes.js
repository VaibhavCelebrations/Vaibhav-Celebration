"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const response_1 = require("../../lib/response");
const availability_service_1 = require("./availability.service");
const dateQuery = zod_1.z.object({
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const rangeQuery = zod_1.z.object({
    from: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
exports.availabilityRouter = (0, express_1.Router)();
exports.availabilityRouter.get("/", (0, validate_1.validate)(dateQuery, "query"), async (req, res, next) => {
    try {
        const { date } = req.query;
        return (0, response_1.ok)(res, await (0, availability_service_1.getAvailabilityForDate)(date));
    }
    catch (err) {
        return next(err);
    }
});
exports.availabilityRouter.get("/range", (0, validate_1.validate)(rangeQuery, "query"), async (req, res, next) => {
    try {
        const { from, to } = req.query;
        return (0, response_1.ok)(res, await (0, availability_service_1.getAvailabilityRange)(from, to));
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=availability.routes.js.map