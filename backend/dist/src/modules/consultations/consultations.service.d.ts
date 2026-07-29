import { ConsultationStatus } from "@prisma/client";
export declare function createConsultation(input: {
    name: string;
    email: string;
    phone: string;
    eventDate: string;
    childOrEventDetails?: string;
    customRequirements?: string;
}): Promise<{
    consultation: {
        status: import(".prisma/client").$Enums.ConsultationStatus;
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        deletedAt: Date | null;
        customerId: string | null;
        eventDate: Date;
        phone: string;
        childOrEventDetails: string | null;
        customRequirements: string | null;
        advanceNoticeDays: number;
        belowMinimumNotice: boolean;
    };
    warning: string | null;
    belowMinimumNotice: boolean;
    advanceNoticeDays: number;
    minimumAdvanceDays: number;
}>;
export declare function listConsultations(filters: {
    search?: string;
    status?: ConsultationStatus;
    page: number;
    pageSize: number;
}): Promise<{
    total: number;
    items: {
        status: import(".prisma/client").$Enums.ConsultationStatus;
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        deletedAt: Date | null;
        customerId: string | null;
        eventDate: Date;
        phone: string;
        childOrEventDetails: string | null;
        customRequirements: string | null;
        advanceNoticeDays: number;
        belowMinimumNotice: boolean;
    }[];
}>;
export declare function updateConsultationStatus(id: string, status: ConsultationStatus): Promise<{
    status: import(".prisma/client").$Enums.ConsultationStatus;
    name: string;
    id: string;
    email: string;
    createdAt: Date;
    deletedAt: Date | null;
    customerId: string | null;
    eventDate: Date;
    phone: string;
    childOrEventDetails: string | null;
    customRequirements: string | null;
    advanceNoticeDays: number;
    belowMinimumNotice: boolean;
}>;
