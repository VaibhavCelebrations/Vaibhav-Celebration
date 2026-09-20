import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { normalizeWhatsAppPhone } from "../../integrations/whatsapp/phone";
import { getWhatsAppProvider } from "../../integrations/whatsapp/provider-factory";
import { verifyMetaWebhookSignature } from "../../integrations/whatsapp/signature";
import { mapMetaWebhookStatus, mergeStatus, type WhatsAppStatus } from "../../integrations/whatsapp/status";
import { WhatsAppSendError, invalidPhoneError } from "../../integrations/whatsapp/errors";
import {
  buildInvoiceDeliveryMessage,
  buildOrderConfirmationMessage,
  buildOrderStatusUpdateMessage,
  buildPhoneVerificationMessage,
  buildWelcomeMessage,
} from "../../integrations/whatsapp/templates";
import type { WhatsAppDocument } from "../../integrations/whatsapp/provider.types";
import { NotFoundError, ValidationError } from "../../lib/errors";

export type WhatsAppSendOutcome = {
  sent: boolean;
  status: WhatsAppStatus;
  providerMessageId?: string;
  error?: string;
};

/** A send stuck at PENDING this long almost certainly means the process crashed mid-send — safe to reclaim (mirrors EMAIL_PENDING_STALE_MINUTES in orders.service.ts). */
const WHATSAPP_PENDING_STALE_MINUTES = 10;

/**
 * Core dispatcher: enabled/provider-skip check, one bounded retry for
 * transient failures, and normalization into a DB-writable outcome. Never
 * throws — callers (order/invoice/phone-verification flows) must never crash
 * because a WhatsApp send failed.
 */
async function dispatch(input: {
  toPhone: string;
  entityId: string;
  entityType: "order" | "invoice" | "phone_verification" | "welcome";
  message: { templateName: string; languageCode: string; bodyParameters: string[]; document?: WhatsAppDocument };
}): Promise<WhatsAppSendOutcome> {
  if (!env.WHATSAPP_ENABLED) {
    logger.info({ entityType: input.entityType, entityId: input.entityId, template: input.message.templateName }, "WhatsApp skipped — disabled");
    return { sent: false, status: "SKIPPED" };
  }

  const toPhoneE164 = normalizeWhatsAppPhone(input.toPhone);
  if (!toPhoneE164) {
    logger.warn({ entityType: input.entityType, entityId: input.entityId }, "WhatsApp skipped — invalid recipient phone");
    const err = invalidPhoneError();
    return { sent: false, status: "FAILED", error: err.code };
  }

  const provider = getWhatsAppProvider();
  const attemptSend = () =>
    input.message.document
      ? provider.sendDocumentTemplateMessage({
          toPhoneE164,
          templateName: input.message.templateName,
          languageCode: input.message.languageCode,
          bodyParameters: input.message.bodyParameters,
          document: input.message.document,
        })
      : provider.sendTemplateMessage({
          toPhoneE164,
          templateName: input.message.templateName,
          languageCode: input.message.languageCode,
          bodyParameters: input.message.bodyParameters,
        });

  const logContext = { entityType: input.entityType, entityId: input.entityId, template: input.message.templateName, provider: provider.name };

  try {
    const outcome = await attemptSend();
    logger.info({ ...logContext, providerMessageId: outcome.providerMessageId, status: outcome.status }, "WhatsApp send completed");
    return { sent: true, status: outcome.status, providerMessageId: outcome.providerMessageId };
  } catch (firstError) {
    const retryable = firstError instanceof WhatsAppSendError && firstError.retryable;
    if (!retryable) {
      logger.error({ ...logContext, err: (firstError as Error).message, retryable: false }, "WhatsApp send failed (non-retryable)");
      return { sent: false, status: "FAILED", error: (firstError as Error).message };
    }

    logger.warn({ ...logContext, err: (firstError as Error).message, retryable: true }, "WhatsApp send failed, retrying once");
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const outcome = await attemptSend();
      logger.info({ ...logContext, providerMessageId: outcome.providerMessageId, status: outcome.status, retried: true }, "WhatsApp send completed on retry");
      return { sent: true, status: outcome.status, providerMessageId: outcome.providerMessageId };
    } catch (secondError) {
      logger.error({ ...logContext, err: (secondError as Error).message, retried: true }, "WhatsApp send failed after retry");
      return { sent: false, status: "FAILED", error: (secondError as Error).message };
    }
  }
}

