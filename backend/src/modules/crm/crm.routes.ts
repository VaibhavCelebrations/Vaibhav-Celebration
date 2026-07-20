import { param } from "../../lib/params";
import { AdminRole, LeadSource, LeadStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { created, ok, paginationMeta, parsePagination } from "../../lib/response";
import { paginationQuerySchema } from "../../lib/validators";
import { requireAdmin, requireRoles, type AuthenticatedRequest } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  addCustomerNote,
  createContactLead,
  getCustomer360,
  listCustomers,
  listLeads,
  updateLeadStatus,
} from "./crm.service";

export const leadsPublicRouter = Router();

leadsPublicRouter.post(
  "/contact-form",
  validate(
    z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      message: z.string().optional(),
      interestArea: z.string().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      return created(res, await createContactLead(req.body));
    } catch (err) {
      return next(err);
    }
  },
);

const crmRoles = [requireAdmin, requireRoles(AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN)];

export const adminLeadsRouter = Router();
adminLeadsRouter.use(...crmRoles);

adminLeadsRouter.get(
  "/",
  validate(
    paginationQuerySchema.extend({
      status: z.nativeEnum(LeadStatus).optional(),
      source: z.nativeEnum(LeadSource).optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as {
        page?: number;
        pageSize?: number;
        status?: LeadStatus;
        source?: LeadSource;
      };
      const { page, pageSize } = parsePagination(q);
      const { total, items } = await listLeads({ ...q, page, pageSize });
      return ok(res, items, { pagination: paginationMeta(page, pageSize, total) });
    } catch (err) {
      return next(err);
    }
  },
);

adminLeadsRouter.put(
  "/:id/status",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(z.object({ status: z.nativeEnum(LeadStatus) })),
  async (req, res, next) => {
    try {
      return ok(res, await updateLeadStatus(param(req, "id"), req.body.status));
    } catch (err) {
      return next(err);
    }
  },
);

export const adminCustomersRouter = Router();
adminCustomersRouter.use(...crmRoles);

adminCustomersRouter.get(
  "/",
  validate(paginationQuerySchema.extend({ search: z.string().optional() }), "query"),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as { page?: number; pageSize?: number; search?: string };
      const { page, pageSize } = parsePagination(q);
      const { total, items } = await listCustomers({ search: q.search, page, pageSize });
      return ok(res, items, { pagination: paginationMeta(page, pageSize, total) });
    } catch (err) {
      return next(err);
    }
  },
);

adminCustomersRouter.get("/:id", async (req, res, next) => {
  try {
    return ok(res, await getCustomer360(param(req, "id")));
  } catch (err) {
    return next(err);
  }
});

adminCustomersRouter.post(
  "/:id/notes",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(z.object({ note: z.string().min(1) })),
  async (req, res, next) => {
    try {
      const note = await addCustomerNote({
        customerId: param(req, "id"),
        authorAdminUserId: (req as AuthenticatedRequest).admin!.sub,
        note: req.body.note,
      });
      return created(res, note);
    } catch (err) {
      return next(err);
    }
  },
);
