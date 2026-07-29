import type { Prisma } from "@prisma/client";
declare const PAGE_KEYS: readonly ["home", "about", "contact"];
export type PageKey = (typeof PAGE_KEYS)[number];
export declare function isValidPageKey(key: string): key is PageKey;
export declare function getPageContent(pageKey: string): Promise<{
    pageKey: string;
    sections: unknown;
    updatedAt: Date;
}>;
export declare function listPageContent(): Promise<{
    id: string;
    updatedAt: Date;
    pageKey: string;
    sections: Prisma.JsonValue;
}[]>;
export declare function upsertPageContent(pageKey: string, sections: Prisma.InputJsonValue): Promise<{
    id: string;
    updatedAt: Date;
    pageKey: string;
    sections: Prisma.JsonValue;
}>;
export declare const defaultPageSections: Record<PageKey, Prisma.InputJsonValue>;
export {};