// ─── Order confirmation ───────────────────────────────────────────────────────

/**
 * Atomically claims the right to (re)send an order-confirmation WhatsApp
 * message. Reclaimable states mirror claimOrderConfirmationEmail in
 * orders.service.ts: never attempted, previously FAILED/SKIPPED, or a
 * PENDING claim stale enough to indicate a crashed process. DB-level
 * `updateMany` keeps this race-free under concurrent webhook deliveries.
 */
async function claimOrderConfirmationWhatsapp(orderId: string) {
  const staleBefore = new Date(Date.now() - WHATSAPP_PENDING_STALE_MINUTES * 60 * 1000);
  return prisma.order.updateMany({
    where: {
      id: orderId,
      OR: [
        { whatsappSendStatus: null },
        { whatsappSendStatus: "FAILED" },
        { whatsappSendStatus: "SKIPPED" },
        { whatsappSendStatus: "PENDING", updatedAt: { lt: staleBefore } },
      ],
    },
    data: { whatsappSendStatus: "PENDING" },
  });
}

/**
 * Sends the order_confirmation WhatsApp template for a paid order, with the
 * invoice PDF attached as a document header when available. Idempotent —
 * safe to call from both the Razorpay webhook and any future admin resend
 * action; only one send happens per order even under concurrent calls.
 */
export async function sendOrderConfirmationWhatsapp(order: {
  id: string;
  orderCode: string;
  contactPhone: string;
  totalInPaise: number;
  invoicePdfUrl?: string | null;
  includeGiftRegistrySetup?: boolean;
  /** Guest checkout only — login URL to include in the WhatsApp message. */
  guestLoginUrl?: string;
}): Promise<WhatsAppSendOutcome | { skipped: true }> {
  const claimed = await claimOrderConfirmationWhatsapp(order.id);
  if (claimed.count === 0) {
    return { skipped: true };
  }

  const amountFormatted = (order.totalInPaise / 100).toFixed(2);
  const document: WhatsAppDocument | undefined = order.invoicePdfUrl
    ? { url: order.invoicePdfUrl, filename: `Invoice-${order.orderCode}.pdf` }
    : undefined;
  const message = buildOrderConfirmationMessage({
    orderCode: order.orderCode,
    amountFormatted,
    document,
    includeGiftRegistrySetup: order.includeGiftRegistrySetup,
    guestLoginUrl: order.guestLoginUrl,
  });

  const outcome = await dispatch({
    toPhone: order.contactPhone,
    entityId: order.id,
    entityType: "order",
    message,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      whatsappSentAt: outcome.sent ? new Date() : undefined,
      whatsappSendStatus: outcome.status,
      whatsappMessageId: outcome.providerMessageId,
      whatsappError: outcome.error ?? null,
    },
  });

  return outcome;
}

// ─── Invoice delivery ─────────────────────────────────────────────────────────

/**
 * Sends the invoice_delivery WhatsApp template. Used by the admin
 * invoice-resend action (payments.service.ts `deliverInvoice`) — resend is
 * explicit and intentional, so no claim/idempotency guard is applied here;
 * the caller decides when to call it. Status is merged (never regressed) in
 * case a webhook already advanced the status for a previous send.
 */
export async function sendInvoiceDeliveryWhatsapp(invoice: {
  id: string;
  invoiceNumber: string;
  totalInPaise: number;
  pdfUrl?: string | null;
  whatsappSendStatus?: string | null;
  whatsappMessageId?: string | null;
  whatsappSentAt?: Date | null;
  customerPhone: string;
}): Promise<WhatsAppSendOutcome> {
  const amountFormatted = (invoice.totalInPaise / 100).toFixed(2);
  const document: WhatsAppDocument | undefined = invoice.pdfUrl
    ? { url: invoice.pdfUrl, filename: `Invoice-${invoice.invoiceNumber}.pdf` }
    : undefined;
  const message = buildInvoiceDeliveryMessage({ invoiceNumber: invoice.invoiceNumber, amountFormatted, document });

  const outcome = await dispatch({
    toPhone: invoice.customerPhone,
    entityId: invoice.id,
    entityType: "invoice",
    message,
  });

  return outcome;
}

