"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerAuthRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const env_1 = require("../../config/env");
const validate_1 = require("../../middleware/validate");
const customer_auth_1 = require("../../middleware/customer-auth");
const customer_auth_service_1 = require("./customer-auth.service");
/**
 * Password policy: min 8 chars with upper, lower, and digit — enterprise
 * baseline. Both access AND session tokens live in httpOnly cookies only;
 * nothing touches localStorage or JS-readable storage on the client.
 */
const passwordSchema = zod_1.z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number");
const signupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(6).max(20).optional(),
    password: passwordSchema,
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const SESSION_COOKIE_PATH = `${env_1.env.API_PREFIX}/customer/auth`;
function setAuthCookies(res, result) {
    res.cookie(customer_auth_1.CUSTOMER_ACCESS_COOKIE, result.accessToken, {
        httpOnly: true,
        secure: env_1.env.COOKIE_SECURE,
        sameSite: "lax",
        maxAge: 15 * 60 * 1000, // matches JWT_CUSTOMER_ACCESS_EXPIRES_IN default; refreshed silently
        path: "/",
    });
    res.cookie(customer_auth_1.CUSTOMER_SESSION_COOKIE, result.sessionToken, {
        httpOnly: true,
        secure: env_1.env.COOKIE_SECURE,
        sameSite: "lax",
        expires: result.sessionExpiresAt,
        path: SESSION_COOKIE_PATH,
    });
}
function clearAuthCookies(res) {
    res.clearCookie(customer_auth_1.CUSTOMER_ACCESS_COOKIE, { path: "/" });
    res.clearCookie(customer_auth_1.CUSTOMER_SESSION_COOKIE, { path: SESSION_COOKIE_PATH });
}
exports.customerAuthRouter = (0, express_1.Router)();
exports.customerAuthRouter.post("/signup", (0, validate_1.validate)(signupSchema), async (req, res, next) => {
    try {
        const result = await (0, customer_auth_service_1.signupCustomer)({
            ...req.body,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
        });
        setAuthCookies(res, result);
        return res.status(201).json({ success: true, data: { user: result.user } });
    }
    catch (err) {
        return next(err);
    }
});
exports.customerAuthRouter.post("/login", (0, validate_1.validate)(loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await (0, customer_auth_service_1.loginCustomer)({ email, password, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
        setAuthCookies(res, result);
        return res.json({ success: true, data: { user: result.user } });
    }
    catch (err) {
        return next(err);
    }
});
exports.customerAuthRouter.post("/refresh", async (req, res, next) => {
    try {
        const rawToken = req.cookies?.[customer_auth_1.CUSTOMER_SESSION_COOKIE];
        if (!rawToken) {
            return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } });
        }
        const result = await (0, customer_auth_service_1.refreshCustomerSession)(rawToken, req.ip, req.headers["user-agent"]);
        setAuthCookies(res, result);
        return res.json({ success: true, data: { user: result.user } });
    }
    catch (err) {
        clearAuthCookies(res);
        return next(err);
    }
});
exports.customerAuthRouter.post("/logout", async (req, res) => {
    const rawToken = req.cookies?.[customer_auth_1.CUSTOMER_SESSION_COOKIE];
    await (0, customer_auth_service_1.logoutCustomer)(rawToken);
    clearAuthCookies(res);
    return res.json({ success: true, data: { loggedOut: true } });
});
exports.customerAuthRouter.post("/logout-all", customer_auth_1.requireCustomer, async (req, res, next) => {
    try {
        await (0, customer_auth_service_1.logoutAllSessions)(req.customer.sub);
        clearAuthCookies(res);
        return res.json({ success: true, data: { loggedOut: true } });
    }
    catch (err) {
        return next(err);
    }
});
exports.customerAuthRouter.get("/me", customer_auth_1.requireCustomer, async (req, res, next) => {
    try {
        const customer = req.customer;
        return res.json({ success: true, data: await (0, customer_auth_service_1.getCustomerById)(customer.sub) });
    }
    catch (err) {
        return next(err);
    }
});
exports.customerAuthRouter.patch("/me", customer_auth_1.requireCustomer, (0, validate_1.validate)(zod_1.z.object({ name: zod_1.z.string().min(1).max(120).optional(), phone: zod_1.z.string().min(6).max(20).optional() })), async (req, res, next) => {
    try {
        const customer = req.customer;
        return res.json({ success: true, data: await (0, customer_auth_service_1.updateCustomerProfile)(customer.sub, req.body) });
    }
    catch (err) {
        return next(err);
    }
});
exports.customerAuthRouter.post("/password/change", customer_auth_1.requireCustomer, (0, validate_1.validate)(zod_1.z.object({ currentPassword: zod_1.z.string().min(1), newPassword: passwordSchema })), async (req, res, next) => {
    try {
        const customer = req.customer;
        await (0, customer_auth_service_1.changePassword)(customer.sub, req.body.currentPassword, req.body.newPassword);
        clearAuthCookies(res);
        return res.json({ success: true, data: { passwordChanged: true } });
    }
    catch (err) {
        return next(err);
    }
});
// ─── Password reset (nodemailer link, 10-minute validity) ───────────────────
exports.customerAuthRouter.post("/password/forgot", (0, validate_1.validate)(zod_1.z.object({ email: zod_1.z.string().email() })), async (req, res, next) => {
    try {
        await (0, customer_auth_service_1.requestPasswordReset)(req.body.email, req.ip);
        // Always the same response — do not reveal whether the email exists.
        return res.json({
            success: true,
            data: { message: "If an account exists for that email, a reset link has been sent." },
        });
    }
    catch (err) {
        return next(err);
    }
});
exports.customerAuthRouter.post("/password/reset", (0, validate_1.validate)(zod_1.z.object({ token: zod_1.z.string().min(1), newPassword: passwordSchema })), async (req, res, next) => {
    try {
        await (0, customer_auth_service_1.resetPassword)(req.body.token, req.body.newPassword);
        return res.json({ success: true, data: { passwordReset: true } });
    }
    catch (err) {
        return next(err);
    }
});
exports.customerAuthRouter.post("/email/verify", (0, validate_1.validate)(zod_1.z.object({ token: zod_1.z.string().min(1) })), async (req, res, next) => {
    try {
        await (0, customer_auth_service_1.verifyEmail)(req.body.token);
        return res.json({ success: true, data: { verified: true } });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=customer-auth.routes.js.map