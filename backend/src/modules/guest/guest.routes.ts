import { param } from "../../lib/params";
import { Router } from "express";
import { z } from "zod";
import { ok } from "../../lib/response";
import { requireGuest, requireGuestScope } from "../../middleware/guest-auth";
import { validate } from "../../middleware/validate";
import { getGuestOrder, requestOtp, verifyOtp } from "./guest.service";

export const guestRouter = Router();

guestRouter.post(
  "/lookup/request-otp",
  validate(
    z.object({
      referenceCode: z.string().min(1),
      referenceType: z.enum(["ORDER", "REGISTRY"]),
      email: z.string().email(),
    }),
  ),
  async (req, res, next) => {
    try {
      return ok(res, await requestOtp(req.body));
    } catch (err) {
      return next(err);
    }
  },
);

guestRouter.post(
  "/lookup/verify-otp",
  validate(
    z.object({
      referenceCode: z.string().min(1),
      otp: z.string().length(6),
    }),
  ),
  async (req, res, next) => {
    try {
      return ok(res, await verifyOtp(req.body));
    } catch (err) {
      return next(err);
    }
  },
);

guestRouter.get(
  "/order/:orderCode",
  requireGuest,
  requireGuestScope("orderCode"),
  async (req, res, next) => {
    try {
      return ok(res, await getGuestOrder(param(req, "orderCode")));
    } catch (err) {
      return next(err);
    }
  },
);
