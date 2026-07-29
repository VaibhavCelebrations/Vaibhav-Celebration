export declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details?: unknown | undefined;
    constructor(code: string, message: string, statusCode?: number, details?: unknown | undefined);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string);
}
export declare class ValidationError extends AppError {
    constructor(message?: string, details?: unknown);
}
export declare class ConflictError extends AppError {
    constructor(code: string, message: string, details?: unknown);
}
export declare class RateLimitedError extends AppError {
    constructor(message?: string, code?: string);
}
