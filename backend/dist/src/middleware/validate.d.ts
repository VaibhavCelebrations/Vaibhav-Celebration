import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
type RequestPart = "body" | "query" | "params";
/**
 * Zod validation middleware.
 * Express 5 exposes `query`/`params` as getters — we redefine them after parse
 * so route handlers still read `req.query` / `req.params` as typed data.
 */
export declare function validate(schema: ZodType, part?: RequestPart): (req: Request, _res: Response, next: NextFunction) => void;
export {};
