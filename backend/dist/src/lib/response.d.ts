import type { Response } from "express";
export type PaginationMeta = {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
};
export declare function ok<T>(res: Response, data: T, meta?: Record<string, unknown>, status?: number): Response<any, Record<string, any>>;
export declare function created<T>(res: Response, data: T, meta?: Record<string, unknown>): Response<any, Record<string, any>>;
export declare function paginationMeta(page: number, pageSize: number, total: number): PaginationMeta;
export declare function parsePagination(query: {
    page?: number;
    pageSize?: number;
}): {
    page: number;
    pageSize: number;
    skip: number;
    take: number;
};
