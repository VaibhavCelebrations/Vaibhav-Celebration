"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRefreshCookieName = getRefreshCookieName;
exports.loginAdmin = loginAdmin;
exports.refreshAccessToken = refreshAccessToken;
exports.logoutAdmin = logoutAdmin;
exports.getAdminById = getAdminById;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../db/prisma");
const env_1 = require("../../config/env");
const errors_1 = require("../../lib/errors");
const REFRESH_COOKIE = "vbc_admin_refresh";
function getRefreshCookieName() {
    return REFRESH_COOKIE;
}
// ─── Token helpers ──────────────────────────────────────────────────────────
/**
 * One-way hash of a raw JWT for safe DB storage.
 * Raw tokens are NEVER stored — only this hex digest.
 */
function hashToken(rawToken) {
    return crypto_1.default.createHash("sha256").update(rawToken).digest("hex");
}
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_ACCESS_SECRET, {
        expiresIn: env_1.env.JWT_ACCESS_EXPIRES_IN,
    });
}
function issueRefreshJwt(adminId) {
    return jsonwebtoken_1.default.sign({ sub: adminId, type: "refresh", jti: crypto_1.default.randomUUID() }, env_1.env.JWT_REFRESH_SECRET, {
        expiresIn: env_1.env.JWT_REFRESH_EXPIRES_IN,
    });
}
/** Convert env string like "7d" / "24h" / "30m" to milliseconds. */
function parseDurationMs(str) {
    const m = /^(\d+)([smhd])$/.exec(str);
    if (!m)
        return 7 * 24 * 60 * 60 * 1000; // safe fallback: 7 days
    const n = parseInt(m[1], 10);
    switch (m[2]) {
        case "s": return n * 1_000;
        case "m": return n * 60_000;
        case "h": return n * 3_600_000;
        case "d": return n * 86_400_000;
        default: return 7 * 86_400_000;
    }
}
function refreshTokenExpiry() {
    return new Date(Date.now() + parseDurationMs(env_1.env.JWT_REFRESH_EXPIRES_IN));
}
// ─── Auth operations ─────────────────────────────────────────────────────────
async function loginAdmin(email, password, ipAddress, userAgent) {
    const admin = await prisma_1.prisma.adminUser.findFirst({
        where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
    });
    // Use constant-time comparison even when admin not found to prevent enumeration
    const hash = admin?.passwordHash ?? "$2b$10$invalidhashusedfortimingnormalization0000000000000000";
    const valid = await bcryptjs_1.default.compare(password, hash);
    if (!admin || !valid) {
        throw new errors_1.UnauthorizedError("Invalid email or password");
    }
    await prisma_1.prisma.adminUser.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
    });
    const accessToken = signAccessToken({
        sub: admin.id,
        email: admin.email,
        role: admin.role,
        type: "access",
    });
    const rawRefreshToken = issueRefreshJwt(admin.id);
    // Persist hash only — never the raw token
    await prisma_1.prisma.adminRefreshToken.create({
        data: {
            adminUserId: admin.id,
            tokenHash: hashToken(rawRefreshToken),
            familyId: crypto_1.default.randomUUID(),
            expiresAt: refreshTokenExpiry(),
            ipAddress: ipAddress ?? null,
            userAgent: userAgent ?? null,
        },
    });
    return {
        accessToken,
        refreshToken: rawRefreshToken,
        admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
        },
    };
}
/**
 * P2 — Refresh with rotation + reuse detection.
 *
 * Security model:
 *  1. Verify JWT signature → quick fail on forgery/expiry
 *  2. Look up by SHA-256 hash in DB
 *  3. If not found → unknown token → reject
 *  4. If revokedAt set → already revoked (logout or previous reuse event) → reject
 *  5. If usedAt set → token was already rotated; this is a REPLAY ATTACK
 *     → revoke entire token family immediately so ALL sessions from this
 *       login are invalidated, then reject
 *  6. Mark current token as used, issue + store new token in same family
 *  7. Return new refresh token to be set as a new HttpOnly cookie
 */
