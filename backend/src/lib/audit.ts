import { prisma } from "../db/prisma";
import type { AuthenticatedRequest } from "../middleware/auth";

export async function writeAuditLog(input: {
  adminUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  ipAddress?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata as object | undefined,
      ipAddress: input.ipAddress ?? undefined,
    },
  });
}

export function clientIp(req: AuthenticatedRequest): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim();
  }
  return req.ip;
}
