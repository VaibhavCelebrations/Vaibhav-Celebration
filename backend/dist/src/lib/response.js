"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.created = created;
exports.paginationMeta = paginationMeta;
exports.parsePagination = parsePagination;
function ok(res, data, meta, status = 200) {
    return res.status(status).json({
        success: true,
        data,
        ...(meta ? { meta } : {}),
    });
}
function created(res, data, meta) {
    return ok(res, data, meta, 201);
}
function paginationMeta(page, pageSize, total) {
    return {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
}
function parsePagination(query, maxPageSize = 100) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(maxPageSize, Math.max(1, query.pageSize ?? 20));
    return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
//# sourceMappingURL=response.js.map