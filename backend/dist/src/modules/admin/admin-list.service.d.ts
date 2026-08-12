export type AdminListQuery = {
    page?: number;
    pageSize?: number;
    search?: string;
    sort?: string;
    dir?: "asc" | "desc";
    isActive?: string;
};
export declare function toMediaRef(media: {
    id: string;
    url: string;
    altText?: string | null;
} | null | undefined): {
    id: string;
    url: string;
    altText: string | undefined;
} | null;
export declare function listResult<T>(items: T[], total: number, page: number, pageSize: number): {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
};
export declare function adminListThemes(q: AdminListQuery): Promise<{
    items: {
        id: string;
        title: string;
        slug: string;
        shortDescription: string;
        storyDescription: string | null;
        audienceNote: string | null;
        heroImage: {
            id: string;
            url: string;
            altText: string | undefined;
        } | null;
        isActive: boolean;
        displayOrder: number;
        seoTitle: string | null;
        seoDescription: string | null;
        ogImage: import("../../lib/media-ref").MediaRef | null;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
        packageCount: number;
        galleryCount: number;
    }[];
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function adminGetTheme(id: string): Promise<{
    id: string;
    title: string;
    slug: string;
    shortDescription: string;
    storyDescription: string | null;
    audienceNote: string | null;
    heroImage: {
        id: string;
        url: string;
        altText: string | undefined;
    } | null;
    isActive: boolean;
    displayOrder: number;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImage: import("../../lib/media-ref").MediaRef | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    packageCount: number;
    galleryCount: number;
    galleryImageAssets: {
        id: string;
        media: {
            id: string;
            url: string;
            altText: string | undefined;
        } | null;
        displayOrder: number;
    }[];
    sampleAssets: {
        id: string;
        themeId: string;
        type: import(".prisma/client").$Enums.SampleAssetType;
        title: string;
        media: {
            id: string;
            url: string;
            altText: string | undefined;
        } | null;
        description: string | null;
        displayOrder: number;
        deletedAt: string | null;
    }[];
    packageLinks: {
        id: string;
        themeId: string;
        packageId: string;
        packageTitle: string;
        priceOverrideInPaise: number | null;
        isActive: boolean;
    }[];
} | null>;
export declare function adminListPackages(q: AdminListQuery): Promise<{
    items: {
        id: string;
        title: string;
        displayName: string | null;
        slug: string;
        priceInPaise: number;
        tierRank: number;
        isRecommended: boolean;
        badgeText: string | null;
        pricingUnit: string | null;
        hasGiftRegistry: boolean;
        isActive: boolean;
        isCustomizable: boolean;
        displayOrder: number;
        description: string | null;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
        serviceItemCount: number;
        includedServiceCount: number;
        themeCount: number;
    }[];
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function adminListFaqs(q: AdminListQuery & {
    category?: string;
}): Promise<{
    items: {
        id: string;
        question: string;
        answer: string;
        category: string | null;
        displayOrder: number;
        isActive: boolean;
        deletedAt: string | null;
    }[];
    total: number;
    page: number;
    pageSize: number;
}>;
