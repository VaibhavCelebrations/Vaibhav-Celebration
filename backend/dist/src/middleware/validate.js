"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
/**
 * Zod validation middleware.
 * Express 5 exposes `query`/`params` as getters — we redefine them after parse
 * so route handlers still read `req.query` / `req.params` as typed data.
 */
function validate(schema, part = "body") {
    return (req, _res, next) => {
        const result = schema.safeParse(req[part]);
        if (!result.success) {
            return next(result.error);
        }
        if (part === "body") {
            req.body = result.data;
        }
        else {
            Object.defineProperty(req, part, {
                value: result.data,
                writable: true,
                configurable: true,
                enumerable: true,
            });
        }
        return next();
    };
}
//# sourceMappingURL=validate.js.map