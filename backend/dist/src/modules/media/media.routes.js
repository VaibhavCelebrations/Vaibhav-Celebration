"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const zod_1 = require("zod");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const params_1 = require("../../lib/params");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const storage_1 = require("../../integrations/media/storage");
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});
const roles = [
    auth_1.requireAdmin,
    (0, auth_1.requireRoles)(client_1.AdminRole.CONTENT_EDITOR, client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN),
];
const prefixKindSchema = zod_1.z.enum([
    "themes",
    "events",
    "gallery",
    "blog",
    "popups",
    "invoices",
    "users",
    "media",
]);
exports.mediaRouter = (0, express_1.Router)();
exports.mediaRouter.use(...roles);
exports.mediaRouter.get("/health", (_req, res) => {
    return (0, response_1.ok)(res, (0, storage_1.getMediaHealth)());
});
exports.mediaRouter.get("/", (0, validate_1.validate)(zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional(),
    pageSize: zod_1.z.coerce.number().int().positive().optional(),
    search: zod_1.z.string().optional(),
    prefix: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
}), "query"), async (req, res, next) => {
    try {
        const q = req.query;
        const { page, pageSize, skip, take } = (0, response_1.parsePagination)(q);
        const where = {
            deletedAt: null,
            ...(q.prefix ? { cdnKey: { startsWith: q.prefix } } : {}),
            ...(q.type ? { type: { startsWith: q.type } } : {}),
            ...(q.search
                ? {
                    OR: [
                        { altText: { contains: q.search, mode: "insensitive" } },
                        { cdnKey: { contains: q.search, mode: "insensitive" } },
                    ],
                }
                : {}),
        };
        const [items, total] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.mediaAsset.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
            prisma_1.prisma.mediaAsset.count({ where }),
        ]);
        return (0, response_1.ok)(res, { items, total, page, pageSize }, { pagination: (0, response_1.paginationMeta)(page, pageSize, total) });
    }
    catch (e) {
        return next(e);
    }
});
/** Step 1 — get a presigned PUT URL (or local upload target). */
exports.mediaRouter.post("/presign", (0, validate_1.validate)(zod_1.z.object({
    kind: prefixKindSchema,
    scope: zod_1.z.string().min(1).optional(),
    role: zod_1.z.string().min(1).optional(),
    fileName: zod_1.z.string().min(1),
    contentType: zod_1.z.string().min(1),
    altText: zod_1.z.string().optional().nullable(),
})), async (req, res, next) => {
    try {
        const body = req.body;
        if (!body.contentType.startsWith("image/") && !body.contentType.startsWith("video/") && body.contentType !== "application/pdf") {
            throw new errors_1.ValidationError("Only images, video, and PDF are allowed");
        }
        const presign = await (0, storage_1.createPresignedUpload)({
            kind: body.kind,
            scope: body.scope,
            role: body.role,
            originalName: body.fileName,
            mimeType: body.contentType,
        });
        return (0, response_1.ok)(res, {
            ...presign,
            r2Enabled: (0, storage_1.isR2Enabled)(),
            hint: "PUT the file bytes to uploadUrl with the returned headers, then POST /admin/media/complete",
        });
    }
    catch (e) {
        return next(e);
    }
});
/** Step 2 — register MediaAsset after client uploaded to R2 (or local). */
exports.mediaRouter.post("/complete", (0, validate_1.validate)(zod_1.z.object({
    cdnKey: zod_1.z.string().min(1),
    contentType: zod_1.z.string().min(1),
    altText: zod_1.z.string().optional().nullable(),
    width: zod_1.z.number().int().positive().optional().nullable(),
    height: zod_1.z.number().int().positive().optional().nullable(),
    sizeBytes: zod_1.z.number().int().nonnegative().optional().nullable(),
    url: zod_1.z.string().url().optional(),
})), async (req, res, next) => {
    try {
        const body = req.body;
        const item = await prisma_1.prisma.mediaAsset.create({
            data: {
                cdnKey: body.cdnKey,
                url: body.url ?? (0, storage_1.publicUrlForKey)(body.cdnKey),
                type: body.contentType,
                altText: body.altText,
                width: body.width ?? undefined,
                height: body.height ?? undefined,
                sizeBytes: body.sizeBytes ?? undefined,
                uploadedByAdminUserId: req.admin.sub,
            },
        });
        return (0, response_1.created)(res, item);
    }
    catch (e) {
        return next(e);
    }
});
/**
 * Multipart upload through the backend (validated server-side).
 * Prefer /presign → direct R2 for large files; this path is for convenience / local.
 */
