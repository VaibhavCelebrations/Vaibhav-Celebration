export declare function listCollections(q: {
    featured?: boolean;
}): Promise<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    heroImage: import("../../lib/media-ref").MediaRef | null;
    startsAt: string | null;
    endsAt: string | null;
    showOnHomepage: boolean;
    isActive: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    products: {
        id: string;
        title: string;
        slug: string;
        sku: string;
        description: string;
        priceInPaise: number;
        compareAtPriceInPaise: number | null;
        personalizationEnabled: boolean;
        personalizationCostInPaise: number;
        isActive: boolean;
        minOrderQuantity: number;
        maxOrderQuantity: number | null;
        images: {
            id: string;
            displayOrder: number;
            media: import("../../lib/media-ref").MediaRef | null;
        }[];
        categories: {
            id: string;
            name: string;
            slug: string;
        }[];
        themes: {
            id: string;
            title: string;
            slug: string;
        }[];
        personalizationFields: {
            id: string;
            fieldKey: string;
            label: string;
            fieldType: string;
            isRequired: boolean;
            maxLength: number | null;
        }[];
        stock: {
            quantityAvailable: number;
            statusFlag: import(".prisma/client").$Enums.StockStatusFlag;
            lowStockThreshold: number;
        } | null;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    }[];
    productCount: number;
}[]>;
export declare function getCollectionBySlug(slug: string): Promise<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    heroImage: import("../../lib/media-ref").MediaRef | null;
    startsAt: string | null;
    endsAt: string | null;
    showOnHomepage: boolean;
    isActive: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    products: {
        id: string;
        title: string;
        slug: string;
        sku: string;
        description: string;
        priceInPaise: number;
        compareAtPriceInPaise: number | null;
        personalizationEnabled: boolean;
        personalizationCostInPaise: number;
        isActive: boolean;
        minOrderQuantity: number;
        maxOrderQuantity: number | null;
        images: {
            id: string;
            displayOrder: number;
            media: import("../../lib/media-ref").MediaRef | null;
        }[];
        categories: {
            id: string;
            name: string;
            slug: string;
        }[];
        themes: {
            id: string;
            title: string;
            slug: string;
        }[];
        personalizationFields: {
            id: string;
            fieldKey: string;
            label: string;
            fieldType: string;
            isRequired: boolean;
            maxLength: number | null;
        }[];
        stock: {
            quantityAvailable: number;
            statusFlag: import(".prisma/client").$Enums.StockStatusFlag;
            lowStockThreshold: number;
        } | null;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    }[];
    productCount: number;
}>;
export type CollectionInput = {
    title: string;
    slug?: string;
    description?: string | null;
    heroImageId?: string | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
    showOnHomepage?: boolean;
    isActive?: boolean;
    displayOrder?: number;
    productIds?: string[];
};
export declare function adminListCollections(q: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: string;
}): Promise<{
    items: {
        id: string;
        title: string;
        slug: string;
        description: string | null;
        heroImage: import("../../lib/media-ref").MediaRef | null;
        startsAt: string | null;
        endsAt: string | null;
        showOnHomepage: boolean;
        isActive: boolean;
        displayOrder: number;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
        products: {
            id: string;
            title: string;
            slug: string;
            sku: string;
            description: string;
            priceInPaise: number;
            compareAtPriceInPaise: number | null;
            personalizationEnabled: boolean;
            personalizationCostInPaise: number;
            isActive: boolean;
            minOrderQuantity: number;
            maxOrderQuantity: number | null;
            images: {
                id: string;
                displayOrder: number;
                media: import("../../lib/media-ref").MediaRef | null;
            }[];
            categories: {
                id: string;
                name: string;
                slug: string;
            }[];
            themes: {
                id: string;
                title: string;
                slug: string;
            }[];
            personalizationFields: {
                id: string;
                fieldKey: string;
                label: string;
                fieldType: string;
                isRequired: boolean;
                maxLength: number | null;
            }[];
            stock: {
                quantityAvailable: number;
                statusFlag: import(".prisma/client").$Enums.StockStatusFlag;
                lowStockThreshold: number;
            } | null;
            createdAt: string;
            updatedAt: string;
            deletedAt: string | null;
        }[];
        productCount: number;
    }[];
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function adminGetCollection(id: string): Promise<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    heroImage: import("../../lib/media-ref").MediaRef | null;
    startsAt: string | null;
    endsAt: string | null;
    showOnHomepage: boolean;
    isActive: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    products: {
        id: string;
        title: string;
        slug: string;
        sku: string;
        description: string;
        priceInPaise: number;
        compareAtPriceInPaise: number | null;
        personalizationEnabled: boolean;
        personalizationCostInPaise: number;
        isActive: boolean;
        minOrderQuantity: number;
        maxOrderQuantity: number | null;
        images: {
            id: string;
            displayOrder: number;
            media: import("../../lib/media-ref").MediaRef | null;
        }[];
        categories: {
            id: string;
            name: string;
            slug: string;
        }[];
        themes: {
            id: string;
            title: string;
            slug: string;
        }[];
        personalizationFields: {
            id: string;
            fieldKey: string;
            label: string;
            fieldType: string;
            isRequired: boolean;
            maxLength: number | null;
        }[];
        stock: {
            quantityAvailable: number;
            statusFlag: import(".prisma/client").$Enums.StockStatusFlag;
            lowStockThreshold: number;
        } | null;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    }[];
    productCount: number;
}>;
export declare function createCollection(input: CollectionInput): Promise<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    heroImage: import("../../lib/media-ref").MediaRef | null;
    startsAt: string | null;
    endsAt: string | null;
    showOnHomepage: boolean;
    isActive: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    products: {
        id: string;
        title: string;
        slug: string;
        sku: string;
        description: string;
        priceInPaise: number;
        compareAtPriceInPaise: number | null;
        personalizationEnabled: boolean;
        personalizationCostInPaise: number;
        isActive: boolean;
        minOrderQuantity: number;
        maxOrderQuantity: number | null;
        images: {
            id: string;
            displayOrder: number;
            media: import("../../lib/media-ref").MediaRef | null;
        }[];
        categories: {
            id: string;
            name: string;
            slug: string;
        }[];
        themes: {
            id: string;
            title: string;
            slug: string;
        }[];
        personalizationFields: {
            id: string;
            fieldKey: string;
            label: string;
            fieldType: string;
            isRequired: boolean;
            maxLength: number | null;
        }[];
        stock: {
            quantityAvailable: number;
            statusFlag: import(".prisma/client").$Enums.StockStatusFlag;
            lowStockThreshold: number;
        } | null;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    }[];
    productCount: number;
}>;
export declare function updateCollection(id: string, input: Partial<CollectionInput>): Promise<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    heroImage: import("../../lib/media-ref").MediaRef | null;
    startsAt: string | null;
    endsAt: string | null;
    showOnHomepage: boolean;
    isActive: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    products: {
        id: string;
        title: string;
        slug: string;
        sku: string;
        description: string;
        priceInPaise: number;
        compareAtPriceInPaise: number | null;
        personalizationEnabled: boolean;
        personalizationCostInPaise: number;
        isActive: boolean;
        minOrderQuantity: number;
        maxOrderQuantity: number | null;
        images: {
            id: string;
            displayOrder: number;
            media: import("../../lib/media-ref").MediaRef | null;
        }[];
        categories: {
            id: string;
            name: string;
            slug: string;
        }[];
        themes: {
            id: string;
            title: string;
            slug: string;
        }[];
        personalizationFields: {
            id: string;
            fieldKey: string;
            label: string;
            fieldType: string;
            isRequired: boolean;
            maxLength: number | null;
        }[];
        stock: {
            quantityAvailable: number;
            statusFlag: import(".prisma/client").$Enums.StockStatusFlag;
            lowStockThreshold: number;
        } | null;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
    }[];
    productCount: number;
}>;
export declare function deleteCollection(id: string): Promise<void>;
