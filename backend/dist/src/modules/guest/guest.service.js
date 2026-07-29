"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestOtp = requestOtp;
exports.verifyOtp = verifyOtp;
exports.getGuestBooking = getGuestBooking;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const prisma_1 = require("../../db/prisma");
const env_1 = require("../../config/env");
const errors_1 = require("../../lib/errors");
const mailer_1 = require("../../integrations/email/mailer");
const guest_auth_1 = require("../../middleware/guest-auth");
const bookings_service_1 = require("../bookings/bookings.service");
function generateOtp() {
    return String((0, crypto_1.randomInt)(100000, 999999));
}
async function resolveReference(referenceCode, referenceType, email) {
    const normalized = email.toLowerCase();
    if (referenceType === "BOOKING") {
        const booking = await prisma_1.prisma.booking.findFirst({
            where: { bookingCode: referenceCode, deletedAt: null },
            include: { customer: true },
        });
        if (!booking)
            throw new errors_1.NotFoundError("Booking not found");
        if (booking.guestEmail.toLowerCase() !== normalized && booking.customer.email.toLowerCase() !== normalized) {
            throw new errors_1.UnauthorizedError("Email does not match this booking");
        }
        return { email: booking.guestEmail };
    }
    // Phase 2/3: ORDER / REGISTRY — same shape, extend here
    throw new errors_1.AppError("VALIDATION_ERROR", `Unsupported referenceType: ${referenceType}`, 400);
}
async function requestOtp(input) {
    await resolveReference(input.referenceCode, input.referenceType, input.email);
    const otp = generateOtp();
    const otpHash = await bcryptjs_1.default.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + env_1.env.OTP_EXPIRES_MINUTES * 60_000);
    await prisma_1.prisma.guestVerificationToken.create({
        data: {
            referenceCode: input.referenceCode,
            referenceType: input.referenceType,
            email: input.email.toLowerCase(),
            otpHash,
            otpExpiresAt,
        },
    });
    await (0, mailer_1.sendEmail)({
        to: input.email.toLowerCase(),
        subject: `Your verification code — ${input.referenceCode}`,
        html: (0, mailer_1.otpEmailHtml)(otp, input.referenceCode),
        text: `Your OTP is ${otp}`,
    });
    return {
        sent: true,
        expiresInMinutes: env_1.env.OTP_EXPIRES_MINUTES,
        // Dev aid only — never in production responses
        ...(env_1.env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
    };
}
async function verifyOtp(input) {
    const token = await prisma_1.prisma.guestVerificationToken.findFirst({
        where: {
            referenceCode: input.referenceCode,
            verifiedAt: null,
        },
        orderBy: { createdAt: "desc" },
    });
    if (!token)
        throw new errors_1.UnauthorizedError("No pending verification found");
    if (token.otpExpiresAt < new Date()) {
        throw new errors_1.AppError("OTP_INVALID_OR_EXPIRED", "OTP expired", 401);
    }
    if (token.attemptCount >= env_1.env.OTP_MAX_ATTEMPTS) {
        throw new errors_1.RateLimitedError("Too many failed OTP attempts", "OTP_ATTEMPTS_EXCEEDED");
    }
    const valid = await bcryptjs_1.default.compare(input.otp, token.otpHash);
    if (!valid) {
        await prisma_1.prisma.guestVerificationToken.update({
            where: { id: token.id },
            data: { attemptCount: { increment: 1 } },
        });
        throw new errors_1.AppError("OTP_INVALID_OR_EXPIRED", "Invalid OTP", 401);
    }
    await prisma_1.prisma.guestVerificationToken.update({
        where: { id: token.id },
        data: { verifiedAt: new Date() },
    });
    const guestAccessToken = (0, guest_auth_1.signGuestToken)({
        sub: token.referenceCode,
        referenceType: token.referenceType,
        email: token.email,
    });
    return {
        guestAccessToken,
        referenceCode: token.referenceCode,
        referenceType: token.referenceType,
        expiresInMinutes: env_1.env.GUEST_TOKEN_EXPIRES_MINUTES,
    };
}
async function getGuestBooking(bookingCode) {
    return (0, bookings_service_1.getBookingByCode)(bookingCode);
}
//# sourceMappingURL=guest.service.js.map