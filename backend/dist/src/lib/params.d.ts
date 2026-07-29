import type { Request } from "express";
/** Express 5 types params as string | string[] | undefined — normalize to string */
export declare function param(req: Request, name: string): string;
export declare function queryString(req: Request, name: string): string | undefined;
