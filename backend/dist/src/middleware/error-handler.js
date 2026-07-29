"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const errors_1 = require("../lib/errors");
const logger_1 = require("../lib/logger");
function errorHandler(err, _req, res, _next) {
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid request data",
                details: err.flatten(),
            },
        });
    }
    if (err instanceof errors_1.AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: err.details,
            },
        });
    }
    // express-rate-limit sends a plain object (not an Error instance) when the
    // limit is exceeded. Normalise it into our standard envelope so the admin
    // UI always receives a consistent shape.
    if (typeof err === "object" &&
        err !== null &&
        "status" in err &&
        err.status === 429) {
        const rateLimitErr = err;
        const body = typeof rateLimitErr.message === "object"
            ? rateLimitErr.message
            : undefined;
        return res.status(429).json({
            success: false,
            error: {
                code: body?.error?.code ?? "RATE_LIMITED",
                message: body?.error?.message ??
                    (typeof rateLimitErr.message === "string" ? rateLimitErr.message : "Too many requests"),
            },
        });
    }
    logger_1.logger.error({ err }, "Unhandled error");
    return res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_ERROR",
            message: "An unexpected error occurred",
        },
    });
}
//# sourceMappingURL=error-handler.js.map