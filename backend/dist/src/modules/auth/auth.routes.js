"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const env_1 = require("../../config/env");
const validate_1 = require("../../middleware/validate");
const auth_service_1 = require("./auth.service");
const auth_1 = require("../../middleware/auth");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
});
/**
 * P5 — Cookie path restriction.
 *
 * Narrowing the path from "/" to the auth prefix means the browser will ONLY
 * attach the refresh cookie to /api/v1/auth/* requests. Every other admin API
 * call (gallery, themes, bookings …) will NOT carry the cookie, dramatically
 * reducing the surface area where it could be logged or intercepted.
 */
const COOKIE_PATH = `${env_1.env.API_PREFIX}/auth`;
exports.authRouter = (0, express_1.Router)();
// ─── Login ────────────────────────────────────────────────────────────────────
exports.authRouter.post("/admin/login", (0, validate_1.validate)(loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await (0, auth_service_1.loginAdmin)(email, password, req.ip, req.headers["user-agent"]);
        res.cookie((0, auth_service_1.getRefreshCookieName)(), result.refreshToken, {
            httpOnly: true,
            secure: env_1.env.COOKIE_SECURE,
            sameSite: "strict", // upgraded from lax → strict for admin cookie
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: COOKIE_PATH, // P5: narrowed from "/" to auth prefix only
        });
        res.json({
            success: true,
            data: {
                accessToken: result.accessToken,
                admin: result.admin,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// ─── Refresh (with rotation) ──────────────────────────────────────────────────
exports.authRouter.post("/admin/refresh", async (req, res, next) => {
    try {
        const rawToken = req.cookies?.[(0, auth_service_1.getRefreshCookieName)()];
        if (!rawToken) {
            return res.status(401).json({
                success: false,
                error: { code: "UNAUTHORIZED", message: "Missing refresh token" },
            });
        }
        const result = await (0, auth_service_1.refreshAccessToken)(rawToken, req.ip, req.headers["user-agent"]);
        // P2 — Set the NEW rotated refresh token as a fresh HttpOnly cookie
        res.cookie((0, auth_service_1.getRefreshCookieName)(), result.newRefreshToken, {
            httpOnly: true,
            secure: env_1.env.COOKIE_SECURE,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: COOKIE_PATH,
        });
        res.json({
            success: true,
            data: {
                accessToken: result.accessToken,
                admin: result.admin,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
// ─── Logout ───────────────────────────────────────────────────────────────────
exports.authRouter.post("/admin/logout", async (req, res) => {
    const rawToken = req.cookies?.[(0, auth_service_1.getRefreshCookieName)()];
    // P2 — Server-side revocation of the entire token family
    if (rawToken) {
        await (0, auth_service_1.logoutAdmin)(rawToken);
    }
    res.clearCookie((0, auth_service_1.getRefreshCookieName)(), { path: COOKIE_PATH });
    res.json({ success: true, data: { loggedOut: true } });
});
// ─── Current user ─────────────────────────────────────────────────────────────
exports.authRouter.get("/admin/me", auth_1.requireAdmin, async (req, res, next) => {
    try {
        const authReq = req;
        const admin = await (0, auth_service_1.getAdminById)(authReq.admin.sub);
        res.json({ success: true, data: admin });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=auth.routes.js.map