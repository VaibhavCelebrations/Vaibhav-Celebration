import type { Request } from "express";
import { ValidationError } from "./errors";

/** Express 5 types params as string | string[] | undefined — normalize to string */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  const str = Array.isArray(value) ? value[0] : value;
  if (!str) throw new ValidationError(`Missing path param: ${name}`);
  return str;
}

export function queryString(req: Request, name: string): string | undefined {
  const value = req.query[name];
  if (value == null) return undefined;
  if (Array.isArray(value)) return String(value[0]);
  if (typeof value === "object") return undefined;
  return String(value);
}