// ─── Phone verification ───────────────────────────────────────────────────────

/**
 * Sends the phone_verification WhatsApp template containing only the
 * verification link (no name/order/sensitive data in the message body
 * beyond the opaque token already embedded in verifyUrl by the caller).
 */
export async function sendPhoneVerificationWhatsapp(input: { userId: string; phone: string; verifyUrl: string }): Promise<WhatsAppSendOutcome> {
  const message = buildPhoneVerificationMessage(input.verifyUrl);
  return dispatch({ toPhone: input.phone, entityId: input.userId, entityType: "phone_verification", message });
}

// ─── Welcome message ──────────────────────────────────────────────────────────

/**
 * Best-effort welcome message — gated by WHATSAPP_WELCOME_ENABLED because
 * Meta only allows free-form/template welcome sends once the
 * welcome_message template is approved and the customer messaging window
 * rules are satisfied. Never throws; caller should fire-and-forget.
 */
export async function sendWelcomeWhatsapp(input: { userId: string; phone: string; name: string }): Promise<WhatsAppSendOutcome | { skipped: true }> {
  if (!env.WHATSAPP_WELCOME_ENABLED) {
    return { skipped: true };
  }
  const message = buildWelcomeMessage({ name: input.name });
  return dispatch({ toPhone: input.phone, entityId: input.userId, entityType: "welcome", message });
}

/**
 * Sends the order_status_update WhatsApp template to the customer when an
 * admin moves an order to a new status. No idempotency claim is applied here
 * because each status change is a deliberate admin action that warrants exactly
 * one notification. Never throws — callers fire-and-forget.
 */
export async function sendOrderStatusUpdateWhatsapp(input: {
  orderId: string;
  orderCode: string;
  contactPhone: string;
  customerName: string;
  status: string;
  trackingUrl?: string | null;
}): Promise<WhatsAppSendOutcome> {
  const message = buildOrderStatusUpdateMessage({
    customerName: input.customerName,
    orderCode: input.orderCode,
    status: input.status,
    trackingUrl: input.trackingUrl,
  });
  return dispatch({
    toPhone: input.contactPhone,
    entityId: input.orderId,
    entityType: "order",
    message,
  });
}

// ─── Webhook: GET verification challenge ─────────────────────────────────────

export type WebhookChallengeResult = { ok: true; challenge: string } | { ok: false };

/** Pure logic for Meta's GET webhook verification handshake — testable without spinning up Express. */
export function verifyWebhookChallenge(query: { mode?: string; verifyToken?: string; challenge?: string }): WebhookChallengeResult {
  if (!env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) return { ok: false };
  if (query.mode !== "subscribe") return { ok: false };
  if (query.verifyToken !== env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) return { ok: false };
  return { ok: true, challenge: query.challenge ?? "" };
}

// ─── Webhook: POST status updates ────────────────────────────────────────────

export type MetaStatusUpdate = {
  providerMessageId: string;
  status: WhatsAppStatus;
  timestamp?: Date;
  error?: string;
  rawPayload?: unknown;
};

/**
 * Parses Meta's webhook payload into normalized status updates. Tolerant of
 * missing/unexpected fields at every level — a malformed or unknown-shaped
 * payload yields an empty array rather than throwing, so unknown event types
 * (e.g. incoming messages, future Meta payload changes) never crash the
 * webhook.
 */
