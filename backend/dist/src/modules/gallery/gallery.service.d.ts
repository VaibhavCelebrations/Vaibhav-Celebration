import { Prisma } from "@prisma/client";
export declare function ensureGalleryTag(name: string): Promise<{
    name: string;
    id: string;
}>;
export declare function listGalleryTags(): Promise<({
    _count: {
        images: number;
    };
} & {
    name: string;
    id: string;
})[]>;
export declare function listGallery(tag?: string, themeId?: string): Promise<({
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
    tags: ({
        tag: {
            name: string;
            id: string;
        };
    } & {
        galleryImageId: string;
        tagId: string;
    })[];
    theme: {
        id: string;
        title: string;
        slug: string;
    } | null;
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
})[]>;
export declare function createGalleryImage(data: Prisma.GalleryImageUncheckedCreateInput, tagIds?: string[], tagNames?: string[]): Promise<{
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
    tags: ({
        tag: {
            name: string;
            id: string;
        };
    } & {
        galleryImageId: string;
        tagId: string;
    })[];
    theme: {
        id: string;
        title: string;
        slug: string;
    } | null;
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
}>;
export declare function updateGalleryImage(id: string, data: Prisma.GalleryImageUncheckedUpdateInput, tagIds?: string[], tagNames?: string[]): Promise<{
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
    tags: ({
        tag: {
            name: string;
            id: string;
        };
    } & {
        galleryImageId: string;
        tagId: string;
    })[];
    theme: {
        id: string;
        title: string;
        slug: string;
    } | null;
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
}>;
export declare function deleteGalleryImage(id: string): Promise<void>;
/** Ensures a GalleryTag exists for a theme title (used on theme create/update). */
export declare function syncThemeGalleryTag(themeTitle: string, previousTitle?: string | null): Promise<{
    name: string;
    id: string;
}>;
/** Removes theme-linked gallery tag and clears themeId on images when a theme is archived. */
export declare function removeThemeGalleryTag(themeId: string, themeTitle: string): Promise<void>;
