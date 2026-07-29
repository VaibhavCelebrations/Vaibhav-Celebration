"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminBookingsRouter = exports.checkoutRouter = exports.bookingsRouter = void 0;
const params_1 = require("../../lib/params");
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const audit_1 = require("../../lib/audit");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const guest_auth_1 = require("../../middleware/guest-auth");
const idempotency_1 = require("../../middleware/idempotency");
const validate_1 = require("../../middleware/validate");
const validators_1 = require("../../lib/validators");
const bookings_service_1 = require("./bookings.service");
const createSchema = zod_1.z.object({
    themeId: zod_1.z.string().min(1),
    packageId: zod_1.z.string().min(1),
    eventDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    selectedOptions: zod_1.z
        .array(zod_1.z.object({ optionId: zod_1.z.string().min(1), quantity: zod_1.z.number().int().min(0) }))
        .optional(),
    guestName: zod_1.z.string().min(1),
    guestEmail: zod_1.z.string().email(),
    guestPhone: zod_1.z.string().min(8),
});
exports.bookingsRouter = (0, express_1.Router)();
exports.bookingsRouter.post("/", idempotency_1.idempotency, (0, validate_1.validate)(createSchema), async (req, res, next) => {
    try {
        return (0, response_1.created)(res, await (0, bookings_service_1.createBooking)(req.body));
    }
    catch (err) {
        return next(err);
    }
});
exports.bookingsRouter.post("/:bookingCode/cancel", guest_auth_1.requireGuest, (0, guest_auth_1.requireGuestScope)("bookingCode"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, bookings_service_1.cancelBooking)((0, params_1.param)(req, "bookingCode")));
    }
    catch (err) {
        return next(err);
    }
});
exports.checkoutRouter = (0, express_1.Router)();
exports.checkoutRouter.post("/booking/:bookingCode/summary", (0, validate_1.validate)(zod_1.z.object({ bookingCode: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, bookings_service_1.getCheckoutSummary)((0, params_1.param)(req, "bookingCode")));
    }
    catch (err) {
        return next(err);
    }
});
const adminRoles = [auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN)];
exports.adminBookingsRouter = (0, express_1.Router)();
exports.adminBookingsRouter.use(...adminRoles);
exports.adminBookingsRouter.get("/", (0, validate_1.validate)(validators_1.paginationQuerySchema.extend({
    search: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(client_1.BookingStatus).optional(),
    paymentStatus: zod_1.z.nativeEnum(client_1.PaymentStatus).optional(),
    themeId: zod_1.z.string().optional(),
    packageId: zod_1.z.string().optional(),
    from: zod_1.z.string().optional(),
    to: zod_1.z.string().optional(),
}), "query"), async (req, res, next) => {
    try {
        const q = req.query;
        const { page, pageSize } = (0, response_1.parsePagination)(q);
        const { total, items } = await (0, bookings_service_1.listAdminBookings)({ ...q, page, pageSize });
        return (0, response_1.ok)(res, items, { pagination: (0, response_1.paginationMeta)(page, pageSize, total) });
    }
    catch (err) {
        return next(err);
    }
});
exports.adminBookingsRouter.get("/calendar", (0, validate_1.validate)(zod_1.z.object({
    view: zod_1.z.enum(["day", "week", "month"]).default("month"),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}), "query"), async (req, res, next) => {
    try {
        const { view, date } = req.query;
        return (0, response_1.ok)(res, await (0, bookings_service_1.getCalendarBookings)(view, date));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminBookingsRouter.put("/:id/status", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(zod_1.z.object({ status: zod_1.z.nativeEnum(client_1.BookingStatus) })), async (req, res, next) => {
    try {
        const item = await (0, bookings_service_1.adminUpdateBookingStatus)((0, params_1.param)(req, "id"), req.body.status);
        await (0, audit_1.writeAuditLog)({
            adminUserId: req.admin.sub,
            action: "BOOKING_STATUS_CHANGED",
            entityType: "Booking",
            entityId: item.id,
            metadata: { status: item.status },
            ipAddress: (0, audit_1.clientIp)(req),
        });
        return (0, response_1.ok)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
exports.adminBookingsRouter.post("/:bookingCode/cancel", (0, validate_1.validate)(zod_1.z.object({ bookingCode: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        const item = await (0, bookings_service_1.cancelBooking)((0, params_1.param)(req, "bookingCode"));
        await (0, audit_1.writeAuditLog)({
            adminUserId: req.admin.sub,
            action: "BOOKING_CANCELLED",
            entityType: "Booking",
            entityId: item.id,
            ipAddress: (0, audit_1.clientIp)(req),
        });
        return (0, response_1.ok)(res, item);
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=bookings.routes.js.map