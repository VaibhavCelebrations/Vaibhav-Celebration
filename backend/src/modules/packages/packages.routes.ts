import { param } from "../../lib/params";
import { AdminRole, SampleAssetType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { clientIp, writeAuditLog } from "../../lib/audit";
import { created, ok } from "../../lib/response";
import { requireAdmin, requireRoles, type AuthenticatedRequest } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { triggerRevalidate } from "../../integrations/revalidate/client";
import { comparePackages, createPackage, deletePackage, getPackageBySlug, listPackages, replaceFeatures, updatePackage, upsertCustomizationOptions } from "./packages.service";

const roles = [requireAdmin, requireRoles(AdminRole.CONTENT_EDITOR, AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN)];
const id = z.object({ id: z.string().min(1) });
const packageSchema = z.object({ title: z.string().min(1), slug: z.string().min(1), priceInPaise: z.number().int().min(0), tierRank: z.number().int(), isRecommended: z.boolean().optional(), isActive: z.boolean().optional(), isCustomizable: z.boolean().optional(), displayOrder: z.number().int().optional(), description: z.string().optional().nullable() });
const featureSchema = z.object({ label: z.string().min(1), quantity: z.number().int().min(0), unit: z.string().optional(), sampleAssetType: z.nativeEnum(SampleAssetType).optional(), displayOrder: z.number().int().optional() });
const optionSchema = z.object({ id: z.string().optional(), label: z.string().min(1), extraPriceInPaise: z.number().int().min(0), minQuantity: z.number().int().min(0).optional(), maxQuantity: z.number().int().min(0).optional().nullable(), isActive: z.boolean().optional(), displayOrder: z.number().int().optional() });
async function audit(req: AuthenticatedRequest, action: string, entityId: string, metadata?: unknown) { await writeAuditLog({ adminUserId: req.admin!.sub, action, entityType: "Package", entityId, metadata, ipAddress: clientIp(req) }); }

export const packagesRouter = Router();
packagesRouter.get("/", async (_req, res, next) => { try { return ok(res, await listPackages()); } catch (err) { return next(err); } });
packagesRouter.get("/compare", validate(z.object({ ids: z.string().min(1) }), "query"), async (req, res, next) => {
  try {
    const { ids } = req.query as unknown as { ids: string };
    return ok(res, await comparePackages(ids.split(",").map((s) => s.trim()).filter(Boolean)));
  } catch (err) {
    return next(err);
  }
});
packagesRouter.get("/:slug", validate(z.object({ slug: z.string().min(1) }), "params"), async (req, res, next) => { try { return ok(res, await getPackageBySlug(param(req, "slug"))); } catch (err) { return next(err); } });

export const adminPackagesRouter = Router();
adminPackagesRouter.use(...roles);
adminPackagesRouter.post("/", validate(packageSchema), async (req, res, next) => { try { const item = await createPackage(req.body); await audit(req as AuthenticatedRequest, "CREATE", item.id); void triggerRevalidate(["/packages", `/packages/${item.slug}`]); return created(res, item); } catch (err) { return next(err); } });
adminPackagesRouter.post("/:id/features", validate(id, "params"), validate(z.object({ features: z.array(featureSchema).min(1) })), async (req, res, next) => { try { await replaceFeatures(param(req, "id"), req.body.features); await audit(req as AuthenticatedRequest, "REPLACE_FEATURES", param(req, "id")); void triggerRevalidate(["/packages"]); return ok(res, { updated: true }); } catch (err) { return next(err); } });
adminPackagesRouter.post("/:id/customization-options", validate(id, "params"), validate(z.object({ options: z.array(optionSchema).min(1) })), async (req, res, next) => { try { const items = await upsertCustomizationOptions(param(req, "id"), req.body.options); await audit(req as AuthenticatedRequest, "UPSERT_CUSTOMIZATION_OPTIONS", param(req, "id")); void triggerRevalidate(["/packages"]); return ok(res, items); } catch (err) { return next(err); } });
adminPackagesRouter.put("/:id", validate(id, "params"), validate(packageSchema.partial()), async (req, res, next) => { try { const item = await updatePackage(param(req, "id"), req.body); await audit(req as AuthenticatedRequest, "UPDATE", item.id); void triggerRevalidate(["/packages", `/packages/${item.slug}`]); return ok(res, item); } catch (err) { return next(err); } });
adminPackagesRouter.delete("/:id", validate(id, "params"), async (req, res, next) => { try { await deletePackage(param(req, "id")); await audit(req as AuthenticatedRequest, "DELETE", param(req, "id")); void triggerRevalidate(["/packages"]); return ok(res, { deleted: true }); } catch (err) { return next(err); } });
