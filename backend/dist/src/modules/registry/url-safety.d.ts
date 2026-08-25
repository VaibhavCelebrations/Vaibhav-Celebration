export declare function isPrivateIp(ip: string): boolean;
export declare function normalizeHttpUrl(raw: string): URL;
export declare function assertSafePublicUrl(raw: string): Promise<URL>;
export declare function resolveMaybeRelativeUrl(value: string | undefined, base: URL): string | null;
