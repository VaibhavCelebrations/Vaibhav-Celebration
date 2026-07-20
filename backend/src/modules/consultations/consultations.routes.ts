import { param } from "../../lib/params";
import { AdminRole, ConsultationStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { created, ok, paginationMeta, parsePagination } from "../../lib/response";
import { paginationQuerySchema } from "../../lib/validators";
import { requireAdmin, requireRoles } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  createConsultation,
  listConsultations,
  updateConsultationStatus,
} from "./consultations.service";

export const consultationsRouter = Router();

consultationsRouter.post(
  "/",
  validate(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(8),
      eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      childOrEventDetails: z.string().optional(),
      customRequirements: z.string().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      return created(res, await createConsultation(req.body));
    } catch (err) {
      return next(err);
    }
  },
);

export const adminConsultationsRouter = Router();
adminConsultationsRouter.use(requireAdmin, requireRoles(AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN));

adminConsultationsRouter.get(
  "/",
  validate(
    paginationQuerySchema.extend({ status: z.nativeEnum(ConsultationStatus).optional() }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as { page?: number; pageSize?: number; status?: ConsultationStatus };
      const { page, pageSize } = parsePagination(q);
      const { total, items } = await listConsultations({ status: q.status, page, pageSize });
      return ok(res, items, { pagination: paginationMeta(page, pageSize, total) });
    } catch (err) {
      return next(err);
    }
  },
);

adminConsultationsRouter.put(
  "/:id/status",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(z.object({ status: z.nativeEnum(ConsultationStatus) })),
  async (req, res, next) => {
    try {
      return ok(res, await updateConsultationStatus(param(req, "id"), req.body.status));
    } catch (err) {
      return next(err);
    }
  },
);
