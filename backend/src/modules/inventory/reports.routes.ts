import { Router } from "express";
import { AdminRole } from "@prisma/client";
import { ok } from "../../lib/response";
import { requireAdmin, requireRoles } from "../../middleware/auth";
import { getInventoryValuation, getLowStockAlerts } from "./reports.service";

export const adminInventoryReportsRouter = Router();

const inventoryRoles = [AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.MANAGER, AdminRole.WAREHOUSE_STAFF];
adminInventoryReportsRouter.use(requireAdmin, requireRoles(...inventoryRoles));

adminInventoryReportsRouter.get("/valuation", async (req, res, next) => {
  try {
    const data = await getInventoryValuation();
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
});

adminInventoryReportsRouter.get("/low-stock", async (req, res, next) => {
  try {
    const data = await getLowStockAlerts();
    return ok(res, data);
  } catch (err) {
    return next(err);
  }
});
