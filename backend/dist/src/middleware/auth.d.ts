import type { NextFunction, Request, Response } from "express";
import type { AdminRole } from "@prisma/client";
export type AdminJwtPayload = {
    sub: string;
    email: string;
    role: AdminRole;
    type: "access";
};
export type AuthenticatedRequest = Request & {
    admin?: AdminJwtPayload;
};
export declare function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction): void;
export declare function requireRoles(...roles: AdminRole[]): (req: AuthenticatedRequest, _res: Response, next: NextFunction) => void;
