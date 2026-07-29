/**
 * Design metadata for the 3 fixed event landing-page templates.
 * Frontend renders one of these layouts; admin picks via Event.pageTemplate.
 * This is template-based (SOW 10), not a page-builder.
 */
export declare const EVENT_PAGE_TEMPLATES: readonly [{
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
}, {
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
}, {
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
}];
export type EventPageTemplateId = (typeof EVENT_PAGE_TEMPLATES)[number]["id"];
export declare function resolveEventTemplate(id: string): {
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
