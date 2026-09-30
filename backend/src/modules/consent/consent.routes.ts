import { Router } from "express";
import { z } from "zod";
import { ok } from "../../lib/response";
import { requireCustomer, type CustomerAuthenticatedRequest } from "../../middleware/customer-auth";
import { validate } from "../../middleware/validate";
import { getMarketingConsentForUser, setMarketingConsentForUser } from "./consent.service";

/** A signed-in customer reads and changes their own marketing choice (opt in, or withdraw). */
export const accountConsentRouter = Router();
accountConsentRouter.use(requireCustomer);

accountConsentRouter.get("/marketing", async (req, res, next) => {
  try {
    return ok(res, await getMarketingConsentForUser((req as CustomerAuthenticatedRequest).customer!.sub));
  } catch (err) {
    return next(err);
  }
});

accountConsentRouter.put("/marketing", validate(z.object({ granted: z.boolean() })), async (req, res, next) => {
  try {
    const userId = (req as CustomerAuthenticatedRequest).customer!.sub;
    return ok(res, await setMarketingConsentForUser(userId, req.body.granted, req));
  } catch (err) {
    return next(err);
  }
});
