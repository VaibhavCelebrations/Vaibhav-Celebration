import { StockStatusFlag } from "@prisma/client";
export declare function listProducts(q: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    theme?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: string;
}): Promise<{
    items: {
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
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function getProductBySlug(slug: string): Promise<{
    related: {
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
}>;
export declare function listCategories(): Promise<{
    name: string;
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    displayOrder: number;
}[]>;
export type AdminProductInput = {
    title: string;
    slug?: string;
    sku: string;
    description: string;
    priceInPaise: number;
    compareAtPriceInPaise?: number | null;
    personalizationEnabled?: boolean;
    personalizationCostInPaise?: number;
    isActive?: boolean;
    minOrderQuantity?: number;
    maxOrderQuantity?: number | null;
    initialQuantity?: number;
    lowStockThreshold?: number;
    categoryIds?: string[];
    themeIds?: string[];
    imageMediaIds?: string[];
    personalizationFields?: Array<{
        fieldKey: string;
        label: string;
        fieldType: string;
        isRequired?: boolean;
        maxLength?: number;
    }>;
};
export declare function adminListProducts(q: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: string;
    category?: string;
    theme?: string;
    sort?: string;
    dir?: "asc" | "desc";
}): Promise<{
    items: {
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
    total: number;
    page: number;
    pageSize: number;
}>;
export declare function adminGetProduct(id: string): Promise<{
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
}>;
export declare function createProduct(input: AdminProductInput): Promise<{
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
}>;
export declare function updateProduct(id: string, input: Partial<AdminProductInput>): Promise<{
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
}>;
export declare function deleteProduct(id: string): Promise<void>;
export declare function adminListCategories(): Promise<{
    name: string;
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    displayOrder: number;
}[]>;
export declare function createCategory(input: {
    name: string;
    slug?: string;
    displayOrder?: number;
    isActive?: boolean;
}): Promise<{
    name: string;
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    displayOrder: number;
}>;
export declare function updateCategory(id: string, input: {
    name?: string;
    slug?: string;
    displayOrder?: number;
    isActive?: boolean;
}): Promise<{
    name: string;
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    displayOrder: number;
}>;
export declare function deleteCategory(id: string): Promise<void>;
export { StockStatusFlag };
