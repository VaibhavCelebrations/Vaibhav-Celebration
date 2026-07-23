import { ConsultationStatus, LeadSource, LeadStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";
import { getMinConsultationAdvanceDays } from "../../lib/settings";
import { consultationAckHtml, sendEmail } from "../../integrations/email/mailer";
import { toDateOnly } from "../../lib/validators";

function daysBetween(from: Date, to: Date) {
  const ms = toDateOnly(to).getTime() - toDateOnly(from).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export async function createConsultation(input: {
  name: string;
  email: string;
  phone: string;
  eventDate: string;
  childOrEventDetails?: string;
  customRequirements?: string;
}) {
  const eventDate = toDateOnly(input.eventDate);
  const advanceNoticeDays = daysBetween(new Date(), eventDate);
  const minDays = await getMinConsultationAdvanceDays();
  const belowMinimumNotice = advanceNoticeDays < minDays;

  const customer = await prisma.customer.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email: input.email.toLowerCase() }, { phone: input.phone }],
    },
  });

  const consultation = await prisma.consultationRequest.create({
    data: {
      customerId: customer?.id,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      eventDate,
      childOrEventDetails: input.childOrEventDetails,
      customRequirements: input.customRequirements,
      advanceNoticeDays,
      belowMinimumNotice,
      status: ConsultationStatus.PENDING,
    },
  });

  await prisma.lead.create({
    data: {
      customerId: customer?.id,
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone,
      source: LeadSource.CONSULTATION,
      status: LeadStatus.NEW,
      interestArea: "CONSULTATION",
      message: input.customRequirements ?? input.childOrEventDetails,
    },
  });

  void sendEmail({
    to: input.email.toLowerCase(),
    subject: "We received your consultation request",
    html: consultationAckHtml(input.name),
  });

  return {
    consultation,
    warning: belowMinimumNotice
      ? `Your event is in ${advanceNoticeDays} day(s). We recommend booking consultations at least ${minDays} days in advance.`
      : null,
    belowMinimumNotice,
    advanceNoticeDays,
    minimumAdvanceDays: minDays,
  };
}

export async function listConsultations(filters: {
  search?: string;
  status?: ConsultationStatus;
  page: number;
  pageSize: number;
}) {
  const where: any = { deletedAt: null as null };
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    // Check if the search looks like a date (yyyy-mm-dd)
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(filters.search.trim());
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search } },
      ...(isDate ? [{ eventDate: new Date(filters.search.trim()) }] : []),
    ];
  }
  const [total, items] = await Promise.all([
    prisma.consultationRequest.count({ where }),
    prisma.consultationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);
  return { total, items };
}

export async function updateConsultationStatus(id: string, status: ConsultationStatus) {
  const row = await prisma.consultationRequest.findFirst({ where: { id, deletedAt: null } });
  if (!row) throw new NotFoundError("Consultation not found");
  return prisma.consultationRequest.update({ where: { id }, data: { status } });
}
