export declare function signupCustomer(input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
}): Promise<{
    accessToken: string;
    sessionToken: string;
    sessionExpiresAt: Date;
    user: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        emailVerified: boolean;
        lastLoginAt: string | null;
    };
}>;
export declare function loginCustomer(input: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
}): Promise<{
    accessToken: string;
    sessionToken: string;
    sessionExpiresAt: Date;
    user: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        emailVerified: boolean;
        lastLoginAt: string | null;
    };
}>;
export declare function refreshCustomerSession(rawToken: string, ipAddress?: string, userAgent?: string): Promise<{
    accessToken: string;
    sessionToken: string;
    sessionExpiresAt: Date;
    user: {
        id: string;
        name: string;
        email: string;
        phone: string | null;
        emailVerified: boolean;
        lastLoginAt: string | null;
    };
}>;
export declare function logoutCustomer(rawToken: string | undefined): Promise<void>;
export declare function logoutAllSessions(userId: string): Promise<void>;
export declare function getCustomerById(id: string): Promise<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emailVerified: boolean;
    lastLoginAt: string | null;
}>;
export declare function requestPasswordReset(email: string, requestIp?: string): Promise<void>;
export declare function resetPassword(rawToken: string, newPassword: string): Promise<void>;
export declare function issueEmailVerification(userId: string, email: string, name: string): Promise<void>;
export declare function verifyEmail(rawToken: string): Promise<void>;
export declare function updateCustomerProfile(userId: string, data: {
    name?: string;
    phone?: string;
}): Promise<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    emailVerified: boolean;
    lastLoginAt: string | null;
}>;
export declare function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
