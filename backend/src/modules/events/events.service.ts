import { LeadSource, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";
import { createRazorpayOrder, getRazorpayPublicKey } from "../../integrations/razorpay/client";
import { EVENT_PAGE_TEMPLATES, resolveEventTemplate } from "./event-templates";

export { EVENT_PAGE_TEMPLATES };

const include = { theme: true } as const;

export function listEvents(upcoming?: boolean) {
  return prisma.event.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(upcoming ? { scheduleStartAt: { gte: new Date() } } : {}),
    },
    include,
    orderBy: { scheduleStartAt: "asc" },
  });
}

export async function getEvent(slug: string) {
  const item = await prisma.event.findFirst({
    where: { slug, deletedAt: null, isActive: true },
    include,
  });
  if (!item) throw new NotFoundError("Event not found");

  const galleryIds = Array.isArray(item.galleryMediaIds)
    ? (item.galleryMediaIds as string[])
    : [];
  const gallery =
    galleryIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: { id: { in: galleryIds }, deletedAt: null },
        })
      : [];

  return {
    ...item,
    gallery,
    template: resolveEventTemplate(item.pageTemplate),
  };
}

export function createEvent(data: Prisma.EventUncheckedCreateInput) {
  return prisma.event.create({ data });
}

export async function updateEvent(id: string, data: Prisma.EventUncheckedUpdateInput) {
  const result = await prisma.event.updateMany({ where: { id, deletedAt: null }, data });
  if (!result.count) throw new NotFoundError("Event not found");
  return prisma.event.findUniqueOrThrow({ where: { id } });
}

export async function deleteEvent(id: string) {
  const result = await prisma.event.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  if (!result.count) throw new NotFoundError("Event not found");
}

export async function registerEvent(
  slug: string,
  input: { name: string; email: string; phone: string; guestCount?: number; notes?: string },
) {
  const event = await prisma.event.findFirst({
    where: { slug, deletedAt: null, isActive: true, isRegistrationOpen: true },
  });
  if (!event) throw new NotFoundError("Event registration unavailable");

  const paid = (event.registrationFeeInPaise ?? 0) > 0;
  const registration = await prisma.eventRegistration.create({
    data: {
      eventId: event.id,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      guestCount: input.guestCount,
      notes: input.notes,
      paymentStatus: paid ? PaymentStatus.PENDING : PaymentStatus.NOT_REQUIRED,
      amountPaidInPaise: paid ? event.registrationFeeInPaise : null,
    },
  });

  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      source: LeadSource.EVENT_REGISTRATION,
      message: input.notes ?? `Registered for ${event.title}`,
      interestArea: "EVENT",
    },
  });

  let order = null;
  if (paid && event.registrationFeeInPaise) {
    order = await createRazorpayOrder({
      amountInPaise: event.registrationFeeInPaise,
      receipt: `EVT-${registration.id.slice(-12)}`,
      notes: { eventId: event.id, registrationId: registration.id, type: "EVENT_REGISTRATION" },
    });
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { razorpayOrderId: order.id },
    });
  }

  return {
    registration: { ...registration, razorpayOrderId: order?.id ?? null },
    lead,
    payment: order
      ? {
          razorpayOrderId: order.id,
          razorpayKeyId: getRazorpayPublicKey(),
          amountInPaise: event.registrationFeeInPaise,
        }
      : null,
  };
}

export function listRegistrations(eventId: string) {
  return prisma.eventRegistration.findMany({
    where: { eventId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
}
