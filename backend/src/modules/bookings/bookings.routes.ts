import { param } from "../../lib/params";
import { AdminRole, BookingStatus, PaymentStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { clientIp, writeAuditLog } from "../../lib/audit";
import { created, ok, paginationMeta, parsePagination } from "../../lib/response";
import { requireAdmin, requireRoles, type AuthenticatedRequest } from "../../middleware/auth";
import { requireGuest, requireGuestScope, type GuestAuthenticatedRequest } from "../../middleware/guest-auth";
import { idempotency } from "../../middleware/idempotency";
import { validate } from "../../middleware/validate";
import { paginationQuerySchema } from "../../lib/validators";
import {
  adminUpdateBookingStatus,
  cancelBooking,
  createBooking,
  getCalendarBookings,
  getCheckoutSummary,
  listAdminBookings,
} from "./bookings.service";

const createSchema = z
  .object({
    themeId: z.string().min(1).optional(),
    packageId: z.string().min(1).optional(),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    selectedOptions: z
      .array(z.object({ optionId: z.string().min(1), quantity: z.number().int().min(0) }))
      .optional(),
    guestName: z.string().min(1),
    guestEmail: z.string().email(),
    guestPhone: z.string().min(8),
    builder: z
      .object({
        packageSlug: z.enum(["standard", "premium", "luxe"]),
        themeSlug: z.string().min(1),
        guestCount: z.number().int().min(5).max(200),
        location: z.enum(["jaipur", "outside"]),
        selections: z.object({
          welcomeItem: z.string().min(1).optional().nullable(),
          activity1: z.string().min(1).optional().nullable(),
          activity2: z.string().min(1).optional().nullable(),
          returnGift: z.string().min(1).optional().nullable(),
          familyActivity: z.string().min(1).optional().nullable(),
          decor: z.boolean().optional().default(false),
        }),
      })
      .optional(),
  })
  .refine((d) => !!d.builder || (!!d.themeId && !!d.packageId), {
    message: "Provide builder state or themeId+packageId",
  });

export const bookingsRouter = Router();

bookingsRouter.post("/", idempotency, validate(createSchema), async (req, res, next) => {
  try {
    return created(res, await createBooking(req.body));
  } catch (err) {
    return next(err);
  }
});

bookingsRouter.post(
  "/:bookingCode/cancel",
  requireGuest,
  requireGuestScope("bookingCode"),
  async (req, res, next) => {
    try {
      return ok(res, await cancelBooking(param(req, "bookingCode")));
    } catch (err) {
      return next(err);
    }
  },
);

export const checkoutRouter = Router();

checkoutRouter.post(
  "/booking/:bookingCode/summary",
  validate(z.object({ bookingCode: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      return ok(res, await getCheckoutSummary(param(req, "bookingCode")));
    } catch (err) {
      return next(err);
    }
  },
);

const adminRoles = [requireAdmin, requireRoles(AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN)];

export const adminBookingsRouter = Router();
adminBookingsRouter.use(...adminRoles);

adminBookingsRouter.get(
  "/",
  validate(
    paginationQuerySchema.extend({
      search: z.string().optional(),
      status: z.nativeEnum(BookingStatus).optional(),
      paymentStatus: z.nativeEnum(PaymentStatus).optional(),
      themeId: z.string().optional(),
      packageId: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as {
        search?: string;
        page?: number;
        pageSize?: number;
        status?: BookingStatus;
        paymentStatus?: PaymentStatus;
        themeId?: string;
        packageId?: string;
        from?: string;
        to?: string;
      };
      const { page, pageSize } = parsePagination(q);
      const { total, items } = await listAdminBookings({ ...q, page, pageSize });
      return ok(res, items, { pagination: paginationMeta(page, pageSize, total) });
    } catch (err) {
      return next(err);
    }
  },
);

adminBookingsRouter.get(
  "/calendar",
  validate(
    z.object({
      view: z.enum(["day", "week", "month"]).default("month"),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
    "query",
  ),
  async (req, res, next) => {
    try {
      const { view, date } = req.query as unknown as { view: "day" | "week" | "month"; date: string };
      return ok(res, await getCalendarBookings(view, date));
    } catch (err) {
      return next(err);
    }
  },
);

adminBookingsRouter.put(
  "/:id/status",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(z.object({ status: z.nativeEnum(BookingStatus) })),
  async (req, res, next) => {
    try {
      const item = await adminUpdateBookingStatus(param(req, "id"), req.body.status);
      await writeAuditLog({
        adminUserId: (req as AuthenticatedRequest).admin!.sub,
        action: "BOOKING_STATUS_CHANGED",
        entityType: "Booking",
        entityId: item.id,
        metadata: { status: item.status },
        ipAddress: clientIp(req as AuthenticatedRequest),
      });
      return ok(res, item);
    } catch (err) {
      return next(err);
    }
  },
);

adminBookingsRouter.post(
  "/:bookingCode/cancel",
  validate(z.object({ bookingCode: z.string().min(1) }), "params"),
  async (req, res, next) => {
    try {
      const item = await cancelBooking(param(req, "bookingCode"));
      await writeAuditLog({
        adminUserId: (req as AuthenticatedRequest).admin!.sub,
        action: "BOOKING_CANCELLED",
        entityType: "Booking",
        entityId: item.id,
        ipAddress: clientIp(req as AuthenticatedRequest),
      });
      return ok(res, item);
    } catch (err) {
      return next(err);
    }
  },
);
