import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "./auth";
export type GuestJwtPayload = {
    sub: string;
    referenceType: string;
    email: string;
    type: "guest";
};
export type GuestAuthenticatedRequest = AuthenticatedRequest & {
    guest?: GuestJwtPayload;
};
export declare function requireGuest(req: GuestAuthenticatedRequest, _res: Response, next: NextFunction): void;
/** Ensure guest token is scoped to the path param reference code */
export declare function requireGuestScope(paramName: string): (req: GuestAuthenticatedRequest, _res: Response, next: NextFunction) => void;
export declare function signGuestToken(payload: Omit<GuestJwtPayload, "type">): string;
