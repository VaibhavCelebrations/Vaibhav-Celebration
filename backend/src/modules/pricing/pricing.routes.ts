import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { ok } from "../../lib/response";
import { computeQuote } from "./pricing.service";

const quoteSchema = z.object({
  packageId: z.string().min(1),
  themeId: z.string().min(1).optional().nullable(),
  selectedOptions: z
    .array(
      z.object({
        optionId: z.string().min(1),
        quantity: z.number().int().min(0),
      }),
    )
    .default([]),
});

export const pricingRouter = Router();

pricingRouter.post("/quote", validate(quoteSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof quoteSchema>;
    const quote = await computeQuote(body);
    return ok(res, quote);
  } catch (err) {
    return next(err);
  }
});
