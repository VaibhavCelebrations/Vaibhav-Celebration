"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_PAGE_TEMPLATES = void 0;
exports.resolveEventTemplate = resolveEventTemplate;
/**
 * Design metadata for the 3 fixed event landing-page templates.
 * Frontend renders one of these layouts; admin picks via Event.pageTemplate.
 * This is template-based (SOW 10), not a page-builder.
 */
exports.EVENT_PAGE_TEMPLATES = [
    {
        id: "CLASSIC_HERO",
        name: "Classic Hero",
        description: "Full-bleed warm hero, traditional celebration storytelling — ideal for open days and family events.",
        previewAccent: "#8B4513",
        previewSecondary: "#F5E6D3",
        typography: { display: "Playfair Display", body: "Source Sans 3" },
        mood: "warm · traditional · trustworthy",
        sections: [
            "hero",
            "story",
            "activities",
            "ageGroup",
            "venue",
            "schedule",
            "gallery",
            "registration",
            "faq",
            "cta",
        ],
    },
    {
        id: "EDITORIAL_SPLIT",
        name: "Editorial Split",
        description: "Magazine-style split layout with accent rail — premium editorial feel for bridal/preview evenings.",
        previewAccent: "#1A1A1A",
        previewSecondary: "#E8DFD0",
        typography: { display: "Cormorant Garamond", body: "DM Sans" },
        mood: "editorial · premium · refined",
        sections: [
            "heroSplit",
            "story",
            "schedule",
            "activities",
            "gallery",
            "registration",
            "faq",
            "cta",
        ],
    },
    {
        id: "FESTIVE_IMMERSIVE",
        name: "Festive Immersive",
        description: "Immersive full-bleed festive campaign layout built for Google/Facebook ad landings.",
        previewAccent: "#C45C26",
        previewSecondary: "#FFF8F0",
        typography: { display: "Outfit", body: "Nunito Sans" },
        mood: "festive · bold · campaign-ready",
        sections: [
            "immersiveHero",
            "highlights",
            "venue",
            "schedule",
            "gallery",
            "registration",
            "faq",
            "cta",
        ],
    },
];
function resolveEventTemplate(id) {
    return exports.EVENT_PAGE_TEMPLATES.find((t) => t.id === id) ?? exports.EVENT_PAGE_TEMPLATES[0];
}
//# sourceMappingURL=event-templates.js.map