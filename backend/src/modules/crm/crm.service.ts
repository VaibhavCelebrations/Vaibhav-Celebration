import { LeadSource, LeadStatus, type Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";

export async function createContactLead(input: {
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  interestArea?: string;
}) {
  return prisma.lead.create({
    data: {
      name: input.name,
      email: input.email?.toLowerCase(),
      phone: input.phone,
      message: input.message,
      interestArea: input.interestArea,
      source: LeadSource.CONTACT_FORM,
      status: LeadStatus.NEW,
    },
  });
}

export async function listLeads(filters: {
  status?: LeadStatus;
  source?: LeadSource;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.LeadWhereInput = { deletedAt: null };
  if (filters.status) where.status = filters.status;
  if (filters.source) where.source = filters.source;

  const [total, items] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);
  return { total, items };
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  const lead = await prisma.lead.findFirst({ where: { id, deletedAt: null } });
  if (!lead) throw new NotFoundError("Lead not found");
  return prisma.lead.update({ where: { id }, data: { status } });
}

export async function listCustomers(filters: {
  search?: string;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.CustomerWhereInput = { deletedAt: null };
  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search } },
    ];
  }
  const [total, items] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);
  return { total, items };
}

export async function getCustomer360(id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      bookings: {
        where: { deletedAt: null },
        include: { theme: true, package: true },
        orderBy: { createdAt: "desc" },
      },
      consultations: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      invoices: { where: { deletedAt: null }, orderBy: { issuedAt: "desc" } },
      leads: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) throw new NotFoundError("Customer not found");
  return customer;
}

export async function addCustomerNote(input: {
  customerId: string;
  authorAdminUserId: string;
  note: string;
}) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, deletedAt: null },
  });
  if (!customer) throw new NotFoundError("Customer not found");
  return prisma.customerNote.create({ data: input });
}
