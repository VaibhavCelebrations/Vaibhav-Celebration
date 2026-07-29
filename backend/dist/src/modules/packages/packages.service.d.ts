import { Prisma } from "@prisma/client";
export declare function listPackages(): Promise<({
    serviceItems: ({
        extraService: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            displayOrder: number;
            description: string | null;
            label: string;
            requirements: string | null;
            customizationPriceInPaise: number;
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
    priceInPaise: number;
    tierRank: number;
    isRecommended: boolean;
    isCustomizable: boolean;
})[]>;
export declare function comparePackages(ids: string[]): Promise<({
    serviceItems: ({
        extraService: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            displayOrder: number;
            description: string | null;
            label: string;
            requirements: string | null;
            customizationPriceInPaise: number;
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
    priceInPaise: number;
    tierRank: number;
    isRecommended: boolean;
    isCustomizable: boolean;
})[]>;
export declare function getPackageBySlug(slug: string): Promise<{
    serviceItems: ({
        extraService: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            displayOrder: number;
            description: string | null;
            label: string;
            requirements: string | null;
            customizationPriceInPaise: number;
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
    priceInPaise: number;
    tierRank: number;
    isRecommended: boolean;
    isCustomizable: boolean;
}>;
export declare function getPackageMatrix(): Promise<{
    packages: ({
        serviceItems: ({
            extraService: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
                displayOrder: number;
                description: string | null;
                label: string;
                requirements: string | null;
                customizationPriceInPaise: number;
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
        priceInPaise: number;
        tierRank: number;
        isRecommended: boolean;
        isCustomizable: boolean;
    })[];
    extraServices: {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        displayOrder: number;
        description: string | null;
        label: string;
        requirements: string | null;
        customizationPriceInPaise: number;
    }[];
}>;
export declare const createPackage: (data: Prisma.PackageUncheckedCreateInput) => Promise<{
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    displayOrder: number;
    description: string | null;
    priceInPaise: number;
    tierRank: number;
    isRecommended: boolean;
    isCustomizable: boolean;
}>;
export declare function updatePackage(id: string, data: Prisma.PackageUncheckedUpdateInput): Promise<{
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    displayOrder: number;
    description: string | null;
    priceInPaise: number;
    tierRank: number;
    isRecommended: boolean;
    isCustomizable: boolean;
}>;
export declare function deletePackage(id: string): Promise<void>;
export type ServiceItemInput = {
    extraServiceId: string;
    isIncluded: boolean;
    displayOrder?: number;
};
export type ExtraServicePriceInput = {
    id: string;
    customizationPriceInPaise: number;
};
/** Replace the full service-item matrix for one package. */
export declare function replacePackageServiceItems(packageId: string, items: ServiceItemInput[]): Promise<{
    serviceItems: ({
        extraService: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            displayOrder: number;
            description: string | null;
            label: string;
            requirements: string | null;
            customizationPriceInPaise: number;
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
    priceInPaise: number;
    tierRank: number;
    isRecommended: boolean;
    isCustomizable: boolean;
}>;
export type PackageMatrixSaveInput = {
    packages: Array<{
        packageId: string;
        title?: string;
        description?: string | null;
        priceInPaise?: number;
        isRecommended?: boolean;
        isActive?: boolean;
        isCustomizable?: boolean;
        items: ServiceItemInput[];
    }>;
    extraServices?: ExtraServicePriceInput[];
};
/** Bulk-save matrix for all packages at once (Fiverr-style admin UI). */
export declare function savePackageMatrix({ packages, extraServices }: PackageMatrixSaveInput): Promise<({
    serviceItems: ({
        extraService: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            displayOrder: number;
            description: string | null;
            label: string;
            requirements: string | null;
            customizationPriceInPaise: number;
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
    priceInPaise: number;
    tierRank: number;
    isRecommended: boolean;
    isCustomizable: boolean;
})[]>;
export declare function getPackageDetail(id: string): Promise<{
    serviceItems: ({
        extraService: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
            displayOrder: number;
            description: string | null;
            label: string;
            requirements: string | null;
            customizationPriceInPaise: number;
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
    priceInPaise: number;
    tierRank: number;
    isRecommended: boolean;
    isCustomizable: boolean;
}>;
