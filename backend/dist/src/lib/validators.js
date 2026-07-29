"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingCodeParamSchema = exports.slugParamSchema = exports.idParamSchema = exports.paginationQuerySchema = void 0;
exports.slugify = slugify;
exports.toDateOnly = toDateOnly;
exports.dateKey = dateKey;
const zod_1 = require("zod");
exports.paginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional(),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
exports.idParamSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
});
exports.slugParamSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1),
});
exports.bookingCodeParamSchema = zod_1.z.object({
    bookingCode: zod_1.z.string().min(1),
});
function slugify(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}
/** Start-of-day UTC date for Postgres @db.Date comparisons */
function toDateOnly(input) {
    const d = typeof input === "string" ? new Date(input) : new Date(input);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function dateKey(d) {
    return d.toISOString().slice(0, 10);
}
//# sourceMappingURL=validators.js.map