async function refreshAccessToken(rawRefreshToken, ipAddress, userAgent) {
    // Step 1 — JWT integrity check
    let jwtPayload;
    try {
        jwtPayload = jsonwebtoken_1.default.verify(rawRefreshToken, env_1.env.JWT_REFRESH_SECRET);
    }
    catch {
        throw new errors_1.UnauthorizedError("Invalid or expired refresh token");
    }
    if (jwtPayload.type !== "refresh") {
        throw new errors_1.UnauthorizedError("Invalid token type");
    }
    // Step 2 — DB lookup by hash
    const stored = await prisma_1.prisma.adminRefreshToken.findUnique({
        where: { tokenHash: hashToken(rawRefreshToken) },
    });
    if (!stored) {
        throw new errors_1.UnauthorizedError("Refresh token not recognised");
    }
    // Step 3 — Already revoked (logout or prior reuse event)
    if (stored.revokedAt !== null) {
        throw new errors_1.UnauthorizedError("Session has been revoked. Please log in again.");
    }
    // Step 4 — Token already rotated (concurrent refresh or replay)
    if (stored.usedAt !== null) {
        const msSinceUse = Date.now() - stored.usedAt.getTime();
        // Benign race: another request/tab rotated this token moments ago
        if (msSinceUse < 10_000) {
            throw new errors_1.UnauthorizedError("Session was just refreshed. Please retry your request.");
        }
        await prisma_1.prisma.adminRefreshToken.updateMany({
            where: { familyId: stored.familyId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
        throw new errors_1.UnauthorizedError("Session anomaly detected. All sessions have been revoked for your protection. Please log in again.");
    }
    // Step 5 — DB-level expiry check (belt-and-suspenders beyond JWT exp)
    if (stored.expiresAt < new Date()) {
        throw new errors_1.UnauthorizedError("Refresh token has expired");
    }
    // Step 6 — Verify admin is still active
    const admin = await prisma_1.prisma.adminUser.findFirst({
        where: { id: stored.adminUserId, deletedAt: null, isActive: true },
    });
    if (!admin) {
        throw new errors_1.UnauthorizedError("Admin account not found or deactivated");
    }
    // Step 7 — Rotate atomically: only one concurrent refresh can mark the token used
    const newRawRefreshToken = issueRefreshJwt(admin.id);
    const rotated = await prisma_1.prisma.adminRefreshToken.updateMany({
        where: { id: stored.id, usedAt: null, revokedAt: null },
        data: { usedAt: new Date() },
    });
    if (rotated.count === 0) {
        throw new errors_1.UnauthorizedError("Session was just refreshed. Please retry your request.");
    }
    await prisma_1.prisma.adminRefreshToken.create({
        data: {
            adminUserId: admin.id,
            tokenHash: hashToken(newRawRefreshToken),
            familyId: stored.familyId,
            expiresAt: refreshTokenExpiry(),
            ipAddress: ipAddress ?? null,
            userAgent: userAgent ?? null,
        },
    });
    const accessToken = signAccessToken({
        sub: admin.id,
        email: admin.email,
        role: admin.role,
        type: "access",
    });
    return {
        accessToken,
        newRefreshToken: newRawRefreshToken,
        admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
        },
    };
}
/**
 * Server-side logout: revoke the presented token AND the entire family so
 * concurrent sessions (e.g. other tabs that haven't refreshed yet) also expire.
 */
async function logoutAdmin(rawRefreshToken) {
    try {
        const stored = await prisma_1.prisma.adminRefreshToken.findUnique({
            where: { tokenHash: hashToken(rawRefreshToken) },
        });
        if (stored) {
            await prisma_1.prisma.adminRefreshToken.updateMany({
                where: { familyId: stored.familyId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
        }
    }
    catch {
        // Never throw on logout — client clears cookie regardless
    }
}
async function getAdminById(id) {
    const admin = await prisma_1.prisma.adminUser.findFirst({
        where: { id, deletedAt: null, isActive: true },
        select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
    });
    if (!admin)
        throw new errors_1.UnauthorizedError();
    return admin;
}
//# sourceMappingURL=auth.service.js.map