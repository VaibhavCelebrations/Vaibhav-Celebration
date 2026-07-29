import { AdminRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { NotFoundError } from "../../lib/errors";
import { param } from "../../lib/params";
import { created, ok } from "../../lib/response";
import { requireAdmin, requireRoles } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { triggerRevalidate } from "../../integrations/revalidate/client";
import {
  getPageContent,
  isValidPageKey,
  listPageContent,
  upsertPageContent,
} from "./pages.service";

const roles = [
  requireAdmin,
  requireRoles(AdminRole.CONTENT_EDITOR, AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN),
];

const pageKeySchema = z.object({ pageKey: z.enum(["home", "about", "contact"]) });
const sectionsSchema = z.object({ sections: z.record(z.unknown()) });

const revalidatePaths: Record<string, string[]> = {
  home: ["/"],
  about: ["/about"],
  contact: ["/contact"],
};

const revalidateTags: Record<string, string[]> = {
  home: ["cms:pages:home"],
  about: ["cms:pages:about"],
  contact: ["cms:pages:contact"],
};

export const pagesRouter = Router();

pagesRouter.get("/:pageKey", validate(pageKeySchema, "params"), async (req, res, next) => {
  try {
    return ok(res, await getPageContent(param(req, "pageKey")));
  } catch (error) {
    return next(error);
  }
});

export const adminPagesRouter = Router();
adminPagesRouter.use(...roles);

adminPagesRouter.get("/", async (_req, res, next) => {
  try {
    const items = await listPageContent();
    return ok(res, { items, total: items.length, page: 1, pageSize: items.length || 3 });
  } catch (error) {
    return next(error);
  }
});

adminPagesRouter.get("/:pageKey", validate(pageKeySchema, "params"), async (req, res, next) => {
  try {
    const pageKey = param(req, "pageKey");
    if (!isValidPageKey(pageKey)) throw new NotFoundError("Page not found");
    return ok(res, await getPageContent(pageKey));
  } catch (error) {
    return next(error);
  }
});

adminPagesRouter.put(
  "/:pageKey",
  validate(pageKeySchema, "params"),
  validate(sectionsSchema),
  async (req, res, next) => {
    try {
      const pageKey = param(req, "pageKey");
      const item = await upsertPageContent(pageKey, req.body.sections);
      void triggerRevalidate(
        revalidatePaths[pageKey] ?? ["/"],
        revalidateTags[pageKey] ?? [],
      );
      return ok(res, item);
    } catch (error) {
      return next(error);
    }
  },
);

adminPagesRouter.post(
  "/",
  validate(pageKeySchema.extend({ sections: z.record(z.unknown()) })),
  async (req, res, next) => {
    try {
      const { pageKey, sections } = req.body;
      const item = await upsertPageContent(pageKey, sections);
      void triggerRevalidate(
        revalidatePaths[pageKey] ?? ["/"],
        revalidateTags[pageKey] ?? [],
      );
      return created(res, item);
    } catch (error) {
      return next(error);
    }
  },
);
