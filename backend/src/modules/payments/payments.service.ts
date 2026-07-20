import {
  BookingStatus,
  InvoiceLinkedType,
  PaymentStatus,
} from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError, NotFoundError } from "../../lib/errors";
import { nextInvoiceNumber } from "../../lib/sequences";
import { createRazorpayOrder, getRazorpayPublicKey, verifyWebhookSignature } from "../../integrations/razorpay/client";
import { generateInvoicePdf } from "../../integrations/invoice/pdf";
import { invoiceEmailHtml, sendEmail } from "../../integrations/email/mailer";
import { sendWhatsAppMessage } from "../../integrations/whatsapp/client";
import { notifyBookingConfirmed } from "../bookings/bookings.service";
import { logger } from "../../lib/logger";

export async function createPaymentOrder(input: {
  bookingCode?: string;
  eventRegistrationId?: string;
}) {
  if (input.bookingCode) {
    const booking = await prisma.booking.findFirst({
      where: { bookingCode: input.bookingCode, deletedAt: null },
    });
    if (!booking) throw new NotFoundError("Booking not found");
    if (booking.paymentStatus === PaymentStatus.PAID) {
      return {
        razorpayOrderId: booking.razorpayOrderId,
        amountInPaise: booking.totalPriceInPaise,
        razorpayKeyId: getRazorpayPublicKey(),
        alreadyPaid: true,
      };
    }
    if (booking.razorpayOrderId) {
      return {
        razorpayOrderId: booking.razorpayOrderId,
        amountInPaise: booking.totalPriceInPaise,
        razorpayKeyId: getRazorpayPublicKey(),
        alreadyPaid: false,
      };
    }
    const order = await createRazorpayOrder({
      amountInPaise: booking.totalPriceInPaise,
      receipt: booking.bookingCode,
      notes: { bookingCode: booking.bookingCode, type: "BOOKING" },
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { razorpayOrderId: order.id },
    });
    return {
      razorpayOrderId: order.id,
      amountInPaise: booking.totalPriceInPaise,
      razorpayKeyId: getRazorpayPublicKey(),
      alreadyPaid: false,
    };
  }

  throw new AppError("VALIDATION_ERROR", "bookingCode is required", 400);
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

  const booking = await prisma.booking.findFirst({
    where: { razorpayOrderId: orderId, deletedAt: null },
    include: { customer: true, theme: true, package: true },
  });

  if (booking) {
    if (event === "payment.captured" || payment?.status === "captured") {
      if (booking.paymentStatus !== PaymentStatus.PAID) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: BookingStatus.CONFIRMED,
            razorpayPaymentId: payment?.id,
          },
        });
        await enqueueInvoiceForBooking(booking.id);
        void notifyBookingConfirmed(booking.bookingCode);
      }
      return { handled: true, type: "BOOKING", id: booking.id };
    }
    if (event === "payment.failed") {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      return { handled: true, type: "BOOKING_FAILED", id: booking.id };
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

export async function enqueueInvoiceForBooking(bookingId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    include: {
      customer: true,
      theme: true,
      package: true,
      customizations: { include: { option: true } },
      invoice: true,
    },
  });
  if (!booking) throw new NotFoundError("Booking not found");
  if (booking.invoice) return booking.invoice;

  const invoiceNumber = await nextInvoiceNumber();
  const lineItems = [
    { label: `${booking.theme.title} — ${booking.package.title}`, amountInPaise: booking.basePriceInPaise },
    ...booking.customizations.map((c) => ({
      label: `${c.option.label} × ${c.quantity}`,
      amountInPaise: c.unitPriceInPaise * c.quantity,
    })),
  ];

  const pdf = await generateInvoicePdf({
    invoiceNumber,
    guestName: booking.customer.fullName,
    guestEmail: booking.guestEmail,
    guestPhone: booking.guestPhone,
    lineItems,
    subtotalInPaise: booking.basePriceInPaise + booking.customizationTotalInPaise,
    gstInPaise: booking.gstInPaise,
    totalInPaise: booking.totalPriceInPaise,
    issuedAt: new Date(),
  });

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      linkedType: InvoiceLinkedType.BOOKING,
      bookingId: booking.id,
      customerId: booking.customerId,
      subtotalInPaise: booking.basePriceInPaise + booking.customizationTotalInPaise,
      gstInPaise: booking.gstInPaise,
      totalInPaise: booking.totalPriceInPaise,
      pdfUrl: pdf.url,
    },
  });

  await deliverInvoice(invoice.id);
  return invoice;
}

export async function deliverInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, deletedAt: null },
    include: { customer: true, booking: true },
  });
  if (!invoice) throw new NotFoundError("Invoice not found");

  const emailResult = await sendEmail({
    to: invoice.customer.email,
    subject: `Invoice ${invoice.invoiceNumber} — Vaibhav Celebrations`,
    html: invoiceEmailHtml({
      invoiceNumber: invoice.invoiceNumber,
      guestName: invoice.customer.fullName,
      totalInPaise: invoice.totalInPaise,
      pdfUrl: invoice.pdfUrl,
    }),
  });

  const wa = await sendWhatsAppMessage({
    toPhone: invoice.customer.phone,
    templateName: "invoice_delivery",
    body: `Your invoice ${invoice.invoiceNumber} for ₹${(invoice.totalInPaise / 100).toFixed(2)} is ready.`,
    mediaUrl: invoice.pdfUrl ?? undefined,
  });

  return prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      emailSentAt: emailResult.sent ? new Date() : invoice.emailSentAt,
      whatsappSentAt: wa.sent ? new Date() : invoice.whatsappSentAt,
      whatsappSendStatus: wa.status ?? (wa.skipped ? "SKIPPED" : wa.sent ? "SENT" : "FAILED"),
    },
  });
}

export async function listInvoices(filters: {
  from?: string;
  to?: string;
  customerId?: string;
  page: number;
  pageSize: number;
}) {
  const where: {
    deletedAt: null;
    customerId?: string;
    issuedAt?: { gte?: Date; lte?: Date };
  } = { deletedAt: null };
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.from || filters.to) {
    where.issuedAt = {};
    if (filters.from) where.issuedAt.gte = new Date(filters.from);
    if (filters.to) where.issuedAt.lte = new Date(filters.to);
  }

  const [total, items] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: { customer: { select: { fullName: true, email: true, phone: true } }, booking: true },
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
    include: { customer: true, booking: true },
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
