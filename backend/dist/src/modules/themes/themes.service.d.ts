import { Prisma, SampleAssetType } from "@prisma/client";
export declare function listThemes(search?: string, tag?: string): Promise<({
    heroImage: {
        type: string;
        cdnKey: string;
        sizeBytes: number | null;
        url: string;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        altText: string | null;
        category: string | null;
        folder: string | null;
        width: number | null;
        height: number | null;
        uploadedByAdminUserId: string | null;
    } | null;
} & {
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    shortDescription: string;
    storyDescription: string | null;
    audienceNote: string | null;
    heroImageId: string | null;
    displayOrder: number;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageId: string | null;
})[]>;
export declare function getThemeBySlug(slug: string): Promise<{
    heroImage: {
        type: string;
        cdnKey: string;
        sizeBytes: number | null;
        url: string;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        altText: string | null;
        category: string | null;
        folder: string | null;
        width: number | null;
        height: number | null;
        uploadedByAdminUserId: string | null;
    } | null;
    galleryImages: ({
        media: {
            type: string;
            cdnKey: string;
            sizeBytes: number | null;
            url: string;
            id: string;
            createdAt: Date;
            deletedAt: Date | null;
            altText: string | null;
            category: string | null;
            folder: string | null;
            width: number | null;
            height: number | null;
            uploadedByAdminUserId: string | null;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        deletedAt: Date | null;
        altText: string;
        displayOrder: number;
        themeId: string | null;
        mediaId: string;
        caption: string | null;
        ctaType: import(".prisma/client").$Enums.GalleryCtaType;
        ctaTargetSlug: string | null;
    })[];
    packages: ({
        package: {
            serviceItems: ({
                extraService: {
                    id: string;
                    isActive: boolean;
                    createdAt: Date;
                    updatedAt: Date;
                    deletedAt: Date | null;
                    category: import(".prisma/client").$Enums.ExtraServiceCategory | null;
                    slug: string | null;
                    displayOrder: number;
                    description: string | null;
                    label: string;
                    requirements: string | null;
                    customizationPriceInPaise: number;
                    pricingMode: import(".prisma/client").$Enums.PricingMode | null;
                    locationScope: import(".prisma/client").$Enums.LocationScope;
                    choiceCount: number | null;
                };
            } & {
                id: string;
                displayOrder: number;
                packageId: string;
                extraServiceId: string;
                isIncluded: boolean;
            })[];
        } & {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            title: string;
            slug: string;
            displayOrder: number;
            description: string | null;
            displayName: string | null;
            priceInPaise: number;
            tierRank: number;
            isRecommended: boolean;
            badgeText: string | null;
            pricingUnit: string | null;
            hasGiftRegistry: boolean;
            isCustomizable: boolean;
            internalKey: string | null;
        };
    } & {
        id: string;
        isActive: boolean;
        themeId: string;
        packageId: string;
        priceOverrideInPaise: number | null;
    })[];
    sampleAssets: ({
        media: {
            type: string;
            cdnKey: string;
            sizeBytes: number | null;
            url: string;
            id: string;
            createdAt: Date;
            deletedAt: Date | null;
            altText: string | null;
            category: string | null;
            folder: string | null;
            width: number | null;
            height: number | null;
            uploadedByAdminUserId: string | null;
        };
    } & {
        type: import(".prisma/client").$Enums.SampleAssetType;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        title: string;
        displayOrder: number;
        themeId: string;
        mediaId: string;
        description: string | null;
    })[];
} & {
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    shortDescription: string;
    storyDescription: string | null;
    audienceNote: string | null;
    heroImageId: string | null;
    displayOrder: number;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageId: string | null;
}>;
export declare function createTheme(data: Prisma.ThemeUncheckedCreateInput): Promise<{
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    shortDescription: string;
    storyDescription: string | null;
    audienceNote: string | null;
    heroImageId: string | null;
    displayOrder: number;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageId: string | null;
}>;
export declare function updateTheme(id: string, data: Prisma.ThemeUncheckedUpdateInput): Promise<{
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    shortDescription: string;
    storyDescription: string | null;
    audienceNote: string | null;
    heroImageId: string | null;
    displayOrder: number;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageId: string | null;
}>;
export declare function deleteTheme(id: string): Promise<void>;
export declare function addSampleAsset(themeId: string, data: {
    type: SampleAssetType;
    title: string;
    mediaId: string;
    description?: string;
    displayOrder?: number;
}): Promise<{
    type: import(".prisma/client").$Enums.SampleAssetType;
    id: string;
    createdAt: Date;
    deletedAt: Date | null;
    title: string;
    displayOrder: number;
    themeId: string;
    mediaId: string;
    description: string | null;
}>;
export declare function reorderThemes(items: Array<{
    id: string;
    displayOrder: number;
}>): Promise<void>;
export declare function setThemePackages(themeId: string, links: Array<{
    packageId: string;
    priceOverrideInPaise?: number | null;
    isActive?: boolean;
}>): Promise<void>;
export declare function deleteSampleAsset(themeId: string, assetId: string): Promise<void>;
/**
 * Sync the 'gallery' display images for a theme (Option C).
 * The heroImage counts as image #1; this manages up to 4 additional gallery images
 * stored as ThemeSampleAsset rows with type=OTHER and title='gallery-image'.
 * Maximum 4 extra images (so total with hero ≤ 5).
 */
export declare function syncThemeGalleryImages(themeId: string, mediaIds: string[]): Promise<void>;
