"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContactLead = createContactLead;
exports.listLeads = listLeads;
exports.updateLeadStatus = updateLeadStatus;
exports.listCustomers = listCustomers;
exports.getCustomer360 = getCustomer360;
exports.addCustomerNote = addCustomerNote;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
async function createContactLead(input) {
    return prisma_1.prisma.lead.create({
        data: {
            name: input.name,
            email: input.email?.toLowerCase(),
            phone: input.phone,
            message: input.message,
            interestArea: input.interestArea,
            source: client_1.LeadSource.CONTACT_FORM,
            status: client_1.LeadStatus.NEW,
        },
    });
}
async function listLeads(filters) {
    const where = { deletedAt: null };
    if (filters.status)
        where.status = filters.status;
    if (filters.source)
        where.source = filters.source;
    if (filters.search) {
        where.OR = [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.prisma.lead.count({ where }),
        prisma_1.prisma.lead.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (filters.page - 1) * filters.pageSize,
            take: filters.pageSize,
        }),
    ]);
    return { total, items };
}
async function updateLeadStatus(id, status) {
    const lead = await prisma_1.prisma.lead.findFirst({ where: { id, deletedAt: null } });
    if (!lead)
        throw new errors_1.NotFoundError("Lead not found");
    return prisma_1.prisma.lead.update({ where: { id }, data: { status } });
}
async function listCustomers(filters) {
    const where = { deletedAt: null };
    if (filters.search) {
        where.OR = [
            { fullName: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.prisma.customer.count({ where }),
        prisma_1.prisma.customer.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (filters.page - 1) * filters.pageSize,
            take: filters.pageSize,
        }),
    ]);
    return { total, items };
}
async function getCustomer360(id) {
    const customer = await prisma_1.prisma.customer.findFirst({
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
    if (!customer)
        throw new errors_1.NotFoundError("Customer not found");
    return customer;
}
async function addCustomerNote(input) {
    const customer = await prisma_1.prisma.customer.findFirst({
        where: { id: input.customerId, deletedAt: null },
    });
    if (!customer)
        throw new errors_1.NotFoundError("Customer not found");
    return prisma_1.prisma.customerNote.create({ data: input });
}
//# sourceMappingURL=crm.service.js.map