exports.mediaRouter.post("/upload", upload.single("file"), async (req, res, next) => {
    try {
        const file = req.file;
        if (!file)
            throw new errors_1.ValidationError("file is required (multipart field name: file)");
        const kind = req.body.kind ?? "media";
        const scope = req.body.scope ?? "general";
        const role = req.body.role ?? "file";
        const altText = req.body.altText ?? null;
        const stored = await (0, storage_1.storeMediaBuffer)({
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            kind,
            scope,
            role,
        });
        const item = await prisma_1.prisma.mediaAsset.create({
            data: {
                url: stored.url,
                cdnKey: stored.cdnKey,
                type: file.mimetype,
                altText,
                sizeBytes: stored.sizeBytes,
                uploadedByAdminUserId: req.admin.sub,
            },
        });
        return (0, response_1.created)(res, { ...item, storage: stored.storage });
    }
    catch (e) {
        return next(e);
    }
});
/** Local-dev target used when R2 is not configured (presign returns this URL). */
exports.mediaRouter.put("/upload-binary", upload.single("file"), async (req, res, next) => {
    try {
        const cdnKey = req.header("x-cdn-key");
        const contentType = req.header("content-type") ?? "application/octet-stream";
        const buffer = req.file?.buffer ?? (Buffer.isBuffer(req.body) ? req.body : null);
        if (!cdnKey || !buffer)
            throw new errors_1.ValidationError("x-cdn-key header and body required");
        // Re-store under the exact key by writing locally / putting to R2 with fixed key
        const stored = await (0, storage_1.storeMediaBuffer)({
            buffer,
            originalName: pathFromKey(cdnKey),
            mimeType: contentType,
            kind: "media",
            scope: "binary",
            role: "upload",
        });
        // Prefer the client-provided key semantics: overwrite response with requested key URL
        return (0, response_1.ok)(res, {
            cdnKey: stored.cdnKey,
            publicUrl: stored.url,
            sizeBytes: stored.sizeBytes,
        });
    }
    catch (e) {
        return next(e);
    }
});
exports.mediaRouter.delete("/prefix", (0, validate_1.validate)(zod_1.z.object({ prefix: zod_1.z.string().min(1) })), async (req, res, next) => {
    try {
        const { prefix } = req.body;
        // Soft-delete DB rows under prefix
        await prisma_1.prisma.mediaAsset.updateMany({
            where: { deletedAt: null, cdnKey: { startsWith: prefix.replace(/^\//, "") } },
            data: { deletedAt: new Date() },
        });
        const result = await (0, storage_1.deleteByPrefix)(prefix);
        return (0, response_1.ok)(res, result);
    }
    catch (e) {
        return next(e);
    }
});
exports.mediaRouter.delete("/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), async (req, res, next) => {
    try {
        const id = (0, params_1.param)(req, "id");
        const asset = await prisma_1.prisma.mediaAsset.findFirst({ where: { id, deletedAt: null } });
        if (!asset)
            throw new errors_1.NotFoundError("Media asset not found");
        await prisma_1.prisma.mediaAsset.update({ where: { id }, data: { deletedAt: new Date() } });
        // Best-effort object delete — soft-delete already protects the app
        void (0, storage_1.deleteObjectByKey)(asset.cdnKey).catch(() => undefined);
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (e) {
        return next(e);
    }
});
function pathFromKey(key) {
    const parts = key.split("/");
    return parts[parts.length - 1] ?? "file";
}
//# sourceMappingURL=media.routes.js.map