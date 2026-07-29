import type { NextFunction, Request, Response } from "express";
export declare function idempotency(req: Request, res: Response, next: NextFunction): void;
export declare function newIdempotencyKey(): `${string}-${string}-${string}-${string}-${string}`;
