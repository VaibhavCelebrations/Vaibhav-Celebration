import { Prisma } from "@prisma/client";
export declare const listPublishedPosts: () => Promise<({
    tags: ({
        tag: {
            name: string;
            id: string;
        };
    } & {
        tagId: string;
        blogPostId: string;
    })[];
    categories: ({
        category: {
            name: string;
            id: string;
        };
    } & {
        blogPostId: string;
        categoryId: string;
    })[];
} & {
    status: import(".prisma/client").$Enums.BlogStatus;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    featuredImageId: string | null;
    contentHtml: string;
    excerpt: string | null;
    authorName: string | null;
    publishedAt: Date | null;
    isFeatured: boolean;
} & {
    [x: string]: import("../../lib/media-ref").MediaRef | null;
})[]>;
export declare function getPublishedPost(slug: string): Promise<{
    featuredImage: import("../../lib/media-ref").MediaRef | null;
    tags: ({
        tag: {
            name: string;
            id: string;
        };
    } & {
        tagId: string;
        blogPostId: string;
    })[];
    categories: ({
        category: {
            name: string;
            id: string;
        };
    } & {
        blogPostId: string;
        categoryId: string;
    })[];
    status: import(".prisma/client").$Enums.BlogStatus;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    featuredImageId: string | null;
    contentHtml: string;
    excerpt: string | null;
    authorName: string | null;
    publishedAt: Date | null;
    isFeatured: boolean;
}>;
export declare function createPost(data: Prisma.BlogPostUncheckedCreateInput, categoryIds: string[], tagIds: string[]): Promise<{
    featuredImage: import("../../lib/media-ref").MediaRef | null;
    tags: ({
        tag: {
            name: string;
            id: string;
        };
    } & {
        tagId: string;
        blogPostId: string;
    })[];
    categories: ({
        category: {
            name: string;
            id: string;
        };
    } & {
        blogPostId: string;
        categoryId: string;
    })[];
    status: import(".prisma/client").$Enums.BlogStatus;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    featuredImageId: string | null;
    contentHtml: string;
    excerpt: string | null;
    authorName: string | null;
    publishedAt: Date | null;
    isFeatured: boolean;
}>;
export declare function updatePost(id: string, data: Prisma.BlogPostUncheckedUpdateInput, categoryIds?: string[], tagIds?: string[]): Promise<{
    featuredImage: import("../../lib/media-ref").MediaRef | null;
    tags: ({
        tag: {
            name: string;
            id: string;
        };
    } & {
        tagId: string;
        blogPostId: string;
    })[];
    categories: ({
        category: {
            name: string;
            id: string;
        };
    } & {
        blogPostId: string;
        categoryId: string;
    })[];
    status: import(".prisma/client").$Enums.BlogStatus;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    featuredImageId: string | null;
    contentHtml: string;
    excerpt: string | null;
    authorName: string | null;
    publishedAt: Date | null;
    isFeatured: boolean;
}>;
export declare function deletePost(id: string): Promise<void>;
export declare function getPostById(id: string): Promise<{
    featuredImage: import("../../lib/media-ref").MediaRef | null;
    tags: ({
        tag: {
            name: string;
            id: string;
        };
    } & {
        tagId: string;
        blogPostId: string;
    })[];
    categories: ({
        category: {
            name: string;
            id: string;
        };
    } & {
        blogPostId: string;
        categoryId: string;
    })[];
    status: import(".prisma/client").$Enums.BlogStatus;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    featuredImageId: string | null;
    contentHtml: string;
    excerpt: string | null;
    authorName: string | null;
    publishedAt: Date | null;
    isFeatured: boolean;
}>;
export declare function listCategories(): Prisma.PrismaPromise<{
    name: string;
    id: string;
}[]>;
export declare function listTags(): Prisma.PrismaPromise<{
    name: string;
    id: string;
}[]>;
export declare function createCategory(name: string): Promise<{
    name: string;
    id: string;
}>;
export declare function createTag(name: string): Promise<{
    name: string;
    id: string;
}>;
export declare function updateCategory(id: string, name: string): Promise<{
    name: string;
    id: string;
}>;
export declare function updateTag(id: string, name: string): Promise<{
    name: string;
    id: string;
}>;
export declare function deleteCategory(id: string): Promise<{
    name: string;
    id: string;
}>;
export declare function deleteTag(id: string): Promise<{
    name: string;
    id: string;
}>;
