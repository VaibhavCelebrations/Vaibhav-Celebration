import { Prisma } from "@prisma/client";
export declare function listPackages(): Promise<({
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
})[]>;
export declare function comparePackages(ids: string[]): Promise<({
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
})[]>;
export declare function getPackageBySlug(slug: string): Promise<{
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
    })[];
    extraServices: {
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
    displayName: string | null;
    priceInPaise: number;
    tierRank: number;
    isRecommended: boolean;
    badgeText: string | null;
    pricingUnit: string | null;
    hasGiftRegistry: boolean;
    isCustomizable: boolean;
    internalKey: string | null;
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
    displayName: string | null;
    priceInPaise: number;
    tierRank: number;
    isRecommended: boolean;
    badgeText: string | null;
    pricingUnit: string | null;
    hasGiftRegistry: boolean;
    isCustomizable: boolean;
    internalKey: string | null;
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
}>;
export type PackageMatrixSaveInput = {
    packages: Array<{
        packageId: string;
        title?: string;
        displayName?: string | null;
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
})[]>;
export declare function getPackageDetail(id: string): Promise<{
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
}>;
