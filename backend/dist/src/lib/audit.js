"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAuditLog = writeAuditLog;
exports.clientIp = clientIp;
const prisma_1 = require("../db/prisma");
async function writeAuditLog(input) {
    return prisma_1.prisma.auditLog.create({
        data: {
            adminUserId: input.adminUserId,
            action: input.action,
            entityType: input.entityType,
            entityId: input.entityId,
            metadata: input.metadata,
            ipAddress: input.ipAddress ?? undefined,
        },
    });
}
function clientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
        return forwarded.split(",")[0]?.trim();
    }
    return req.ip;
}
//# sourceMappingURL=audit.js.map