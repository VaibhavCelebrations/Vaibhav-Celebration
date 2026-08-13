"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultPageSections = void 0;
exports.isValidPageKey = isValidPageKey;
exports.getPageContent = getPageContent;
exports.listPageContent = listPageContent;
exports.upsertPageContent = upsertPageContent;
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const media_ref_1 = require("../../lib/media-ref");
const PAGE_KEYS = ["home", "about", "contact"];
function isValidPageKey(key) {
    return PAGE_KEYS.includes(key);
}
async function loadMediaById(id) {
    const asset = await prisma_1.prisma.mediaAsset.findFirst({
        where: { id, deletedAt: null },
    });
    return (0, media_ref_1.toMediaRef)(asset);
}
async function getPageContent(pageKey) {
    if (!isValidPageKey(pageKey))
        throw new errors_1.NotFoundError("Page not found");
    let row = await prisma_1.prisma.pageContent.findUnique({ where: { pageKey } });
    if (!row) {
        row = await prisma_1.prisma.pageContent.create({
            data: { pageKey, sections: exports.defaultPageSections[pageKey] },
        });
    }
    const sections = await (0, media_ref_1.resolveMediaInJson)(row.sections, loadMediaById);
    return { pageKey: row.pageKey, sections, updatedAt: row.updatedAt };
}
async function listPageContent() {
    const rows = await prisma_1.prisma.pageContent.findMany({
        orderBy: { pageKey: "asc" },
    });
    return rows;
}
async function upsertPageContent(pageKey, sections) {
    if (!isValidPageKey(pageKey))
        throw new errors_1.NotFoundError("Invalid page key");
    return prisma_1.prisma.pageContent.upsert({
        where: { pageKey },
        create: { pageKey, sections },
        update: { sections },
    });
}
exports.defaultPageSections = {
    home: {
        hero: {
            eyebrow: "We Create, You Celebrate ♡",
            headline: "Thoughtfully Curated Kids Celebrations & Personalized Birthday Experiences",
            headlineAccent: "Personalized Birthday Experiences",
            subheadline: "Creating customized kids birthday celebrations, milestone moments, themed experiences, personalized return gifts, and memorable celebrations designed around every child's unique story.",
            primaryCta: { label: "Explore Themes", href: "/themes" },
            secondaryCta: { label: "Let's Plan Together", href: "/consultation" },
            backgroundImage: { mediaId: "" },
        },
        deliverables: {
            title: "Everything You Need for a Perfect Celebration",
            subtitle: "From theme to return gifts — we handle every detail.",
        },
        ourStory: {
            title: "Our Story",
            paragraphs: [
                "Vaibhav Celebrations was born from a simple belief: every child deserves a celebration as unique as they are.",
                "We combine creative themes, thoughtful planning, and premium execution to create moments families cherish forever.",
            ],
        },
        ctaBand: {
            headline: "Ready to Plan Something Special?",
            subheadline: "Book a free consultation and let's bring your vision to life.",
            ctaLabel: "Book Free Consultation",
            ctaHref: "/consultation",
        },
    },
    about: {
        hero: {
            title: "About Vaibhav Celebrations",
            subtitle: "Creating magical moments for families across Delhi NCR since day one.",
        },
        story: {
            title: "Our Journey",
            paragraphs: [
                "What started as a passion for creating beautiful birthday experiences has grown into a full-service celebration studio.",
                "Today, we serve families who want more than a party — they want a story their child will remember forever.",
            ],
        },
        values: {
            title: "What We Stand For",
            items: [
                {
                    title: "Personalization",
                    description: "Every celebration is tailored to your child's personality and interests.",
                },
                {
                    title: "Quality",
                    description: "Premium materials, professional execution, and attention to every detail.",
                },
                {
                    title: "Trust",
                    description: "Transparent pricing, reliable timelines, and a team that cares deeply.",
                },
            ],
        },
    },
    contact: {
        hero: {
            title: "Get in Touch",
            subtitle: "We'd love to hear about your celebration plans.",
        },
        info: {
            phone: "+91 98765 43210",
            email: "hello@vaibhavcelebrations.in",
            address: "Vaibhav Farmhouse, Near Surajkund, Faridabad, Haryana 121009",
            hours: "Mon–Sat, 10 AM – 7 PM",
        },
        formLabels: {
            name: "Your Name",
            email: "Email Address",
            phone: "Phone Number",
            message: "Tell us about your celebration",
            submit: "Send Message",
        },
        mapEmbedUrl: "",
    },
};
//# sourceMappingURL=pages.service.js.map