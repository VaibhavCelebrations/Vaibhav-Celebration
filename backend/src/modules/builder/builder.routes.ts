import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { ok } from "../../lib/response";
import { computeBuilderQuote, listBuilderProducts } from "./builder.service";

const productsQuerySchema = z.object({
  theme: z.string().min(1),
  category: z.string().min(1),
  tier: z.enum(["standard", "premium", "luxe"]),
});

const quoteSchema = z.object({
  packageSlug: z.enum(["standard", "premium", "luxe"]),
  themeSlug: z.string().min(1),
  guestCount: z.number().int().min(5).max(200),
  location: z.enum(["jaipur", "outside"]),
  selections: z.object({
    welcomeItem: z.string().min(1).optional().nullable(),
    activity1: z.string().min(1).optional().nullable(),
    activity2: z.string().min(1).optional().nullable(),
    returnGift: z.string().min(1).optional().nullable(),
    familyActivity: z.string().min(1).optional().nullable(),
    decor: z.boolean().optional().default(false),
    personalization: z.record(z.string(), z.boolean()).optional(),
    giftRegistryCustomize: z.boolean().optional().default(false),
  }),
});

export const builderRouter = Router();

builderRouter.get("/products", validate(productsQuerySchema, "query"), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof productsQuerySchema>;
    return ok(res, await listBuilderProducts(q));
  } catch (err) {
    return next(err);
  }
});

builderRouter.post("/quote", validate(quoteSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof quoteSchema>;
    return ok(res, await computeBuilderQuote(body));
  } catch (err) {
    return next(err);
  }
});
