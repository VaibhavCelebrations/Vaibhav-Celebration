"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupCustomer = signupCustomer;
exports.loginCustomer = loginCustomer;
exports.refreshCustomerSession = refreshCustomerSession;
exports.logoutCustomer = logoutCustomer;
exports.logoutAllSessions = logoutAllSessions;
exports.getCustomerById = getCustomerById;
exports.requestPasswordReset = requestPasswordReset;
exports.resetPassword = resetPassword;
exports.issueEmailVerification = issueEmailVerification;
exports.verifyEmail = verifyEmail;
exports.updateCustomerProfile = updateCustomerProfile;
exports.changePassword = changePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const env_1 = require("../../config/env");
const errors_1 = require("../../lib/errors");
const mailer_1 = require("../../integrations/email/mailer");
const logger_1 = require("../../lib/logger");
const DAY_MS = 24 * 60 * 60 * 1000;
// ─── Token helpers ────────────────────────────────────────────────────────────
/** One-way hash for safe DB storage — raw tokens are never persisted. */
function hashToken(rawToken) {
    return crypto_1.default.createHash("sha256").update(rawToken).digest("hex");
}
function generateOpaqueToken() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
function signCustomerAccessToken(userId, email) {
    return jsonwebtoken_1.default.sign({ sub: userId, email, type: "customer_access" }, env_1.env.JWT_CUSTOMER_ACCESS_SECRET, {
        expiresIn: env_1.env.JWT_CUSTOMER_ACCESS_EXPIRES_IN,
    });
}
function slidingExpiry() {
    return new Date(Date.now() + env_1.env.CUSTOMER_SESSION_SLIDING_DAYS * DAY_MS);
}
function absoluteExpiry() {
    return new Date(Date.now() + env_1.env.CUSTOMER_SESSION_ABSOLUTE_DAYS * DAY_MS);
}
function toPublicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerifiedAt !== null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
}
// ─── Signup ───────────────────────────────────────────────────────────────────
async function signupCustomer(input) {
    const email = input.email.toLowerCase().trim();
    const existing = await prisma_1.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (existing) {
        throw new errors_1.ConflictError("EMAIL_TAKEN", "An account with this email already exists");
    }
    const passwordHash = await bcryptjs_1.default.hash(input.password, 12);
    const user = await prisma_1.prisma.user.create({
        data: {
            name: input.name.trim(),
            email,
            phone: input.phone?.trim(),
            passwordHash,
            lastLoginAt: new Date(),
        },
    });
    await prisma_1.prisma.cart.create({ data: { userId: user.id } });
    void (0, mailer_1.sendEmail)({
        to: user.email,
        subject: "Welcome to Vaibhav Celebrations",
        html: (0, mailer_1.welcomeEmailHtml)(user.name),
    }).catch(() => undefined);
    void issueEmailVerification(user.id, user.email, user.name).catch(() => undefined);
    const session = await createSession(user.id, input.ipAddress, input.userAgent);
    return {
        accessToken: signCustomerAccessToken(user.id, user.email),
        sessionToken: session.rawToken,
        sessionExpiresAt: session.expiresAt,
        user: toPublicUser(user),
    };
}
// ─── Login ────────────────────────────────────────────────────────────────────
async function loginCustomer(input) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma_1.prisma.user.findFirst({ where: { email, deletedAt: null } });
    // Constant-time comparison even when user not found — prevents enumeration.
    const hash = user?.passwordHash ?? "$2b$10$invalidhashusedfortimingnormalization0000000000000000";
    const valid = await bcryptjs_1.default.compare(input.password, hash);
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        throw new errors_1.UnauthorizedError(`Too many failed attempts. Try again in ${minutesLeft} minute(s).`);
    }
    if (!user || !valid) {
        if (user) {
            const failedCount = user.failedLoginCount + 1;
            const shouldLock = failedCount >= env_1.env.CUSTOMER_MAX_FAILED_LOGINS;
            await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    failedLoginCount: shouldLock ? 0 : failedCount,
                    lockedUntil: shouldLock ? new Date(Date.now() + env_1.env.CUSTOMER_LOCKOUT_MINUTES * 60_000) : null,
                },
            });
        }
        throw new errors_1.UnauthorizedError("Invalid email or password");
    }
    if (user.status !== client_1.UserStatus.ACTIVE) {
        throw new errors_1.UnauthorizedError("This account is disabled. Contact support for help.");
    }
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    });
    const session = await createSession(user.id, input.ipAddress, input.userAgent);
    return {
        accessToken: signCustomerAccessToken(user.id, user.email),
        sessionToken: session.rawToken,
        sessionExpiresAt: session.expiresAt,
        user: toPublicUser(user),
    };
}
async function createSession(userId, ipAddress, userAgent) {
    const rawToken = generateOpaqueToken();
    const expiresAt = slidingExpiry();
    await prisma_1.prisma.customerSession.create({
        data: {
            userId,
            tokenHash: hashToken(rawToken),
            familyId: crypto_1.default.randomUUID(),
            expiresAt,
            absoluteExpiresAt: absoluteExpiry(),
            ipAddress: ipAddress ?? null,
            userAgent: userAgent ?? null,
        },
    });
    return { rawToken, expiresAt };
}
// ─── Refresh (sliding + rotating, with reuse detection) ─────────────────────
//
// Mirrors the proven AdminRefreshToken algorithm (auth.service.ts) exactly:
// rotate on every use, detect replay of an already-used token, and revoke the
// whole family on suspected theft. The sliding `expiresAt` is pushed forward
// on every legitimate refresh — this is what makes "stay logged in until the
// cookie is removed" work — while `absoluteExpiresAt` is copied forward
// unchanged, forcing a full re-login after CUSTOMER_SESSION_ABSOLUTE_DAYS.
async function refreshCustomerSession(rawToken, ipAddress, userAgent) {
    const stored = await prisma_1.prisma.customerSession.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (!stored) {
        throw new errors_1.UnauthorizedError("Session not recognised. Please sign in again.");
    }
    if (stored.revokedAt !== null) {
        throw new errors_1.UnauthorizedError("Session has been revoked. Please sign in again.");
    }
    if (stored.usedAt !== null) {
        const msSinceUse = Date.now() - stored.usedAt.getTime();
        if (msSinceUse < 10_000) {
            throw new errors_1.UnauthorizedError("Session was just refreshed. Please retry.");
        }
        await prisma_1.prisma.customerSession.updateMany({
            where: { familyId: stored.familyId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        throw new errors_1.UnauthorizedError("Session anomaly detected. Please sign in again.");
    }
    if (stored.expiresAt < new Date() || stored.absoluteExpiresAt < new Date()) {
        throw new errors_1.UnauthorizedError("Session has expired. Please sign in again.");
    }
    const user = await prisma_1.prisma.user.findFirst({ where: { id: stored.userId, deletedAt: null } });
    if (!user || user.status !== client_1.UserStatus.ACTIVE) {
        throw new errors_1.UnauthorizedError("Account not found or disabled");
    }
    const newRawToken = generateOpaqueToken();
    const rotated = await prisma_1.prisma.customerSession.updateMany({
        where: { id: stored.id, usedAt: null, revokedAt: null },
        data: { usedAt: new Date() },
    });
    if (rotated.count === 0) {
        throw new errors_1.UnauthorizedError("Session was just refreshed. Please retry.");
    }
    await prisma_1.prisma.customerSession.create({
        data: {
            userId: user.id,
            tokenHash: hashToken(newRawToken),
            familyId: stored.familyId,
            expiresAt: slidingExpiry(),
            absoluteExpiresAt: stored.absoluteExpiresAt,
            ipAddress: ipAddress ?? null,
            userAgent: userAgent ?? null,
        },
    });
    return {
        accessToken: signCustomerAccessToken(user.id, user.email),
        sessionToken: newRawToken,
        sessionExpiresAt: slidingExpiry(),
        user: toPublicUser(user),
    };
}
async function logoutCustomer(rawToken) {
    if (!rawToken)
        return;
    try {
        const stored = await prisma_1.prisma.customerSession.findUnique({ where: { tokenHash: hashToken(rawToken) } });
        if (stored) {
            await prisma_1.prisma.customerSession.updateMany({
                where: { familyId: stored.familyId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
        }
    }
    catch {
        // never throw on logout
    }
}
async function logoutAllSessions(userId) {
    await prisma_1.prisma.customerSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}
async function getCustomerById(id) {
    const user = await prisma_1.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user)
        throw new errors_1.UnauthorizedError();
    return toPublicUser(user);
}
// ─── Password reset (nodemailer, 10-minute validity) ────────────────────────
async function requestPasswordReset(email, requestIp) {
    const normalized = email.toLowerCase().trim();
    const user = await prisma_1.prisma.user.findFirst({ where: { email: normalized, deletedAt: null } });
    // Always behave the same way whether or not the account exists — no enumeration.
    if (!user) {
        logger_1.logger.info({ email: normalized }, "Password reset requested for unknown email");
        return;
    }
    const rawToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + env_1.env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000);
    await prisma_1.prisma.passwordResetToken.create({
        data: {
            userId: user.id,
            tokenHash: hashToken(rawToken),
            expiresAt,
            requestIp: requestIp ?? null,
        },
    });
    const resetUrl = `${env_1.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    await (0, mailer_1.sendEmail)({
        to: user.email,
        subject: "Reset your Vaibhav Celebrations password",
        html: (0, mailer_1.passwordResetEmailHtml)(user.name, resetUrl, env_1.env.PASSWORD_RESET_TOKEN_TTL_MINUTES),
    });
}
async function resetPassword(rawToken, newPassword) {
    const stored = await prisma_1.prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (!stored || stored.usedAt !== null || stored.expiresAt < new Date()) {
        throw new errors_1.UnauthorizedError("This reset link is invalid or has expired. Please request a new one.");
    }
    const user = await prisma_1.prisma.user.findFirst({ where: { id: stored.userId, deletedAt: null } });
    if (!user)
        throw new errors_1.UnauthorizedError("Account not found");
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.update({ where: { id: user.id }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null } }),
        prisma_1.prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
        // Security-critical: force re-login everywhere after a password change.
        prisma_1.prisma.customerSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    void (0, mailer_1.sendEmail)({
        to: user.email,
        subject: "Your password was changed",
        html: (0, mailer_1.passwordChangedEmailHtml)(user.name),
    }).catch(() => undefined);
}
// ─── Email verification ──────────────────────────────────────────────────────
async function issueEmailVerification(userId, email, name) {
    const rawToken = generateOpaqueToken();
    const expiresAt = new Date(Date.now() + env_1.env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60_000);
    await prisma_1.prisma.emailVerificationToken.create({
        data: { userId, tokenHash: hashToken(rawToken), expiresAt },
    });
    const verifyUrl = `${env_1.env.FRONTEND_URL}/verify-email?token=${rawToken}`;
    await (0, mailer_1.sendEmail)({ to: email, subject: "Verify your email", html: (0, mailer_1.verifyEmailHtml)(name, verifyUrl) });
}
async function verifyEmail(rawToken) {
    const stored = await prisma_1.prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (!stored || stored.usedAt !== null || stored.expiresAt < new Date()) {
        throw new errors_1.AppError("VALIDATION_ERROR", "This verification link is invalid or has expired", 400);
    }
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.update({ where: { id: stored.userId }, data: { emailVerifiedAt: new Date() } }),
        prisma_1.prisma.emailVerificationToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    ]);
}
// ─── Profile ──────────────────────────────────────────────────────────────────
async function updateCustomerProfile(userId, data) {
    const user = await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { name: data.name?.trim(), phone: data.phone?.trim() },
    });
    return toPublicUser(user);
}
async function changePassword(userId, currentPassword, newPassword) {
    const user = await prisma_1.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user)
        throw new errors_1.UnauthorizedError();
    const valid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
    if (!valid)
        throw new errors_1.ValidationError("Current password is incorrect");
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
        prisma_1.prisma.customerSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    void (0, mailer_1.sendEmail)({ to: user.email, subject: "Your password was changed", html: (0, mailer_1.passwordChangedEmailHtml)(user.name) }).catch(() => undefined);
}
//# sourceMappingURL=customer-auth.service.js.map