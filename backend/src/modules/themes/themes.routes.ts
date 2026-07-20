import { param } from "../../lib/params";
import { AdminRole, SampleAssetType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { clientIp, writeAuditLog } from "../../lib/audit";
import { created, ok } from "../../lib/response";
import { requireAdmin, requireRoles, type AuthenticatedRequest } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { triggerRevalidate } from "../../integrations/revalidate/client";
import { addSampleAsset, createTheme, deleteTheme, getThemeBySlug, listThemes, reorderThemes, updateTheme } from "./themes.service";

const roleGuard = [requireAdmin, requireRoles(AdminRole.CONTENT_EDITOR, AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN)];
const idSchema = z.object({ id: z.string().min(1) });
const themeSchema = z.object({
  title: z.string().min(1), slug: z.string().min(1), shortDescription: z.string().min(1),
  storyDescription: z.string().optional().nullable(), audienceNote: z.string().optional().nullable(),
  heroImageId: z.string().optional().nullable(), isActive: z.boolean().optional(), displayOrder: z.number().int().optional(),
  seoTitle: z.string().optional().nullable(), seoDescription: z.string().optional().nullable(), ogImageId: z.string().optional().nullable(),
});
const updateSchema = themeSchema.partial();

async function audit(req: AuthenticatedRequest, action: string, id: string, metadata?: unknown) {
  await writeAuditLog({ adminUserId: req.admin!.sub, action, entityType: "Theme", entityId: id, metadata, ipAddress: clientIp(req) });
}

export const themesRouter = Router();
themesRouter.get("/", validate(z.object({ search: z.string().optional(), tag: z.string().optional() }), "query"), async (req, res, next) => {
  try { return ok(res, await listThemes(req.query.search as string | undefined, req.query.tag as string | undefined)); } catch (err) { return next(err); }
});
themesRouter.get("/:slug", validate(z.object({ slug: z.string().min(1) }), "params"), async (req, res, next) => {
  try { return ok(res, await getThemeBySlug(param(req, "slug"))); } catch (err) { return next(err); }
});

export const adminThemesRouter = Router();
adminThemesRouter.use(...roleGuard);
adminThemesRouter.post("/", validate(themeSchema), async (req, res, next) => {
  try { const item = await createTheme(req.body); await audit(req as AuthenticatedRequest, "CREATE", item.id); void triggerRevalidate(["/themes", `/themes/${item.slug}`]); return created(res, item); } catch (err) { return next(err); }
});
adminThemesRouter.put("/reorder", validate(z.object({ items: z.array(z.object({ id: z.string().min(1), displayOrder: z.number().int() })).min(1) })), async (req, res, next) => {
  try { await reorderThemes(req.body.items); await audit(req as AuthenticatedRequest, "REORDER", "bulk", req.body); void triggerRevalidate(["/themes"]); return ok(res, { reordered: true }); } catch (err) { return next(err); }
});
adminThemesRouter.post("/:id/sample-assets", validate(idSchema, "params"), validate(z.object({ type: z.nativeEnum(SampleAssetType), title: z.string().min(1), mediaId: z.string().min(1), description: z.string().optional(), displayOrder: z.number().int().optional() })), async (req, res, next) => {
  try { const item = await addSampleAsset(param(req, "id"), req.body); await audit(req as AuthenticatedRequest, "ADD_SAMPLE_ASSET", param(req, "id"), { assetId: item.id }); void triggerRevalidate(["/themes"]); return created(res, item); } catch (err) { return next(err); }
});
adminThemesRouter.put("/:id", validate(idSchema, "params"), validate(updateSchema), async (req, res, next) => {
  try { const item = await updateTheme(param(req, "id"), req.body); await audit(req as AuthenticatedRequest, "UPDATE", item.id, req.body); void triggerRevalidate(["/themes", `/themes/${item.slug}`]); return ok(res, item); } catch (err) { return next(err); }
});
adminThemesRouter.delete("/:id", validate(idSchema, "params"), async (req, res, next) => {
  try { await deleteTheme(param(req, "id")); await audit(req as AuthenticatedRequest, "DELETE", param(req, "id")); void triggerRevalidate(["/themes"]); return ok(res, { deleted: true }); } catch (err) { return next(err); }
});
