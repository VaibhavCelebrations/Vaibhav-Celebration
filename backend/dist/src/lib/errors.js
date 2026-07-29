"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitedError = exports.ConflictError = exports.ValidationError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.AppError = void 0;
class AppError extends Error {
    code;
    statusCode;
    details;
    constructor(code, message, statusCode = 400, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = "AppError";
    }
}
exports.AppError = AppError;
class UnauthorizedError extends AppError {
    constructor(message = "Authentication required") {
        super("UNAUTHORIZED", message, 401);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = "Insufficient permissions") {
        super("FORBIDDEN", message, 403);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = "Resource not found") {
        super("NOT_FOUND", message, 404);
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends AppError {
    constructor(message = "Validation failed", details) {
        super("VALIDATION_ERROR", message, 400, details);
    }
}
exports.ValidationError = ValidationError;
class ConflictError extends AppError {
    constructor(code, message, details) {
        super(code, message, 409, details);
    }
}
exports.ConflictError = ConflictError;
class RateLimitedError extends AppError {
    constructor(message = "Too many requests", code = "RATE_LIMITED") {
        super(code, message, 429);
    }
}
exports.RateLimitedError = RateLimitedError;
//# sourceMappingURL=errors.js.map