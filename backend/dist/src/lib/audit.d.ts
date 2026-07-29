import type { AuthenticatedRequest } from "../middleware/auth";
export declare function writeAuditLog(input: {
    adminUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: unknown;
    ipAddress?: string | null;
}): Promise<{
    metadata: import("@prisma/client/runtime/library").JsonValue | null;
    id: string;
    createdAt: Date;
    adminUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    ipAddress: string | null;
}>;
export declare function clientIp(req: AuthenticatedRequest): string | undefined;
