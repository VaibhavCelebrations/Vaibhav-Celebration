import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { ok } from "../../lib/response";
import { getAvailabilityForDate, getAvailabilityRange } from "./availability.service";

const dateQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const rangeQuery = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const availabilityRouter = Router();

availabilityRouter.get("/", validate(dateQuery, "query"), async (req, res, next) => {
  try {
    const { date } = req.query as unknown as z.infer<typeof dateQuery>;
    return ok(res, await getAvailabilityForDate(date));
  } catch (err) {
    return next(err);
  }
});

availabilityRouter.get("/range", validate(rangeQuery, "query"), async (req, res, next) => {
  try {
    const { from, to } = req.query as unknown as z.infer<typeof rangeQuery>;
    return ok(res, await getAvailabilityRange(from, to));
  } catch (err) {
    return next(err);
  }
});
