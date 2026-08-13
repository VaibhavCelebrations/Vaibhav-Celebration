import type { NextFunction, Request, Response } from "express";
export type CustomerJwtPayload = {
    sub: string;
    email: string;
    type: "customer_access";
};
export type CustomerAuthenticatedRequest = Request & {
    customer?: CustomerJwtPayload;
};
export declare const CUSTOMER_ACCESS_COOKIE = "vbc_customer_access";
export declare const CUSTOMER_SESSION_COOKIE = "vbc_customer_session";
/**
 * Verifies the httpOnly access-token cookie. Unlike the admin panel (Bearer
 * header + localStorage), the storefront never touches the token in JS —
 * every request just needs `credentials: "include"`. This eliminates XSS
 * token theft as an attack vector entirely for customer accounts.
 */
export declare function requireCustomer(req: CustomerAuthenticatedRequest, _res: Response, next: NextFunction): void;
/** Best-effort — attaches req.customer if a valid cookie is present, never rejects. */
export declare function optionalCustomer(req: CustomerAuthenticatedRequest, _res: Response, next: NextFunction): void;
