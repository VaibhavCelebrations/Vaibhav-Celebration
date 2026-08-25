"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestOtp = requestOtp;
exports.verifyOtp = verifyOtp;
exports.getGuestOrder = getGuestOrder;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const prisma_1 = require("../../db/prisma");
const env_1 = require("../../config/env");
const errors_1 = require("../../lib/errors");
const mailer_1 = require("../../integrations/email/mailer");
const guest_auth_1 = require("../../middleware/guest-auth");
const orders_service_1 = require("../orders/orders.service");
function generateOtp() {
    return String((0, crypto_1.randomInt)(100000, 999999));
}
async function resolveReference(referenceCode, referenceType, email) {
    const normalized = email.toLowerCase();
    if (referenceType === "ORDER") {
        const order = await prisma_1.prisma.order.findFirst({
            where: { orderCode: referenceCode },
            include: { user: true },
        });
        if (!order)
            throw new errors_1.NotFoundError("Order not found");
        if (order.contactEmail.toLowerCase() !== normalized && order.user.email.toLowerCase() !== normalized) {
            throw new errors_1.UnauthorizedError("Email does not match this order");
        }
        return { email: order.contactEmail };
    }
    if (referenceType === "REGISTRY") {
        const registry = await prisma_1.prisma.giftRegistry.findFirst({
            where: { registryCode: referenceCode },
            include: { ownerUser: true },
        });
        if (!registry)
            throw new errors_1.NotFoundError("Registry not found");
        const ownerEmail = registry.contactEmail?.toLowerCase() ?? registry.ownerUser.email.toLowerCase();
        if (ownerEmail !== normalized && registry.ownerUser.email.toLowerCase() !== normalized) {
            throw new errors_1.UnauthorizedError("Email does not match this registry");
        }
        return { email: ownerEmail };
    }
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
async function getGuestOrder(orderCode) {
    return (0, orders_service_1.getOrderByCode)(orderCode);
}
//# sourceMappingURL=guest.service.js.map