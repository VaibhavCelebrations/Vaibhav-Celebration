export declare const RECYCLE_BIN_ENTITY_TYPES: readonly ["Theme", "Package", "ExtraService", "GalleryImage", "BlogPost", "Event", "Testimonial", "FAQ", "Popup", "Product", "MediaAsset", "Customer", "Lead", "ConsultationRequest", "AdminUser", "Invoice", "ThemeSampleAsset", "EventRegistration"];
export type RecycleBinEntityType = (typeof RECYCLE_BIN_ENTITY_TYPES)[number];
export type RecycleBinItem = {
    id: string;
    entityType: RecycleBinEntityType;
    /** Human-readable name/title for the record */
    displayName: string;
    deletedAt: Date;
    /** Extra context (e.g. slug, email) */
    meta: Record<string, unknown>;
};
/**
 * Returns a paginated list of all soft-deleted records.
 * If `entityType` is provided, only that type is returned.
 * Otherwise, all types are queried and merged, sorted by deletedAt desc.
 */
export declare function listDeletedItems(opts: {
    entityType?: RecycleBinEntityType;
    page?: number;
    pageSize?: number;
}): Promise<{
    items: RecycleBinItem[];
    total: number;
    page: number;
    pageSize: number;
    meta: import("../../lib/response").PaginationMeta;
}>;
/**
 * Verifies a super admin's password.
 * Returns true if correct; throws UnauthorizedError if wrong.
 */
export declare function verifySuperAdminPassword(adminId: string, password: string): Promise<true>;
/**
 * Restores a soft-deleted record by clearing deletedAt.
 * Also re-sets isActive = true for entities that have that field.
 * Writes an audit log entry.
 */
export declare function restoreItem(opts: {
    entityType: RecycleBinEntityType;
    id: string;
    adminId: string;
    adminPassword: string;
}): Promise<{
    restored: true;
    entityType: RecycleBinEntityType;
    id: string;
}>;
export declare function restoreItemsBulk(opts: {
    items: {
        entityType: RecycleBinEntityType;
        id: string;
    }[];
    adminId: string;
    adminPassword: string;
}): Promise<{
    restoredCount: number;
    errors: {
        entityType: string;
        id: string;
        error: string;
    }[];
}>;
/**
 * Permanently deletes a record from the database.
 * MediaAsset hard-delete is blocked — instruct user to remove references first.
 * Writes an audit log entry.
 */
export declare function hardDeleteItem(opts: {
    entityType: RecycleBinEntityType;
    id: string;
    adminId: string;
    adminPassword: string;
}): Promise<{
    hardDeleted: true;
    entityType: RecycleBinEntityType;
    id: string;
}>;
export declare function hardDeleteItemsBulk(opts: {
    items: {
        entityType: RecycleBinEntityType;
        id: string;
    }[];
    adminId: string;
    adminPassword: string;
}): Promise<{
    deletedCount: number;
    errors: {
        entityType: string;
        id: string;
        error: string;
    }[];
}>;
/** Returns the total count of all soft-deleted records across all entity types. */
export declare function getRecycleBinCount(): Promise<number>;