export function parseMetaStatusUpdates(payload: unknown): MetaStatusUpdate[] {
  const out: MetaStatusUpdate[] = [];
  if (!payload || typeof payload !== "object") return out;

  const root = payload as { entry?: unknown };
  if (!Array.isArray(root.entry)) return out;

  for (const entry of root.entry) {
    const changes = (entry as { changes?: unknown })?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const statuses = (change as { value?: { statuses?: unknown } })?.value?.statuses;
      if (!Array.isArray(statuses)) continue;
      for (const status of statuses) {
        const id = (status as { id?: unknown })?.id;
        const rawStatus = (status as { status?: unknown })?.status;
        if (typeof id !== "string" || typeof rawStatus !== "string") continue;

        // Parse timestamp if present (Unix epoch in seconds)
        let timestamp: Date | undefined;
        const rawTs = (status as { timestamp?: unknown })?.timestamp;
        if (typeof rawTs === "string" || typeof rawTs === "number") {
          const tsNum = typeof rawTs === "number" ? rawTs : parseInt(rawTs, 10);
          if (!isNaN(tsNum) && tsNum > 0) {
            timestamp = new Date(tsNum * 1000);
          }
        }

        // Parse error details if status is failed
        let error: string | undefined;
        const errors = (status as { errors?: unknown })?.errors;
        if (Array.isArray(errors) && errors.length > 0) {
          error = errors
            .map((e: any) => {
              const code = e.code ?? "";
              const title = e.title ?? "";
              const msg = e.message ?? "";
              const details = e.error_data?.details ? ` (${e.error_data.details})` : "";
              return `[${code}] ${title ? `${title}: ` : ""}${msg}${details}`.trim();
            })
            .filter(Boolean)
            .join("; ");
        }

        out.push({
          providerMessageId: id,
          status: mapMetaWebhookStatus(rawStatus),
          timestamp,
          error,
          rawPayload: status,
        });
      }
    }
  }
  return out;
}

export type WebhookPostResult =
  | { signatureValid: false }
  | { signatureValid: true; malformed: true }
  | { signatureValid: true; malformed: false; updates: MetaStatusUpdate[] };

/** Verifies the signature, then safely parses the body — never throws, so the route can always answer Meta with a clean 200/401. */
export function parseAndVerifyWebhookPost(rawBody: string, signatureHeader: string | undefined): WebhookPostResult {
  if (!verifyMetaWebhookSignature(rawBody, signatureHeader)) {
    return { signatureValid: false };
  }
  try {
    const parsed = JSON.parse(rawBody);
    const updates = parseMetaStatusUpdates(parsed);
    return { signatureValid: true, malformed: false, updates };
  } catch {
    return { signatureValid: true, malformed: true };
  }
}

/**
 * Applies a single webhook status update to whichever Order/Invoice rows
 * reference this providerMessageId, using an indexed lookup
 * (@@index([whatsappMessageId])) and mergeStatus so a late/out-of-order
 * webhook can never regress an already-more-advanced status.
 *
 * Updates granular lifecycle timestamps:
 * - SENT: records whatsappSentAt
 * - DELIVERED: records whatsappDeliveredAt
 * - READ: records whatsappReadAt (and backfills whatsappDeliveredAt if unset)
 * - FAILED: records whatsappError details
 */
export async function applyWebhookStatusUpdate(update: MetaStatusUpdate): Promise<void> {
  const eventDate = update.timestamp ?? new Date();

  const [order, invoice] = await Promise.all([
    prisma.order.findFirst({
      where: { whatsappMessageId: update.providerMessageId },
      select: {
        id: true,
        whatsappSendStatus: true,
        whatsappSentAt: true,
        whatsappDeliveredAt: true,
        whatsappReadAt: true,
      },
    }),
    prisma.invoice.findFirst({
      where: { whatsappMessageId: update.providerMessageId },
      select: {
        id: true,
        whatsappSendStatus: true,
        whatsappSentAt: true,
        whatsappDeliveredAt: true,
        whatsappReadAt: true,
      },
    }),
  ]);

  if (order) {
    const merged = mergeStatus(order.whatsappSendStatus, update.status);
    const data: import("@prisma/client").Prisma.OrderUpdateInput = {
      whatsappSendStatus: merged,
    };

    if (update.status === "SENT") {
      data.whatsappSentAt = order.whatsappSentAt ?? eventDate;
    } else if (update.status === "DELIVERED") {
      data.whatsappDeliveredAt = order.whatsappDeliveredAt ?? eventDate;
    } else if (update.status === "READ") {
      data.whatsappReadAt = order.whatsappReadAt ?? eventDate;
      data.whatsappDeliveredAt = order.whatsappDeliveredAt ?? eventDate;
    } else if (update.status === "FAILED") {
      data.whatsappError = update.error ?? "WhatsApp delivery failed";
    }

    await prisma.order.update({ where: { id: order.id }, data });
  }

  if (invoice) {
    const merged = mergeStatus(invoice.whatsappSendStatus, update.status);
    const data: import("@prisma/client").Prisma.InvoiceUpdateInput = {
      whatsappSendStatus: merged,
    };

    if (update.status === "SENT") {
      data.whatsappSentAt = invoice.whatsappSentAt ?? eventDate;
    } else if (update.status === "DELIVERED") {
      data.whatsappDeliveredAt = invoice.whatsappDeliveredAt ?? eventDate;
    } else if (update.status === "READ") {
      data.whatsappReadAt = invoice.whatsappReadAt ?? eventDate;
      data.whatsappDeliveredAt = invoice.whatsappDeliveredAt ?? eventDate;
    } else if (update.status === "FAILED") {
      data.whatsappError = update.error ?? "WhatsApp delivery failed";
    }

    await prisma.invoice.update({ where: { id: invoice.id }, data });
  }

  if (!order && !invoice) {
    logger.info({ providerMessageId: update.providerMessageId }, "WhatsApp webhook status update matched no Order/Invoice — ignored");
  }
}

