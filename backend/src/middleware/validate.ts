import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type RequestPart = "body" | "query" | "params";

/**
 * Zod validation middleware.
 * Express 5 exposes `query`/`params` as getters — we redefine them after parse
 * so route handlers still read `req.query` / `req.params` as typed data.
 */
export function validate(schema: ZodType, part: RequestPart = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(result.error);
    }

    if (part === "body") {
      req.body = result.data;
    } else {
      Object.defineProperty(req, part, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    return next();
  };
}
