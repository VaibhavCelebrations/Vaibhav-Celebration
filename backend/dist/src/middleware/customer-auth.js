"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CUSTOMER_SESSION_COOKIE = exports.CUSTOMER_ACCESS_COOKIE = void 0;
exports.requireCustomer = requireCustomer;
exports.optionalCustomer = optionalCustomer;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
exports.CUSTOMER_ACCESS_COOKIE = "vbc_customer_access";
exports.CUSTOMER_SESSION_COOKIE = "vbc_customer_session";
/**
 * Verifies the httpOnly access-token cookie. Unlike the admin panel (Bearer
 * header + localStorage), the storefront never touches the token in JS —
 * every request just needs `credentials: "include"`. This eliminates XSS
 * token theft as an attack vector entirely for customer accounts.
 */
function requireCustomer(req, _res, next) {
    const token = req.cookies?.[exports.CUSTOMER_ACCESS_COOKIE];
    if (!token) {
        return next(new errors_1.UnauthorizedError("Please sign in to continue"));
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_CUSTOMER_ACCESS_SECRET);
        if (payload.type !== "customer_access") {
            return next(new errors_1.UnauthorizedError("Invalid token type"));
        }
        req.customer = payload;
        return next();
    }
    catch {
        return next(new errors_1.UnauthorizedError("Your session has expired. Please sign in again."));
    }
}
/** Best-effort — attaches req.customer if a valid cookie is present, never rejects. */
function optionalCustomer(req, _res, next) {
    const token = req.cookies?.[exports.CUSTOMER_ACCESS_COOKIE];
    if (!token)
        return next();
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_CUSTOMER_ACCESS_SECRET);
        if (payload.type === "customer_access") {
            req.customer = payload;
        }
    }
    catch {
        // ignore — anonymous
    }
    return next();
}
//# sourceMappingURL=customer-auth.js.map