import { Router } from "express";
import { ok } from "../../lib/response";
import { getPublicSettings } from "./public-settings.service";

export const publicSettingsRouter = Router();

publicSettingsRouter.get("/public", async (_req, res, next) => {
  try {
    return ok(res, await getPublicSettings());
  } catch (error) {
    return next(error);
  }
});
