import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { ok } from "../../lib/response";
import { computeBuilderQuote, getBuilderOptions } from "./builder.service";

const optionsQuerySchema = z.object({
  theme: z.string().min(1),
  package: z.string().min(1),
});

/** Shared with checkout so the cart re-validates exactly what the builder produced. */
export const builderSelectionsSchema = z.object({
  choices: z.record(z.string(), z.array(z.string().min(1)).max(3)).optional(),
  welcomeItem: z.string().min(1).optional().nullable(),
  activity1: z.string().min(1).optional().nullable(),
  activity2: z.string().min(1).optional().nullable(),
  returnGift: z.string().min(1).optional().nullable(),
  familyActivity: z.string().min(1).optional().nullable(),
  decor: z.boolean().optional().default(false),
  personalization: z.record(z.string(), z.boolean()).optional(),
  giftRegistryCustomize: z.boolean().optional().default(false),
});

const quoteSchema = z.object({
  packageSlug: z.string().min(1),
  themeSlug: z.string().min(1),
  guestCount: z.number().int().min(5).max(200),
  location: z.enum(["jaipur", "outside"]),
  selections: builderSelectionsSchema,
});

export const builderRouter = Router();

/** One request for the whole Customize step: product-choice services + their products for the theme. */
builderRouter.get("/options", validate(optionsQuerySchema, "query"), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof optionsQuerySchema>;
    res.setHeader("Cache-Control", "public, max-age=15");
    return ok(res, await getBuilderOptions(q));
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