/**
 * Persists webhook status updates into WhatsAppWebhookEvent table for
 * auditing and idempotency, then processes each update.
 * Any duplicate delivery from Meta is identified by unique eventKey
 * ("status:{providerMessageId}:{status}") and safely skipped.
 */
export async function processWhatsAppWebhookUpdates(updates: MetaStatusUpdate[]): Promise<void> {
  for (const update of updates) {
    const eventKey = `status:${update.providerMessageId}:${update.status}`;
    let eventRecordId: string | null = null;

    try {
      // Try to create the event record (idempotency guard)
      const event = await prisma.whatsAppWebhookEvent.create({
        data: {
          eventKey,
          eventType: "STATUS_UPDATE",
          providerMessageId: update.providerMessageId,
          status: update.status,
          payload: (update.rawPayload ?? { providerMessageId: update.providerMessageId, status: update.status }) as never,
          processed: false,
        },
      });
      eventRecordId = event.id;
    } catch {
      // If eventKey already exists, Meta sent a duplicate delivery.
      logger.info({ eventKey }, "Duplicate WhatsApp webhook status event ignored");
      continue;
    }

    try {
      await applyWebhookStatusUpdate(update);
      if (eventRecordId) {
        await prisma.whatsAppWebhookEvent.update({
          where: { id: eventRecordId },
          data: { processed: true, processedAt: new Date() },
        });
      }
    } catch (processErr) {
      const errMsg = (processErr as Error).message;
      logger.error({ eventKey, err: errMsg }, "Failed to apply WhatsApp status update");
      if (eventRecordId) {
        await prisma.whatsAppWebhookEvent.update({
          where: { id: eventRecordId },
          data: { error: errMsg },
        }).catch(() => undefined);
      }
    }
  }
}

/**
 * Admin-triggered resend of order confirmation WhatsApp message.
 * Resets status to PENDING and clears any previous error before attempting send.
 */
export async function resendOrderConfirmationWhatsapp(orderId: string): Promise<WhatsAppSendOutcome> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderCode: true,
      contactPhone: true,
      totalInPaise: true,
      invoicePdfUrl: true,
      paymentStatus: true,
      status: true,
    },
  });

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  if (order.paymentStatus !== "PAID" && order.status !== "PAID") {
    throw new ValidationError("Order confirmation WhatsApp can only be sent for paid orders");
  }

  if (!order.contactPhone) {
    throw new ValidationError("Order does not have a contact phone number");
  }

  // Clear previous error and set to PENDING
  await prisma.order.update({
    where: { id: order.id },
    data: {
      whatsappSendStatus: "PENDING",
      whatsappError: null,
    },
  });

  const amountFormatted = (order.totalInPaise / 100).toFixed(2);
  const document: WhatsAppDocument | undefined = order.invoicePdfUrl
    ? { url: order.invoicePdfUrl, filename: `Invoice-${order.orderCode}.pdf` }
    : undefined;
  const message = buildOrderConfirmationMessage({ orderCode: order.orderCode, amountFormatted, document });

  const outcome = await dispatch({
    toPhone: order.contactPhone,
    entityId: order.id,
    entityType: "order",
    message,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      whatsappSentAt: outcome.sent ? new Date() : undefined,
      whatsappSendStatus: outcome.status,
      whatsappMessageId: outcome.providerMessageId,
      whatsappError: outcome.error ?? null,
    },
  });

  return outcome;
}
