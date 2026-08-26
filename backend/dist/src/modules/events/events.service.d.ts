import { Prisma } from "@prisma/client";
import { EVENT_PAGE_TEMPLATES, resolveEventTemplate } from "./event-templates";
export { EVENT_PAGE_TEMPLATES };
export declare function listEvents(upcoming?: boolean): Promise<{
    bannerMedia: import("../../lib/media-ref").MediaRef | null;
    gallery: {
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
    }[];
    template: {
        readonly id: "CLASSIC_HERO";
        readonly name: "Classic Hero";
        readonly description: "Full-bleed warm hero, traditional celebration storytelling — ideal for open days and family events.";
        readonly previewAccent: "#8B4513";
        readonly previewSecondary: "#F5E6D3";
        readonly typography: {
            readonly display: "Playfair Display";
            readonly body: "Source Sans 3";
        };
        readonly mood: "warm · traditional · trustworthy";
        readonly sections: readonly ["hero", "story", "activities", "ageGroup", "venue", "schedule", "gallery", "registration", "faq", "cta"];
    } | {
        readonly id: "EDITORIAL_SPLIT";
        readonly name: "Editorial Split";
        readonly description: "Magazine-style split layout with accent rail — premium editorial feel for bridal/preview evenings.";
        readonly previewAccent: "#1A1A1A";
        readonly previewSecondary: "#E8DFD0";
        readonly typography: {
            readonly display: "Cormorant Garamond";
            readonly body: "DM Sans";
        };
        readonly mood: "editorial · premium · refined";
        readonly sections: readonly ["heroSplit", "story", "schedule", "activities", "gallery", "registration", "faq", "cta"];
    } | {
        readonly id: "FESTIVE_IMMERSIVE";
        readonly name: "Festive Immersive";
        readonly description: "Immersive full-bleed festive campaign layout built for Google/Facebook ad landings.";
        readonly previewAccent: "#C45C26";
        readonly previewSecondary: "#FFF8F0";
        readonly typography: {
            readonly display: "Outfit";
            readonly body: "Nunito Sans";
        };
        readonly mood: "festive · bold · campaign-ready";
        readonly sections: readonly ["immersiveHero", "highlights", "venue", "schedule", "gallery", "registration", "faq", "cta"];
    };
    bannerMediaId: string | null;
    galleryMediaIds: unknown;
    pageTemplate: Parameters<typeof resolveEventTemplate>[0];
}[]>;
export declare function getEventById(id: string): Promise<{
    bannerMedia: import("../../lib/media-ref").MediaRef | null;
    gallery: {
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
    }[];
    template: {
        readonly id: "CLASSIC_HERO";
        readonly name: "Classic Hero";
        readonly description: "Full-bleed warm hero, traditional celebration storytelling — ideal for open days and family events.";
        readonly previewAccent: "#8B4513";
        readonly previewSecondary: "#F5E6D3";
        readonly typography: {
            readonly display: "Playfair Display";
            readonly body: "Source Sans 3";
        };
        readonly mood: "warm · traditional · trustworthy";
        readonly sections: readonly ["hero", "story", "activities", "ageGroup", "venue", "schedule", "gallery", "registration", "faq", "cta"];
    } | {
        readonly id: "EDITORIAL_SPLIT";
        readonly name: "Editorial Split";
        readonly description: "Magazine-style split layout with accent rail — premium editorial feel for bridal/preview evenings.";
        readonly previewAccent: "#1A1A1A";
        readonly previewSecondary: "#E8DFD0";
        readonly typography: {
            readonly display: "Cormorant Garamond";
            readonly body: "DM Sans";
        };
        readonly mood: "editorial · premium · refined";
        readonly sections: readonly ["heroSplit", "story", "schedule", "activities", "gallery", "registration", "faq", "cta"];
    } | {
        readonly id: "FESTIVE_IMMERSIVE";
        readonly name: "Festive Immersive";
        readonly description: "Immersive full-bleed festive campaign layout built for Google/Facebook ad landings.";
        readonly previewAccent: "#C45C26";
        readonly previewSecondary: "#FFF8F0";
        readonly typography: {
            readonly display: "Outfit";
            readonly body: "Nunito Sans";
        };
        readonly mood: "festive · bold · campaign-ready";
        readonly sections: readonly ["immersiveHero", "highlights", "venue", "schedule", "gallery", "registration", "faq", "cta"];
    };
    bannerMediaId: string | null;
    galleryMediaIds: unknown;
    pageTemplate: Parameters<typeof resolveEventTemplate>[0];
}>;
export declare function getEvent(slug: string): Promise<{
    bannerMedia: import("../../lib/media-ref").MediaRef | null;
    gallery: {
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
    }[];
    template: {
        readonly id: "CLASSIC_HERO";
        readonly name: "Classic Hero";
        readonly description: "Full-bleed warm hero, traditional celebration storytelling — ideal for open days and family events.";
        readonly previewAccent: "#8B4513";
        readonly previewSecondary: "#F5E6D3";
        readonly typography: {
            readonly display: "Playfair Display";
            readonly body: "Source Sans 3";
        };
        readonly mood: "warm · traditional · trustworthy";
        readonly sections: readonly ["hero", "story", "activities", "ageGroup", "venue", "schedule", "gallery", "registration", "faq", "cta"];
    } | {
        readonly id: "EDITORIAL_SPLIT";
        readonly name: "Editorial Split";
        readonly description: "Magazine-style split layout with accent rail — premium editorial feel for bridal/preview evenings.";
        readonly previewAccent: "#1A1A1A";
        readonly previewSecondary: "#E8DFD0";
        readonly typography: {
            readonly display: "Cormorant Garamond";
            readonly body: "DM Sans";
        };
        readonly mood: "editorial · premium · refined";
        readonly sections: readonly ["heroSplit", "story", "schedule", "activities", "gallery", "registration", "faq", "cta"];
    } | {
        readonly id: "FESTIVE_IMMERSIVE";
        readonly name: "Festive Immersive";
        readonly description: "Immersive full-bleed festive campaign layout built for Google/Facebook ad landings.";
        readonly previewAccent: "#C45C26";
        readonly previewSecondary: "#FFF8F0";
        readonly typography: {
            readonly display: "Outfit";
            readonly body: "Nunito Sans";
        };
        readonly mood: "festive · bold · campaign-ready";
        readonly sections: readonly ["immersiveHero", "highlights", "venue", "schedule", "gallery", "registration", "faq", "cta"];
    };
    bannerMediaId: string | null;
    galleryMediaIds: unknown;
    pageTemplate: Parameters<typeof resolveEventTemplate>[0];
}>;
export declare function createEvent(data: Prisma.EventUncheckedCreateInput): Prisma.Prisma__EventClient<{
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    themeId: string | null;
    description: string;
    bannerMediaId: string | null;
    activities: Prisma.JsonValue | null;
    ageGroup: string | null;
    venue: string | null;
    scheduleStartAt: Date | null;
    scheduleEndAt: Date | null;
    isRegistrationOpen: boolean;
    registrationFeeInPaise: number | null;
    pageTemplate: import(".prisma/client").$Enums.EventPageTemplate;
    galleryMediaIds: Prisma.JsonValue | null;
    faqItems: Prisma.JsonValue | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
}, never, import("@prisma/client/runtime/library").DefaultArgs, Prisma.PrismaClientOptions>;
export declare function updateEvent(id: string, data: Prisma.EventUncheckedUpdateInput): Promise<{
    id: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    themeId: string | null;
    description: string;
    bannerMediaId: string | null;
    activities: Prisma.JsonValue | null;
    ageGroup: string | null;
    venue: string | null;
    scheduleStartAt: Date | null;
    scheduleEndAt: Date | null;
    isRegistrationOpen: boolean;
    registrationFeeInPaise: number | null;
    pageTemplate: import(".prisma/client").$Enums.EventPageTemplate;
    galleryMediaIds: Prisma.JsonValue | null;
    faqItems: Prisma.JsonValue | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
}>;
export declare function deleteEvent(id: string): Promise<void>;
export declare function registerEvent(slug: string, input: {
    name: string;
    email: string;
    phone: string;
    guestCount?: number;
    notes?: string;
}): Promise<{
    registration: {
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        deletedAt: Date | null;
        guestCount: number | null;
        eventId: string;
        phone: string;
        notes: string | null;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        amountPaidInPaise: number | null;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
    };
    paymentRequired: boolean;
    razorpayOrderId: string;
    razorpayKeyId: string | null;
    amountInPaise: number;
} | {
    registration: {
        name: string;
        id: string;
        email: string;
        createdAt: Date;
        deletedAt: Date | null;
        guestCount: number | null;
        eventId: string;
        phone: string;
        notes: string | null;
        paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
        amountPaidInPaise: number | null;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
    };
    paymentRequired: boolean;
    razorpayOrderId?: undefined;
    razorpayKeyId?: undefined;
    amountInPaise?: undefined;
}>;
export declare function listRegistrations(eventId: string): Prisma.PrismaPromise<{
    name: string;
    id: string;
    email: string;
    createdAt: Date;
    deletedAt: Date | null;
    guestCount: number | null;
    eventId: string;
    phone: string;
    notes: string | null;
    paymentStatus: import(".prisma/client").$Enums.PaymentStatus;
    amountPaidInPaise: number | null;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
}[]>;
