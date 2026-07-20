import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { corsOrigins, env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/error-handler";
import { getUploadDir } from "./integrations/media/storage";

import { authRouter } from "./modules/auth/auth.routes";
import { healthRouter } from "./modules/health/health.routes";
import { guestRouter } from "./modules/guest/guest.routes";
import { themesRouter, adminThemesRouter } from "./modules/themes/themes.routes";
import { packagesRouter, adminPackagesRouter } from "./modules/packages/packages.routes";
import { pricingRouter } from "./modules/pricing/pricing.routes";
import { galleryRouter, adminGalleryRouter } from "./modules/gallery/gallery.routes";
import { contentRouter, adminContentRouter } from "./modules/content/content.routes";
import { blogRouter, adminBlogRouter } from "./modules/blog/blog.routes";
import { eventsRouter, adminEventsRouter } from "./modules/events/events.routes";
import { mediaRouter } from "./modules/media/media.routes";
import { availabilityRouter } from "./modules/availability/availability.routes";
import {
  bookingsRouter,
  checkoutRouter,
  adminBookingsRouter,
} from "./modules/bookings/bookings.routes";
import {
  paymentsRouter,
  invoicesRouter,
  adminInvoicesRouter,
} from "./modules/payments/payments.routes";
import {
  consultationsRouter,
  adminConsultationsRouter,
} from "./modules/consultations/consultations.routes";
import {
  leadsPublicRouter,
  adminLeadsRouter,
  adminCustomersRouter,
} from "./modules/crm/crm.routes";
import { chatbotRouter, adminChatbotRouter } from "./modules/chatbot/chatbot.routes";
import {
  adminCapacityRouter,
  adminSettingsRouter,
  adminAuditRouter,
} from "./modules/admin/admin-ops.routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );

  // Razorpay webhook needs raw body for signature verification
  app.use(
    `${env.API_PREFIX}/payments/webhook`,
    express.raw({ type: "application/json" }),
    (req, _res, next) => {
      if (Buffer.isBuffer(req.body)) {
        (req as express.Request & { rawBody?: string }).rawBody = req.body.toString("utf8");
        try {
          req.body = JSON.parse((req as express.Request & { rawBody?: string }).rawBody ?? "{}");
        } catch {
          // leave as buffer; handler will stringify
        }
      }
      next();
    },
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== "test",
    }),
  );

  // Local media uploads (dev / fallback when R2 unset)
  app.use("/uploads", express.static(getUploadDir()));

  const publicLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_PUBLIC,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many requests" },
    },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many auth attempts" },
    },
  });

  const strictLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many requests" },
    },
  });

  const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many OTP attempts" },
    },
  });

  app.use(publicLimiter);
  app.use(healthRouter);

  const api = express.Router();

  // Auth & guest
  api.use("/auth", authLimiter, authRouter);
  api.use("/guest", otpLimiter, guestRouter);

  // Public CMS
  api.use("/themes", themesRouter);
  api.use("/packages", packagesRouter);
  api.use("/pricing", pricingRouter);
  api.use("/gallery", galleryRouter);
  api.use(contentRouter);
  api.use("/blog", blogRouter);
  api.use("/events", eventsRouter);

  // Booking journey
  api.use("/availability", availabilityRouter);
  api.use("/bookings", strictLimiter, bookingsRouter);
  api.use("/checkout", checkoutRouter);
  api.use("/payments", paymentsRouter);
  api.use("/invoices", invoicesRouter);
  api.use("/consultations", strictLimiter, consultationsRouter);
  api.use("/leads", strictLimiter, leadsPublicRouter);
  api.use("/chatbot", chatbotRouter);

  // Admin
  api.use("/admin/themes", adminThemesRouter);
  api.use("/admin/packages", adminPackagesRouter);
  api.use("/admin/gallery", adminGalleryRouter);
  api.use("/admin", adminContentRouter);
  api.use("/admin/blog", adminBlogRouter);
  api.use("/admin/events", adminEventsRouter);
  api.use("/admin/media", mediaRouter);
  api.use("/admin/bookings", adminBookingsRouter);
  api.use("/admin/invoices", adminInvoicesRouter);
  api.use("/admin/consultations", adminConsultationsRouter);
  api.use("/admin/leads", adminLeadsRouter);
  api.use("/admin/customers", adminCustomersRouter);
  api.use("/admin/chatbot", adminChatbotRouter);
  api.use("/admin/capacity-rules", adminCapacityRouter);
  api.use("/admin/settings", adminSettingsRouter);
  api.use("/admin/audit-log", adminAuditRouter);

  app.use(env.API_PREFIX, api);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });

  app.use(errorHandler);

  return app;
}
