import {
  BookingStatus,
  LeadSource,
  LeadStatus,
  PaymentStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { nextBookingCode } from "../../lib/sequences";
import { createRazorpayOrder, getRazorpayPublicKey } from "../../integrations/razorpay/client";
import { computeQuote, type QuoteOptionInput } from "../pricing/pricing.service";
import {
  countActiveBookings,
  resolveCapacity,
  withDateAdvisoryLock,
} from "../availability/availability.service";
import { toDateOnly } from "../../lib/validators";
import { bookingConfirmationHtml, sendEmail } from "../../integrations/email/mailer";

export type CreateBookingInput = {
  themeId: string;
  packageId: string;
  eventDate: string;
  selectedOptions?: QuoteOptionInput[];
  guestName: string;
  guestEmail: string;
  guestPhone: string;
};

async function findOrCreateCustomer(input: {
  fullName: string;
  email: string;
  phone: string;
}) {
  const existing = await prisma.customer.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email: input.email.toLowerCase() }, { phone: input.phone }],
    },
  });
  if (existing) {
    return prisma.customer.update({
      where: { id: existing.id },
      data: {
        fullName: input.fullName,
        email: input.email.toLowerCase(),
        phone: input.phone,
      },
    });
  }
  return prisma.customer.create({
    data: {
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      phone: input.phone,
    },
  });
}

export async function createBooking(input: CreateBookingInput) {
  const eventDate = toDateOnly(input.eventDate);
  const quote = await computeQuote({
    packageId: input.packageId,
    themeId: input.themeId,
    selectedOptions: input.selectedOptions,
  });

  const booking = await withDateAdvisoryLock(eventDate, async (tx) => {
    const { max, isBlocked } = await resolveCapacity(eventDate);
    if (isBlocked) {
      throw new ConflictError("BOOKING_DATE_BLOCKED", "Selected date is blocked by admin.");
    }
    const booked = await countActiveBookings(eventDate);
    if (booked >= max) {
      throw new ConflictError("BOOKING_DATE_FULL", "Selected date has reached maximum bookings.");
    }

    const customer = await findOrCreateCustomer({
      fullName: input.guestName,
      email: input.guestEmail,
      phone: input.guestPhone,
    });

    await prisma.lead.create({
      data: {
        customerId: customer.id,
        name: input.guestName,
        email: input.guestEmail.toLowerCase(),
        phone: input.guestPhone,
        source: LeadSource.OTHER,
        status: LeadStatus.QUALIFIED,
        interestArea: "BOOKING",
        message: `Booking started for ${quote.themeTitle} / ${quote.packageTitle}`,
      },
    });

    const bookingCode = await nextBookingCode();
    const created = await tx.booking.create({
      data: {
        bookingCode,
        customerId: customer.id,
        themeId: input.themeId,
        packageId: input.packageId,
        eventDate,
        status: BookingStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PENDING,
        basePriceInPaise: quote.basePriceInPaise,
        customizationTotalInPaise: quote.customizationTotalInPaise,
        gstInPaise: quote.gstInPaise,
        totalPriceInPaise: quote.totalInPaise,
        guestEmail: input.guestEmail.toLowerCase(),
        guestPhone: input.guestPhone,
        customizations: {
          create: quote.options.map((o) => ({
            optionId: o.optionId,
            quantity: o.quantity,
            unitPriceInPaise: o.unitPriceInPaise,
          })),
        },
      },
      include: {
        theme: { select: { title: true, slug: true } },
        package: { select: { title: true, slug: true } },
        customizations: true,
        customer: { select: { id: true, fullName: true } },
      },
    });

    return created;
  });

  const order = await createRazorpayOrder({
    amountInPaise: booking.totalPriceInPaise,
    receipt: booking.bookingCode,
    notes: { bookingCode: booking.bookingCode, type: "BOOKING" },
  });

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { razorpayOrderId: order.id },
    include: {
      theme: { select: { title: true, slug: true } },
      package: { select: { title: true, slug: true } },
      customizations: true,
      customer: { select: { id: true, fullName: true } },
    },
  });

  return {
    bookingCode: updated.bookingCode,
    razorpayOrderId: order.id,
    razorpayKeyId: getRazorpayPublicKey(),
    amountInPaise: updated.totalPriceInPaise,
    currency: "INR",
    booking: updated,
    quote,
  };
}

export async function getBookingByCode(bookingCode: string) {
  const booking = await prisma.booking.findFirst({
    where: { bookingCode, deletedAt: null },
    include: {
      theme: true,
      package: { include: { features: { where: { deletedAt: null } } } },
      customizations: { include: { option: true } },
      customer: true,
      invoice: true,
    },
  });
  if (!booking) throw new NotFoundError("Booking not found");
  return booking;
}

