import { param } from "../../lib/params";
import { AdminRole } from "@prisma/client";
import { Router, type Request } from "express";
import { z } from "zod";
import { clientIp, writeAuditLog } from "../../lib/audit";
import { ForbiddenError } from "../../lib/errors";
import { ok, paginationMeta, parsePagination } from "../../lib/response";
import { paginationQuerySchema } from "../../lib/validators";
import { requireAdmin, requireRoles, type AuthenticatedRequest } from "../../middleware/auth";
import { requireGuest, type GuestAuthenticatedRequest } from "../../middleware/guest-auth";
import { idempotency } from "../../middleware/idempotency";
import { validate } from "../../middleware/validate";
import {
  createPaymentOrder,
  deliverInvoice,
  exportInvoicesCsv,
  getInvoiceByNumber,
  handleRazorpayWebhook,
  listInvoices,
} from "./payments.service";

export const paymentsRouter = Router();

paymentsRouter.post(
  "/razorpay/order",
  idempotency,
  validate(z.object({ bookingCode: z.string().min(1).optional() })),
  async (req, res, next) => {
    try {
      return ok(res, await createPaymentOrder(req.body));
    } catch (err) {
      return next(err);
    }
  },
);

/** Raw body preserved via app.ts express.raw + rawBody attachment */
paymentsRouter.post("/webhook", async (req, res, next) => {
  try {
    const rawBody = (req as Request & { rawBody?: string }).rawBody;
    const raw =
      rawBody ??
      (typeof req.body === "string"
        ? req.body
        : Buffer.isBuffer(req.body)
          ? req.body.toString("utf8")
          : JSON.stringify(req.body));
    const signature = req.header("x-razorpay-signature") ?? undefined;
    const result = await handleRazorpayWebhook(raw, signature);
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
});

export const invoicesRouter = Router();

invoicesRouter.get("/:invoiceNumber/download", requireGuest, async (req, res, next) => {
  try {
    const invoice = await getInvoiceByNumber(param(req, "invoiceNumber"));
    const guest = (req as GuestAuthenticatedRequest).guest!;
    const bookingCode = invoice.booking?.bookingCode;
    if (guest.sub !== bookingCode) {
      if (guest.email.toLowerCase() !== invoice.customer.email.toLowerCase()) {
        throw new ForbiddenError();
      }
    }
    if (invoice.pdfUrl) {
      return res.redirect(invoice.pdfUrl);
    }
    return ok(res, invoice);
  } catch (err) {
    return next(err);
  }
});

export const adminInvoicesRouter = Router();
adminInvoicesRouter.use(requireAdmin, requireRoles(AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN));

adminInvoicesRouter.get(
  "/",
  validate(
    paginationQuerySchema.extend({
      search: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      customerId: z.string().optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as {
        search?: string;
        page?: number;
        pageSize?: number;
        from?: string;
        to?: string;
        customerId?: string;
      };
      const { page, pageSize } = parsePagination(q);
      const { total, items } = await listInvoices({ ...q, page, pageSize });
      return ok(res, items, { pagination: paginationMeta(page, pageSize, total) });
    } catch (err) {
      return next(err);
    }
  },
);

adminInvoicesRouter.get(
  "/export",
  validate(
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      format: z.enum(["csv", "zip"]).default("csv"),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as { from?: string; to?: string };
      const csv = await exportInvoicesCsv(q.from, q.to);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="invoices.csv"');
      return res.send(csv);
    } catch (err) {
      return next(err);
    }
  },
);

adminInvoicesRouter.post("/:id/resend", async (req, res, next) => {
  try {
    const invoice = await deliverInvoice(param(req, "id"));
    await writeAuditLog({
      adminUserId: (req as AuthenticatedRequest).admin!.sub,
      action: "INVOICE_RESEND",
      entityType: "Invoice",
      entityId: invoice.id,
      ipAddress: clientIp(req as AuthenticatedRequest),
    });
    return ok(res, invoice);
  } catch (err) {
    return next(err);
  }
});
