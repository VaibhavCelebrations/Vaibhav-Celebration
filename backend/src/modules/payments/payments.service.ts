import { PaymentStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError, NotFoundError } from "../../lib/errors";
import { createRazorpayOrder, getRazorpayPublicKey, verifyWebhookSignature } from "../../integrations/razorpay/client";
import { invoiceEmailHtml, sendEmail } from "../../integrations/email/mailer";
import { fetchInvoicePdfBuffer } from "../../integrations/invoice/pdf";
import { sendWhatsAppMessage, WHATSAPP_TEMPLATES } from "../../integrations/whatsapp/client";
import {
  findOrderByRazorpayOrderId,
  markOrderPaid,
  markOrderPaymentFailed,
} from "../orders/orders.service";
import { logger } from "../../lib/logger";
import { claimPaymentEvent } from "./payment-events";

export async function createPaymentOrder(input: {
  orderCode?: string;
  eventRegistrationId?: string;
}) {
  if (input.orderCode) {
    const order = await prisma.order.findFirst({ where: { orderCode: input.orderCode } });
    if (!order) throw new NotFoundError("Order not found");
    if (order.paymentStatus === PaymentStatus.PAID) {
      return {
        razorpayOrderId: order.razorpayOrderId,
        amountInPaise: order.totalInPaise,
        razorpayKeyId: getRazorpayPublicKey(),
        alreadyPaid: true,
      };
    }
    if (order.razorpayOrderId && order.paymentStatus !== PaymentStatus.FAILED) {
      return {
        razorpayOrderId: order.razorpayOrderId,
        amountInPaise: order.totalInPaise,
        razorpayKeyId: getRazorpayPublicKey(),
        alreadyPaid: false,
      };
    }
    const rz = await createRazorpayOrder({
      amountInPaise: order.totalInPaise,
      receipt: order.orderCode,
      notes: { orderCode: order.orderCode, type: "SHOP_ORDER" },
    });
    await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: rz.id, paymentStatus: PaymentStatus.PENDING } });
    return {
      razorpayOrderId: rz.id,
      amountInPaise: order.totalInPaise,
      razorpayKeyId: getRazorpayPublicKey(),
      alreadyPaid: false,
    };
  }

  throw new AppError("VALIDATION_ERROR", "orderCode is required", 400);
}

export async function handleRazorpayWebhook(rawBody: string, signature: string | undefined) {
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw new AppError("PAYMENT_SIGNATURE_INVALID", "Invalid Razorpay webhook signature", 400);
  }

  const payload = JSON.parse(rawBody) as {
    event: string;
    payload: {
      payment?: {
        entity: {
          id: string;
          order_id: string;
          status: string;
          amount: number;
        };
      };
      order?: { entity: { id: string; receipt?: string; notes?: Record<string, string> } };
    };
  };

  const event = payload.event;
  const payment = payload.payload.payment?.entity;
  const orderId = payment?.order_id ?? payload.payload.order?.entity.id;
  if (!orderId) {
    logger.warn({ event }, "Webhook without order id — ignored");
    return { handled: false };
  }

  const eventKey = payment?.id ? `${event}:${payment.id}` : `${event}:${orderId}`;

  const shopOrder = await findOrderByRazorpayOrderId(orderId);
  if (shopOrder) {
    if (event === "payment.captured" || payment?.status === "captured") {
      if (payment?.amount && payment.amount !== shopOrder.totalInPaise) {
        logger.error({ orderId: shopOrder.id, expected: shopOrder.totalInPaise, got: payment.amount }, "Webhook amount mismatch");
        throw new AppError("PAYMENT_AMOUNT_MISMATCH", "Payment amount does not match order", 400);
      }
      const claimed = await claimPaymentEvent({
        eventKey,
        eventType: event,
        razorpayOrderId: orderId,
        razorpayPaymentId: payment?.id,
        payload,
      });
      await markOrderPaid(shopOrder.id, payment?.id);
      return { handled: true, type: "ORDER", id: shopOrder.id, duplicate: !claimed };
    }
    if (event === "payment.failed") {
      const claimed = await claimPaymentEvent({
        eventKey,
        eventType: event,
        razorpayOrderId: orderId,
        razorpayPaymentId: payment?.id,
        payload,
      });
      if (!claimed) return { handled: true, duplicate: true };
      await markOrderPaymentFailed(shopOrder.id);
      return { handled: true, type: "ORDER_FAILED", id: shopOrder.id };
    }
  }

  const registration = await prisma.eventRegistration.findFirst({
    where: { razorpayOrderId: orderId, deletedAt: null },
  });
  if (registration) {
    if (event === "payment.captured" || payment?.status === "captured") {
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          amountPaidInPaise: payment?.amount,
          razorpayPaymentId: payment?.id,
        },
      });
      return { handled: true, type: "EVENT_REGISTRATION", id: registration.id };
    }
    if (event === "payment.failed") {
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      return { handled: true, type: "EVENT_REGISTRATION_FAILED", id: registration.id };
    }
  }

  logger.info({ event, orderId }, "Webhook matched no entity");
  return { handled: false };
}

