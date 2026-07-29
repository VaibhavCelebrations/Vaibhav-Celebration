"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guestRouter = void 0;
const params_1 = require("../../lib/params");
const express_1 = require("express");
const zod_1 = require("zod");
const response_1 = require("../../lib/response");
const guest_auth_1 = require("../../middleware/guest-auth");
const validate_1 = require("../../middleware/validate");
const guest_service_1 = require("./guest.service");
exports.guestRouter = (0, express_1.Router)();
exports.guestRouter.post("/lookup/request-otp", (0, validate_1.validate)(zod_1.z.object({
    referenceCode: zod_1.z.string().min(1),
    referenceType: zod_1.z.enum(["BOOKING", "ORDER", "REGISTRY"]),
    email: zod_1.z.string().email(),
})), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, guest_service_1.requestOtp)(req.body));
    }
    catch (err) {
        return next(err);
    }
});
exports.guestRouter.post("/lookup/verify-otp", (0, validate_1.validate)(zod_1.z.object({
    referenceCode: zod_1.z.string().min(1),
    otp: zod_1.z.string().length(6),
})), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, guest_service_1.verifyOtp)(req.body));
    }
    catch (err) {
        return next(err);
    }
});
exports.guestRouter.get("/booking/:bookingCode", guest_auth_1.requireGuest, (0, guest_auth_1.requireGuestScope)("bookingCode"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, guest_service_1.getGuestBooking)((0, params_1.param)(req, "bookingCode")));
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=guest.routes.js.map