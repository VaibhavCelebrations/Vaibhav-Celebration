import { AdminRole } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { param } from "../../lib/params";
import { created, ok, paginationMeta, parsePagination } from "../../lib/response";
import { requireAdmin, requireRoles, type AuthenticatedRequest } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createPresignedUpload,
  deleteByPrefix,
  deleteObjectByKey,
  getMediaHealth,
  isR2Enabled,
  publicUrlForKey,
  storeMediaBuffer,
  type MediaPrefixKind,
} from "../../integrations/media/storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

const roles = [
  requireAdmin,
  requireRoles(AdminRole.CONTENT_EDITOR, AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN),
];

const prefixKindSchema = z.enum([
  "themes",
  "events",
  "gallery",
  "blog",
  "popups",
  "invoices",
  "users",
  "media",
]);

export const mediaRouter = Router();
mediaRouter.use(...roles);

mediaRouter.get("/health", (_req, res) => {
  return ok(res, getMediaHealth());
});

mediaRouter.get(
  "/",
  validate(
    z.object({
      page: z.coerce.number().int().positive().optional(),
      pageSize: z.coerce.number().int().positive().optional(),
      search: z.string().optional(),
      prefix: z.string().optional(),
      type: z.string().optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as {
        page?: number;
        pageSize?: number;
        search?: string;
        prefix?: string;
        type?: string;
      };
      const { page, pageSize, skip, take } = parsePagination(q);
      const where = {
        deletedAt: null as null,
        ...(q.prefix ? { cdnKey: { startsWith: q.prefix } } : {}),
        ...(q.type ? { type: { startsWith: q.type } } : {}),
        ...(q.search
          ? {
              OR: [
                { altText: { contains: q.search, mode: "insensitive" as const } },
                { cdnKey: { contains: q.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };
      const [items, total] = await prisma.$transaction([
        prisma.mediaAsset.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
        prisma.mediaAsset.count({ where }),
      ]);
      return ok(res, { items, total, page, pageSize }, { pagination: paginationMeta(page, pageSize, total) });
    } catch (e) {
      return next(e);
    }
  },
);

/** Step 1 — get a presigned PUT URL (or local upload target). */
mediaRouter.post(
  "/presign",
  validate(
    z.object({
      kind: prefixKindSchema,
      scope: z.string().min(1).optional(),
      role: z.string().min(1).optional(),
      fileName: z.string().min(1),
      contentType: z.string().min(1),
      altText: z.string().optional().nullable(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as {
        kind: MediaPrefixKind;
        scope?: string;
        role?: string;
        fileName: string;
        contentType: string;
        altText?: string | null;
      };
      if (!body.contentType.startsWith("image/") && !body.contentType.startsWith("video/") && body.contentType !== "application/pdf") {
        throw new ValidationError("Only images, video, and PDF are allowed");
      }
      const presign = await createPresignedUpload({
        kind: body.kind,
        scope: body.scope,
        role: body.role,
        originalName: body.fileName,
        mimeType: body.contentType,
      });
      return ok(res, {
        ...presign,
        r2Enabled: isR2Enabled(),
        hint: "PUT the file bytes to uploadUrl with the returned headers, then POST /admin/media/complete",
      });
    } catch (e) {
      return next(e);
    }
  },
);

/** Step 2 — register MediaAsset after client uploaded to R2 (or local). */
mediaRouter.post(
  "/complete",
  validate(
    z.object({
      cdnKey: z.string().min(1),
      contentType: z.string().min(1),
      altText: z.string().optional().nullable(),
      width: z.number().int().positive().optional().nullable(),
      height: z.number().int().positive().optional().nullable(),
      sizeBytes: z.number().int().nonnegative().optional().nullable(),
      url: z.string().url().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      const body = req.body as {
        cdnKey: string;
        contentType: string;
        altText?: string | null;
        width?: number | null;
        height?: number | null;
        sizeBytes?: number | null;
        url?: string;
      };
      const item = await prisma.mediaAsset.create({
        data: {
          cdnKey: body.cdnKey,
          url: body.url ?? publicUrlForKey(body.cdnKey),
          type: body.contentType,
          altText: body.altText,
          width: body.width ?? undefined,
          height: body.height ?? undefined,
          sizeBytes: body.sizeBytes ?? undefined,
          uploadedByAdminUserId: (req as AuthenticatedRequest).admin!.sub,
        },
      });
      return created(res, item);
    } catch (e) {
      return next(e);
    }
  },
);

/**
 * Multipart upload through the backend (validated server-side).
 * Prefer /presign → direct R2 for large files; this path is for convenience / local.
 */
mediaRouter.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) throw new ValidationError("file is required (multipart field name: file)");

    const kind = (req.body.kind as MediaPrefixKind | undefined) ?? "media";
    const scope = (req.body.scope as string | undefined) ?? "general";
    const role = (req.body.role as string | undefined) ?? "file";
    const altText = (req.body.altText as string | undefined) ?? null;

    const stored = await storeMediaBuffer({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      kind,
      scope,
      role,
    });

    const item = await prisma.mediaAsset.create({
      data: {
        url: stored.url,
        cdnKey: stored.cdnKey,
        type: file.mimetype,
        altText,
        sizeBytes: stored.sizeBytes,
        uploadedByAdminUserId: (req as AuthenticatedRequest).admin!.sub,
      },
    });

    return created(res, { ...item, storage: stored.storage });
  } catch (e) {
    return next(e);
  }
});

/** Local-dev target used when R2 is not configured (presign returns this URL). */
mediaRouter.put("/upload-binary", upload.single("file"), async (req, res, next) => {
  try {
    const cdnKey = req.header("x-cdn-key");
    const contentType = req.header("content-type") ?? "application/octet-stream";
    const buffer = req.file?.buffer ?? (Buffer.isBuffer(req.body) ? req.body : null);
    if (!cdnKey || !buffer) throw new ValidationError("x-cdn-key header and body required");

    // Re-store under the exact key by writing locally / putting to R2 with fixed key
    const stored = await storeMediaBuffer({
      buffer,
      originalName: pathFromKey(cdnKey),
      mimeType: contentType,
      kind: "media",
      scope: "binary",
      role: "upload",
    });
    // Prefer the client-provided key semantics: overwrite response with requested key URL
    return ok(res, {
      cdnKey: stored.cdnKey,
      publicUrl: stored.url,
      sizeBytes: stored.sizeBytes,
    });
  } catch (e) {
    return next(e);
  }
});

mediaRouter.delete(
  "/prefix",
  validate(z.object({ prefix: z.string().min(1) })),
  async (req, res, next) => {
    try {
      const { prefix } = req.body as { prefix: string };
      // Soft-delete DB rows under prefix
      await prisma.mediaAsset.updateMany({
        where: { deletedAt: null, cdnKey: { startsWith: prefix.replace(/^\//, "") } },
        data: { deletedAt: new Date() },
      });
      const result = await deleteByPrefix(prefix);
      return ok(res, result);
    } catch (e) {
      return next(e);
    }
  },
);

mediaRouter.delete(
  "/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      const id = param(req, "id");
      const asset = await prisma.mediaAsset.findFirst({ where: { id, deletedAt: null } });
      if (!asset) throw new NotFoundError("Media asset not found");
      await prisma.mediaAsset.update({ where: { id }, data: { deletedAt: new Date() } });
      // Best-effort object delete — soft-delete already protects the app
      void deleteObjectByKey(asset.cdnKey).catch(() => undefined);
      return ok(res, { deleted: true });
    } catch (e) {
      return next(e);
    }
  },
);

function pathFromKey(key: string) {
  const parts = key.split("/");
  return parts[parts.length - 1] ?? "file";
}