export async function getCheckoutSummary(bookingCode: string) {
  const booking = await getBookingByCode(bookingCode);
  return {
    bookingCode: booking.bookingCode,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    eventDate: booking.eventDate,
    theme: { id: booking.themeId, title: booking.theme.title, slug: booking.theme.slug },
    package: {
      id: booking.packageId,
      title: booking.package.title,
      slug: booking.package.slug,
      features: booking.package.features.map((f) => ({
        label: f.label,
        quantity: f.quantity,
      })),
    },
    customizations: booking.customizations.map((c) => ({
      label: c.option.label,
      quantity: c.quantity,
      unitPriceInPaise: c.unitPriceInPaise,
      lineTotalInPaise: c.unitPriceInPaise * c.quantity,
    })),
    pricing: {
      basePriceInPaise: booking.basePriceInPaise,
      customizationTotalInPaise: booking.customizationTotalInPaise,
      gstInPaise: booking.gstInPaise,
      totalPriceInPaise: booking.totalPriceInPaise,
    },
    guest: {
      name: booking.customer.fullName,
      email: booking.guestEmail,
      phone: booking.guestPhone,
    },
    razorpayOrderId: booking.razorpayOrderId,
  };
}

export async function cancelBooking(bookingCode: string) {
  const booking = await getBookingByCode(bookingCode);
  if (booking.status === BookingStatus.CANCELLED) return booking;
  if (booking.paymentStatus === PaymentStatus.PAID) {
    throw new ConflictError(
      "BOOKING_ALREADY_PAID",
      "Paid bookings require an admin refund before cancellation.",
    );
  }
  return prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.CANCELLED },
  });
}

const ADMIN_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  SCHEDULED: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.IN_PROGRESS],
  CONFIRMED: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED, BookingStatus.COMPLETED],
  IN_PROGRESS: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};

export async function adminUpdateBookingStatus(id: string, status: BookingStatus) {
  const booking = await prisma.booking.findFirst({ where: { id, deletedAt: null } });
  if (!booking) throw new NotFoundError("Booking not found");
  const allowed = ADMIN_STATUS_TRANSITIONS[booking.status];
  if (!allowed.includes(status)) {
    throw new ConflictError(
      "INVALID_STATUS_TRANSITION",
      `Cannot transition from ${booking.status} to ${status}`,
    );
  }
  return prisma.booking.update({
    where: { id },
    data: { status },
    include: { theme: true, package: true, customer: true },
  });
}

export async function listAdminBookings(filters: {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  themeId?: string;
  packageId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.BookingWhereInput = { deletedAt: null };
  if (filters.status) where.status = filters.status;
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
  if (filters.themeId) where.themeId = filters.themeId;
  if (filters.packageId) where.packageId = filters.packageId;
  if (filters.from || filters.to) {
    where.eventDate = {};
    if (filters.from) where.eventDate.gte = toDateOnly(filters.from);
    if (filters.to) where.eventDate.lte = toDateOnly(filters.to);
  }

  const [total, items] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: {
        theme: { select: { title: true, slug: true } },
        package: { select: { title: true, slug: true } },
        customer: { select: { fullName: true, email: true, phone: true } },
      },
      orderBy: { eventDate: "asc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);

  return { total, items };
}

export async function getCalendarBookings(view: "day" | "week" | "month", date: string) {
  const anchor = toDateOnly(date);
  let from = new Date(anchor);
  let to = new Date(anchor);

  if (view === "day") {
    // same day
  } else if (view === "week") {
    const day = anchor.getUTCDay();
    from.setUTCDate(anchor.getUTCDate() - day);
    to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 6);
  } else {
    from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
  }

  const items = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      eventDate: { gte: from, lte: to },
    },
    include: {
      theme: { select: { title: true } },
      package: { select: { title: true } },
      customer: { select: { fullName: true, phone: true } },
    },
    orderBy: { eventDate: "asc" },
  });

  return { view, from, to, items };
}

export async function notifyBookingConfirmed(bookingCode: string) {
  const booking = await getBookingByCode(bookingCode);
  await sendEmail({
    to: booking.guestEmail,
    subject: `Booking confirmed — ${booking.bookingCode}`,
    html: bookingConfirmationHtml({
      bookingCode: booking.bookingCode,
      guestName: booking.customer.fullName,
      eventDate: booking.eventDate.toISOString().slice(0, 10),
      themeTitle: booking.theme.title,
      packageTitle: booking.package.title,
      totalInPaise: booking.totalPriceInPaise,
    }),
  });
}
