export declare function getRefreshCookieName(): string;
export declare function loginAdmin(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<{
    accessToken: string;
    refreshToken: string;
    admin: {
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.AdminRole;
    };
}>;
/**
 * P2 — Refresh with rotation + reuse detection.
 *
 * Security model:
 *  1. Verify JWT signature → quick fail on forgery/expiry
 *  2. Look up by SHA-256 hash in DB
 *  3. If not found → unknown token → reject
 *  4. If revokedAt set → already revoked (logout or previous reuse event) → reject
 *  5. If usedAt set → token was already rotated; this is a REPLAY ATTACK
 *     → revoke entire token family immediately so ALL sessions from this
 *       login are invalidated, then reject
 *  6. Mark current token as used, issue + store new token in same family
 *  7. Return new refresh token to be set as a new HttpOnly cookie
 */
export declare function refreshAccessToken(rawRefreshToken: string, ipAddress?: string, userAgent?: string): Promise<{
    accessToken: string;
    newRefreshToken: string;
    admin: {
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.AdminRole;
    };
}>;
/**
 * Server-side logout: revoke the presented token AND the entire family so
 * concurrent sessions (e.g. other tabs that haven't refreshed yet) also expire.
 */
export declare function logoutAdmin(rawRefreshToken: string): Promise<void>;
export declare function getAdminById(id: string): Promise<{
    name: string;
    id: string;
    email: string;
    role: import(".prisma/client").$Enums.AdminRole;
    lastLoginAt: Date | null;
}>;
