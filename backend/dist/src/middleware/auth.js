"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
exports.requireRoles = requireRoles;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const errors_1 = require("../lib/errors");
function requireAdmin(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return next(new errors_1.UnauthorizedError());
    }
    const token = header.slice("Bearer ".length);
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
        if (payload.type !== "access") {
            return next(new errors_1.UnauthorizedError("Invalid token type"));
        }
        req.admin = payload;
        return next();
    }
    catch {
        return next(new errors_1.UnauthorizedError("Invalid or expired token"));
    }
}
function requireRoles(...roles) {
    return (req, _res, next) => {
        if (!req.admin) {
            return next(new errors_1.UnauthorizedError());
        }
        if (!roles.includes(req.admin.role)) {
            return next(new errors_1.ForbiddenError());
        }
        return next();
    };
}
//# sourceMappingURL=auth.js.map