export async function deliverInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, deletedAt: null },
    include: { customer: true, order: true },
  });
  if (!invoice) throw new NotFoundError("Invoice not found");

  const pdfBuffer = await fetchInvoicePdfBuffer(invoice.pdfUrl);
  const emailResult = await sendEmail({
    to: invoice.customer.email,
    subject: `Invoice ${invoice.invoiceNumber} — Vaibhav Celebrations`,
    html: invoiceEmailHtml({
      invoiceNumber: invoice.invoiceNumber,
      guestName: invoice.customer.fullName,
      totalInPaise: invoice.totalInPaise,
    }),
    attachments: pdfBuffer
      ? [{ filename: `Invoice-${invoice.invoiceNumber}.pdf`, content: pdfBuffer, contentType: "application/pdf" }]
      : undefined,
  });

  const wa = await sendWhatsAppMessage({
    toPhone: invoice.customer.phone,
    templateName: WHATSAPP_TEMPLATES.invoiceDelivery,
    body: invoice.invoiceNumber,
    bodyParameters: [invoice.invoiceNumber, (invoice.totalInPaise / 100).toFixed(2)],
    mediaUrl: invoice.pdfUrl ?? undefined,
  });

  return prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      emailSentAt: emailResult.sent ? new Date() : invoice.emailSentAt,
      emailSendStatus: emailResult.status,
      whatsappSentAt: wa.sent ? new Date() : invoice.whatsappSentAt,
      whatsappSendStatus: wa.status,
      whatsappMessageId: wa.providerMessageId ?? invoice.whatsappMessageId,
    },
  });
}

export async function listInvoices(filters: {
  search?: string;
  from?: string;
  to?: string;
  customerId?: string;
  page: number;
  pageSize: number;
}) {
  const where: any = { deletedAt: null };
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.from || filters.to) {
    where.issuedAt = {};
    if (filters.from) where.issuedAt.gte = new Date(filters.from);
    if (filters.to) where.issuedAt.lte = new Date(filters.to);
  }
  if (filters.search) {
    where.OR = [
      { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
      { customer: { fullName: { contains: filters.search, mode: "insensitive" } } },
      { customer: { email: { contains: filters.search, mode: "insensitive" } } },
      { customer: { phone: { contains: filters.search } } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: { customer: { select: { fullName: true, email: true, phone: true } }, order: { select: { orderCode: true } } },
      orderBy: { issuedAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);
  return { total, items };
}

export async function getInvoiceByNumber(invoiceNumber: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNumber, deletedAt: null },
    include: { customer: true, order: true },
  });
  if (!invoice) throw new NotFoundError("Invoice not found");
  return invoice;
}

export async function exportInvoicesCsv(from?: string, to?: string) {
  const { items } = await listInvoices({ from, to, page: 1, pageSize: 10_000 });
  const header = "invoiceNumber,customer,email,phone,subtotal,gst,total,issuedAt,pdfUrl";
  const rows = items.map((i) =>
    [
      i.invoiceNumber,
      JSON.stringify(i.customer.fullName),
      i.customer.email,
      i.customer.phone,
      (i.subtotalInPaise / 100).toFixed(2),
      (i.gstInPaise / 100).toFixed(2),
      (i.totalInPaise / 100).toFixed(2),
      i.issuedAt.toISOString(),
      i.pdfUrl ?? "",
    ].join(","),
  );
  return [header, ...rows].join("\n");
}

export async function listPaymentEvents(filters: { search?: string; page: number; pageSize: number }) {
  const where: import("@prisma/client").Prisma.PaymentEventWhereInput = {};
  if (filters.search) {
    const s = filters.search.trim();
    where.OR = [
      { eventKey: { contains: s, mode: "insensitive" } },
      { razorpayOrderId: { contains: s, mode: "insensitive" } },
      { razorpayPaymentId: { contains: s, mode: "insensitive" } },
      { eventType: { contains: s, mode: "insensitive" } },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.paymentEvent.count({ where }),
    prisma.paymentEvent.findMany({
      where,
      orderBy: { processedAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);
  return { total, items };
}
