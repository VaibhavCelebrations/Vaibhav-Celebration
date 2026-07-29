"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireGuest = requireGuest;
exports.requireGuestScope = requireGuestScope;
exports.signGuestToken = signGuestToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
function requireGuest(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return next(new errors_1.UnauthorizedError());
    }
    try {
        const payload = jsonwebtoken_1.default.verify(header.slice(7), env_1.env.JWT_ACCESS_SECRET);
        if (payload.type !== "guest") {
            return next(new errors_1.UnauthorizedError("Invalid token type"));
        }
        req.guest = payload;
        return next();
    }
    catch {
        return next(new errors_1.UnauthorizedError("Invalid or expired guest token"));
    }
}
/** Ensure guest token is scoped to the path param reference code */
function requireGuestScope(paramName) {
    return (req, _res, next) => {
        if (!req.guest)
            return next(new errors_1.UnauthorizedError());
        const code = req.params[paramName];
        if (!code || req.guest.sub !== code) {
            return next(new errors_1.ForbiddenError("Token is not scoped to this resource"));
        }
        return next();
    };
}
function signGuestToken(payload) {
    return jsonwebtoken_1.default.sign({ ...payload, type: "guest" }, env_1.env.JWT_ACCESS_SECRET, {
        expiresIn: `${env_1.env.GUEST_TOKEN_EXPIRES_MINUTES}m`,
    });
}
//# sourceMappingURL=guest-auth.js.map