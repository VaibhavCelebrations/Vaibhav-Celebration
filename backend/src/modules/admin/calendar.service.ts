import { OrderKind, PaymentStatus, RegistryStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { toDateOnly } from "../../lib/validators";

function calendarRange(view: "day" | "week" | "month", date: string) {
  const anchor = toDateOnly(date);
  let from = new Date(anchor);
  let to = new Date(anchor);

  if (view === "week") {
    const day = anchor.getUTCDay();
    from.setUTCDate(anchor.getUTCDate() - day);
    to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 6);
  } else if (view === "month") {
    from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
  }

  const fromStart = new Date(from);
  fromStart.setUTCHours(0, 0, 0, 0);
  const toEnd = new Date(to);
  toEnd.setUTCHours(23, 59, 59, 999);

  return { from, to, fromStart, toEnd };
}

export async function getAdminCalendar(view: "day" | "week" | "month", date: string) {
  const { from, to, fromStart, toEnd } = calendarRange(view, date);

  const [placedOrders, packageEvents, birthdays] = await Promise.all([
    prisma.order.findMany({
      where: {
        paymentStatus: PaymentStatus.PAID,
        placedAt: { gte: fromStart, lte: toEnd },
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        registry: { select: { registryCode: true, childOrPersonName: true } },
        packageOrder: {
          include: {
            package: { select: { title: true } },
            theme: { select: { title: true } },
          },
        },
      },
      orderBy: { placedAt: "asc" },
    }),
    prisma.order.findMany({
      where: {
        kind: OrderKind.PACKAGE,
        paymentStatus: PaymentStatus.PAID,
        eventDate: { gte: from, lte: to },
      },
      include: {
        user: { select: { name: true } },
        packageOrder: {
          include: {
            package: { select: { title: true } },
            theme: { select: { title: true } },
          },
        },
      },
      orderBy: { eventDate: "asc" },
    }),
    prisma.giftRegistry.findMany({
      where: {
        eventDate: { gte: from, lte: to },
        status: { in: [RegistryStatus.ACTIVE, RegistryStatus.CLOSED, RegistryStatus.DRAFT] },
      },
      select: {
        id: true,
        registryCode: true,
        title: true,
        occasion: true,
        eventDate: true,
        childOrPersonName: true,
        ownerDisplayName: true,
        contactPhone: true,
      },
      orderBy: { eventDate: "asc" },
    }),
  ]);

  return {
    view,
    from: from.toISOString(),
    to: to.toISOString(),
    orders: placedOrders.map((order) => ({
      id: order.id,
      orderCode: order.orderCode,
      placedAt: order.placedAt.toISOString(),
      status: order.status,
      kind: order.kind,
      totalInPaise: order.totalInPaise,
      customerName: order.user.name,
      customerEmail: order.contactEmail,
      customerPhone: order.contactPhone,
      registryCode: order.registry?.registryCode ?? null,
      isRegistryOrder: Boolean(order.registryId),
      isPackageOrder: order.kind === OrderKind.PACKAGE,
      packageTitle: order.packageOrder?.package.title ?? null,
      themeTitle: order.packageOrder?.theme.title ?? null,
      eventDate: order.eventDate?.toISOString() ?? null,
    })),
    packageEvents: packageEvents
      .filter((order) => order.eventDate)
      .map((order) => ({
        id: order.id,
        orderCode: order.orderCode,
        eventDate: order.eventDate!.toISOString(),
        customerName: order.user.name,
        packageTitle: order.packageOrder?.package.title ?? "Package",
        themeTitle: order.packageOrder?.theme.title ?? null,
        totalInPaise: order.totalInPaise,
      })),
    birthdays: birthdays
      .filter((registry) => registry.eventDate)
      .map((registry) => ({
        id: registry.id,
        registryCode: registry.registryCode,
        title: registry.title ?? registry.childOrPersonName ?? registry.ownerDisplayName ?? "Celebration",
        occasion: registry.occasion,
        eventDate: registry.eventDate!.toISOString(),
        personName: registry.childOrPersonName ?? registry.ownerDisplayName,
        contactPhone: registry.contactPhone,
      })),
  };
}
