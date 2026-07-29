"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const CDN = "https://cdn.vaibhavcelebrations.in";
const img = (path) => `${CDN}/${path}`;
async function clearDevData() {
    const tables = [
        "AuditLog",
        "GuestVerificationToken",
        "BookingCustomization",
        "Invoice",
        "Booking",
        "ConsultationRequest",
        "Lead",
        "ChatbotSession",
        "CustomerNote",
        "Customer",
        "EventRegistration",
        "Event",
        "BlogPostTag",
        "BlogPostCategory",
        "BlogPost",
        "BlogTag",
        "BlogCategory",
        "SiteMetadata",
        "PageContent",
        "LegalPage",
        "Popup",
        "FAQ",
        "Testimonial",
        "GalleryImageTag",
        "GalleryImage",
        "GalleryTag",
        "PackageServiceItem",
        "ExtraService",
        "ThemePackage",
        "ThemeSampleAsset",
        "Theme",
        "Package",
        "MediaAsset",
        "BookingCapacityRule",
        "OperationalSetting",
        "SequenceCounter",
        "AdminRefreshToken",
        "AdminUser",
    ];
    for (const table of tables) {
        await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
    }
}
async function main() {
    console.log("Clearing existing dev data...");
    await clearDevData();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe_SuperAdmin_123!";
    const adminHash = await bcryptjs_1.default.hash(adminPassword, 12);
    const staffHash = await bcryptjs_1.default.hash("ChangeMe_Staff_123!", 12);
    // ── Admin Users ─────────────────────────────────────────────────────────────
    const superAdmin = await prisma.adminUser.create({
        data: {
            email: process.env.SEED_ADMIN_EMAIL ?? "admin@vaibhavcelebrations.in",
            passwordHash: adminHash,
            name: process.env.SEED_ADMIN_NAME ?? "Super Admin",
            role: client_1.AdminRole.SUPER_ADMIN,
            isActive: true,
            lastLoginAt: new Date(),
        },
    });
    const opsAdmin = await prisma.adminUser.create({
        data: {
            email: "operations@vaibhavcelebrations.in",
            passwordHash: staffHash,
            name: "Operations Manager",
            role: client_1.AdminRole.OPERATIONS,
            isActive: true,
        },
    });
    const contentAdmin = await prisma.adminUser.create({
        data: {
            email: "content@vaibhavcelebrations.in",
            passwordHash: staffHash,
            name: "Content Editor",
            role: client_1.AdminRole.CONTENT_EDITOR,
            isActive: true,
        },
    });
    console.log("Admin users seeded");
    // ── Sequence Counters ───────────────────────────────────────────────────────
    await prisma.sequenceCounter.createMany({
        data: [
            { key: "BOOKING-2026", lastValue: 3 },
            { key: "INVOICE-2026-27", lastValue: 3 },
        ],
    });
    // ── Operational Settings ──────────────────────────────────────────────────
    await prisma.operationalSetting.createMany({
        data: [
            { key: "gst_percent", value: "18" },
            { key: "max_bookings_per_day", value: "2" },
            { key: "min_consultation_advance_days", value: "15" },
            { key: "business_name", value: "Vaibhav Celebrations" },
            { key: "business_phone", value: "+91 98765 43210" },
            { key: "business_email", value: "hello@vaibhavcelebrations.in" },
            { key: "business_address", value: "Vaibhav Farmhouse, Near Surajkund, Faridabad, Haryana 121009" },
            { key: "whatsapp_number", value: "+919876543210" },
            { key: "instagram_url", value: "https://instagram.com/vaibhavcelebrations" },
            { key: "facebook_url", value: "https://facebook.com/vaibhavcelebrations" },
        ],
    });
    // ── Booking Capacity Rules ─────────────────────────────────────────────────
    const today = new Date();
    const blockedDate = new Date(today);
    blockedDate.setDate(blockedDate.getDate() + 45);
    const overrideDate = new Date(today);
    overrideDate.setDate(overrideDate.getDate() + 60);
    await prisma.bookingCapacityRule.createMany({
        data: [
            { scope: client_1.CapacityScope.GLOBAL_DEFAULT, maxBookingsPerDay: 2, isBlocked: false },
            {
                scope: client_1.CapacityScope.SPECIFIC_DATE,
                specificDate: blockedDate,
                maxBookingsPerDay: 0,
                isBlocked: true,
            },
            {
                scope: client_1.CapacityScope.SPECIFIC_DATE,
                specificDate: overrideDate,
                maxBookingsPerDay: 3,
                isBlocked: false,
            },
        ],
    });
    // ── Media Assets ───────────────────────────────────────────────────────────
    const mediaAssets = await Promise.all([
        prisma.mediaAsset.create({
            data: {
                cdnKey: "dev/hero-home.jpg",
                url: img("dev/hero-home.jpg"),
                type: "image/jpeg",
                altText: "Vaibhav Celebrations farmhouse venue at sunset",
                width: 1920,
                height: 1080,
                sizeBytes: 245000,
                uploadedByAdminUserId: contentAdmin.id,
            },
        }),
        prisma.mediaAsset.create({
            data: {
                cdnKey: "dev/themes/royal-mandap.jpg",
                url: img("dev/themes/royal-mandap.jpg"),
                type: "image/jpeg",
                altText: "Royal Mandap theme decoration",
                width: 1600,
                height: 900,
                uploadedByAdminUserId: contentAdmin.id,
            },
        }),
        prisma.mediaAsset.create({
            data: {
                cdnKey: "dev/themes/garden-bloom.jpg",
                url: img("dev/themes/garden-bloom.jpg"),
                type: "image/jpeg",
                altText: "Garden Bloom outdoor theme",
                width: 1600,
                height: 900,
                uploadedByAdminUserId: contentAdmin.id,
            },
        }),
        prisma.mediaAsset.create({
            data: {
                cdnKey: "dev/themes/minimal-elegance.jpg",
                url: img("dev/themes/minimal-elegance.jpg"),
                type: "image/jpeg",
                altText: "Minimal Elegance theme setup",
                width: 1600,
                height: 900,
                uploadedByAdminUserId: contentAdmin.id,
            },
        }),
        prisma.mediaAsset.create({
            data: {
                cdnKey: "dev/gallery/ceremony-1.jpg",
                url: img("dev/gallery/ceremony-1.jpg"),
                type: "image/jpeg",
                altText: "Outdoor wedding ceremony",
                width: 1200,
                height: 800,
                uploadedByAdminUserId: contentAdmin.id,
            },
        }),
        prisma.mediaAsset.create({
            data: {
                cdnKey: "dev/gallery/reception-1.jpg",
                url: img("dev/gallery/reception-1.jpg"),
                type: "image/jpeg",
                altText: "Reception dinner setup",
                width: 1200,
                height: 800,
                uploadedByAdminUserId: contentAdmin.id,
            },
        }),
        prisma.mediaAsset.create({
            data: {
                cdnKey: "dev/blog/wedding-trends.jpg",
                url: img("dev/blog/wedding-trends.jpg"),
                type: "image/jpeg",
                altText: "2026 wedding trends blog cover",
                width: 1200,
                height: 630,
                uploadedByAdminUserId: contentAdmin.id,
            },
        }),
        prisma.mediaAsset.create({
            data: {
                cdnKey: "dev/events/august-open-day.jpg",
                url: img("dev/events/august-open-day.jpg"),
                type: "image/jpeg",
                altText: "August Open Day event banner",
                width: 1920,
                height: 600,
                uploadedByAdminUserId: contentAdmin.id,
            },
        }),
        prisma.mediaAsset.create({
            data: {
                cdnKey: "dev/sample/digital-invite-royal.jpg",
                url: img("dev/sample/digital-invite-royal.jpg"),
                type: "image/jpeg",
                altText: "Royal Mandap digital invite sample",
                width: 800,
                height: 1200,
                uploadedByAdminUserId: contentAdmin.id,
            },
        }),
        prisma.mediaAsset.create({
            data: {
                cdnKey: "dev/gallery/minimal-stage.jpg",
                url: img("dev/gallery/minimal-stage.jpg"),
                type: "image/jpeg",
                altText: "Minimal elegance stage with white drapes",
                width: 1200,
                height: 800,
                uploadedByAdminUserId: contentAdmin.id,
            },
        }),
    ]);
    const [heroMedia, royalMedia, gardenMedia, minimalMedia, gallery1Media, gallery2Media, blogCoverMedia, eventBannerMedia, sampleInviteMedia, gallery3Media,] = mediaAssets;
    // ── Packages (Standard / Premium / Lux) ─────────────────────────────────────
    const standardPkg = await prisma.package.create({
        data: {
            title: "Standard",
            slug: "standard",
            priceInPaise: 4990000,
            tierRank: 1,
            isRecommended: false,
            isActive: true,
            isCustomizable: true,
            displayOrder: 1,
            description: "Perfect for intimate celebrations with essential décor and coordination.",
        },
    });
    const premiumPkg = await prisma.package.create({
        data: {
            title: "Premium",
            slug: "premium",
            priceInPaise: 7990000,
            tierRank: 2,
            isRecommended: true,
            isActive: true,
            isCustomizable: true,
            displayOrder: 2,
            description: "Most loved for memorable celebrations with themed décor and personalized touches.",
        },
    });
    const luxPkg = await prisma.package.create({
        data: {
            title: "Lux",
            slug: "lux",
            priceInPaise: 11990000,
            tierRank: 3,
            isRecommended: false,
            isActive: true,
            isCustomizable: true,
            displayOrder: 3,
            description: "Grand, unforgettable experiences with premium décor, activities, and full support.",
        },
    });
    // ── Extra Services (global catalog — Fiverr-style rows) ─────────────────────
    const svcReturnGift = await prisma.extraService.create({
        data: {
            label: "Return gift",
            description: "Curated return gifts matching your theme and guest count.",
            requirements: "Guest count and theme preference required at least 7 days before the event.",
            displayOrder: 1,
            isActive: true,
        },
    });
    const svcVideoInvites = await prisma.extraService.create({
        data: {
            label: "Video invites",
            description: "Animated or live-action video invitations for your celebration.",
            requirements: "Provide child name, event date, venue, and theme artwork references.",
            displayOrder: 2,
            isActive: true,
        },
    });
    const svcThemeDecor = await prisma.extraService.create({
        data: {
            label: "Theme based decorations",
            description: "Full theme-aligned décor including backdrop, props, and table styling.",
            requirements: "Theme selection and venue walkthrough recommended.",
            displayOrder: 3,
            isActive: true,
        },
    });
    const svcDigitalInvites = await prisma.extraService.create({
        data: {
            label: "Digital invites",
            description: "Shareable digital invitation cards for WhatsApp and social media.",
            requirements: "Event details, RSVP contact, and preferred colour palette.",
            displayOrder: 4,
            isActive: true,
        },
    });
    const svcCustomBackdrop = await prisma.extraService.create({
        data: {
            label: "Custom backdrop",
            description: "Personalised photo backdrop with name, age, and theme elements.",
            requirements: "Child name, age, and high-resolution theme assets if available.",
            displayOrder: 5,
            isActive: true,
        },
    });
    const svcPersonalized = await prisma.extraService.create({
        data: {
            label: "Personalized details",
            description: "Custom signage, name boards, cake toppers, and themed printables.",
            requirements: "Spelling of names and any special messages to include.",
            displayOrder: 6,
            isActive: true,
        },
    });
    const svcActivities = await prisma.extraService.create({
        data: {
            label: "Activities & games",
            description: "Hosted games, craft stations, and age-appropriate party activities.",
            requirements: "Guest age range and headcount; outdoor space details if applicable.",
            displayOrder: 7,
            isActive: true,
        },
    });
    const svcOrganiser = await prisma.extraService.create({
        data: {
            label: "Organiser support",
            description: "Dedicated on-day coordinator to manage vendors, timeline, and guests.",
            requirements: "Final run-sheet shared 48 hours before the event.",
            displayOrder: 8,
            isActive: true,
        },
    });
    const svcPhotoDoc = await prisma.extraService.create({
        data: {
            label: "Photo documentation",
            description: "Professional photo coverage of décor, candid moments, and cake cutting.",
            requirements: "Coverage hours and key moments list.",
            displayOrder: 9,
            isActive: true,
        },
    });
    const svcBalloons = await prisma.extraService.create({
        data: {
            label: "Balloons & props",
            description: "Balloon garlands, arches, and themed prop sets.",
            displayOrder: 10,
            isActive: true,
        },
    });
    const svcWelcomeBoard = await prisma.extraService.create({
        data: {
            label: "Welcome board",
            description: "Entrance welcome board with theme styling.",
            displayOrder: 11,
            isActive: true,
        },
    });
    const matrix = [
        { svcId: svcReturnGift.id, standard: true, premium: true, lux: true, customPrice: 250000 },
        { svcId: svcVideoInvites.id, standard: false, premium: true, lux: true, customPrice: 500000 },
        { svcId: svcThemeDecor.id, standard: true, premium: true, lux: true, customPrice: 0 },
        { svcId: svcDigitalInvites.id, standard: true, premium: true, lux: true, customPrice: 150000 },
        { svcId: svcCustomBackdrop.id, standard: false, premium: true, lux: true, customPrice: 800000 },
        { svcId: svcPersonalized.id, standard: false, premium: true, lux: true, customPrice: 600000 },
        { svcId: svcActivities.id, standard: false, premium: false, lux: true, customPrice: 1200000 },
        { svcId: svcOrganiser.id, standard: false, premium: false, lux: true, customPrice: 1500000 },
        { svcId: svcPhotoDoc.id, standard: false, premium: false, lux: true, customPrice: 1000000 },
        { svcId: svcBalloons.id, standard: true, premium: true, lux: true, customPrice: 300000 },
        { svcId: svcWelcomeBoard.id, standard: true, premium: true, lux: true, customPrice: 200000 },
    ];
    for (const row of matrix) {
        await prisma.extraService.update({
            where: { id: row.svcId },
            data: { customizationPriceInPaise: row.customPrice },
        });
    }
    const packageServiceItems = [];
    for (let i = 0; i < matrix.length; i++) {
        const row = matrix[i];
        packageServiceItems.push({ packageId: standardPkg.id, extraServiceId: row.svcId, isIncluded: row.standard, displayOrder: i }, { packageId: premiumPkg.id, extraServiceId: row.svcId, isIncluded: row.premium, displayOrder: i }, { packageId: luxPkg.id, extraServiceId: row.svcId, isIncluded: row.lux, displayOrder: i });
    }
    await prisma.packageServiceItem.createMany({ data: packageServiceItems });
    const premiumVideoItem = await prisma.packageServiceItem.findFirst({
        where: { packageId: premiumPkg.id, extraServiceId: svcVideoInvites.id },
    });
    // ── Themes ───────────────────────────────────────────────────────────────────
    const royalTheme = await prisma.theme.create({
        data: {
            title: "Royal Mandap",
            slug: "royal-mandap",
            shortDescription: "Regal traditions meet modern elegance",
            storyDescription: "Rich maroon and gold décor with ornate mandap, royal seating, and traditional floral arrangements.",
            audienceNote: "Ideal for traditional Hindu weddings with 150–300 guests",
            heroImageId: royalMedia.id,
            isActive: true,
            displayOrder: 1,
            seoTitle: "Royal Mandap Theme | Vaibhav Celebrations",
            seoDescription: "Experience regal wedding décor with our Royal Mandap theme at Vaibhav Farmhouse.",
        },
    });
    const gardenTheme = await prisma.theme.create({
        data: {
            title: "Garden Bloom",
            slug: "garden-bloom",
            shortDescription: "Fresh florals in an open-air paradise",
            storyDescription: "Pastel florals, garden arches, and natural greenery for a dreamy outdoor celebration.",
            audienceNote: "Perfect for daytime ceremonies and nature-loving couples",
            heroImageId: gardenMedia.id,
            isActive: true,
            displayOrder: 2,
            seoTitle: "Garden Bloom Theme | Vaibhav Celebrations",
            seoDescription: "Dreamy outdoor wedding theme with pastel florals and garden arches.",
        },
    });
    const minimalTheme = await prisma.theme.create({
        data: {
            title: "Minimal Elegance",
            slug: "minimal-elegance",
            shortDescription: "Less is more — refined and timeless",
            storyDescription: "Clean lines, neutral palette, and sophisticated minimal décor for contemporary couples.",
            audienceNote: "Best for intimate gatherings of 50–120 guests",
            heroImageId: minimalMedia.id,
            isActive: true,
            displayOrder: 3,
            seoTitle: "Minimal Elegance Theme | Vaibhav Celebrations",
            seoDescription: "Contemporary minimal wedding décor with clean lines and neutral tones.",
        },
    });
    await prisma.themePackage.createMany({
        data: [
            { themeId: royalTheme.id, packageId: standardPkg.id },
            { themeId: royalTheme.id, packageId: premiumPkg.id },
            { themeId: royalTheme.id, packageId: luxPkg.id },
            { themeId: gardenTheme.id, packageId: premiumPkg.id, priceOverrideInPaise: 8590000 },
            { themeId: gardenTheme.id, packageId: luxPkg.id },
            { themeId: minimalTheme.id, packageId: standardPkg.id },
            { themeId: minimalTheme.id, packageId: premiumPkg.id },
        ],
    });
    const sampleAssetDefs = [
        { type: client_1.SampleAssetType.DIGITAL_INVITE, title: "Digital Wedding Invite", mediaId: sampleInviteMedia.id },
        { type: client_1.SampleAssetType.VIDEO_INVITE, title: "Video Invite Preview", mediaId: royalMedia.id },
        { type: client_1.SampleAssetType.PARENT_PARTY_BRIEF, title: "Parent Party Brief", mediaId: gardenMedia.id },
        { type: client_1.SampleAssetType.COUNTDOWN_CARD, title: "Countdown Card", mediaId: minimalMedia.id },
        { type: client_1.SampleAssetType.ACTIVITY_KIT, title: "Kids Activity Kit", mediaId: gallery1Media.id },
        { type: client_1.SampleAssetType.RETURN_GIFT_PREVIEW, title: "Return Gift Preview", mediaId: gallery2Media.id },
        { type: client_1.SampleAssetType.OTHER, title: "Custom Branding Sample", mediaId: heroMedia.id },
    ];
    for (const theme of [royalTheme, gardenTheme, minimalTheme]) {
        for (let i = 0; i < sampleAssetDefs.length; i++) {
            const def = sampleAssetDefs[i];
            await prisma.themeSampleAsset.create({
                data: {
                    themeId: theme.id,
                    type: def.type,
                    title: `${theme.title} — ${def.title}`,
                    mediaId: def.mediaId,
                    description: `Sample ${def.title.toLowerCase()} for ${theme.title}`,
                    displayOrder: i + 1,
                },
            });
        }
    }
    // ── Gallery ──────────────────────────────────────────────────────────────────
    const tagWedding = await prisma.galleryTag.create({ data: { name: "Wedding" } });
    const tagReception = await prisma.galleryTag.create({ data: { name: "Reception" } });
    const tagOutdoor = await prisma.galleryTag.create({ data: { name: "Outdoor" } });
    const tagMandap = await prisma.galleryTag.create({ data: { name: "Mandap" } });
    const galleryImg1 = await prisma.galleryImage.create({
        data: {
            mediaId: gallery1Media.id,
            caption: "Sunset Mandap Ceremony",
            altText: gallery1Media.altText ?? "Outdoor wedding ceremony",
            themeId: royalTheme.id,
            ctaType: client_1.GalleryCtaType.THEME,
            ctaTargetSlug: "royal-mandap",
            isActive: true,
            displayOrder: 1,
        },
    });
    const galleryImg2 = await prisma.galleryImage.create({
        data: {
            mediaId: gallery2Media.id,
            caption: "Garden Reception Dinner",
            altText: gallery2Media.altText ?? "Reception dinner setup",
            themeId: gardenTheme.id,
            ctaType: client_1.GalleryCtaType.THEME,
            ctaTargetSlug: "garden-bloom",
            isActive: true,
            displayOrder: 2,
        },
    });
    const galleryImg3 = await prisma.galleryImage.create({
        data: {
            mediaId: gallery3Media.id,
            caption: "Minimal Stage Setup",
            altText: "Minimal elegance stage with white drapes",
            themeId: minimalTheme.id,
            ctaType: client_1.GalleryCtaType.BOOKING,
            ctaTargetSlug: "contact",
            isActive: true,
            displayOrder: 3,
        },
    });
    await prisma.galleryImageTag.createMany({
        data: [
            { galleryImageId: galleryImg1.id, tagId: tagWedding.id },
            { galleryImageId: galleryImg1.id, tagId: tagMandap.id },
            { galleryImageId: galleryImg1.id, tagId: tagOutdoor.id },
            { galleryImageId: galleryImg2.id, tagId: tagReception.id },
            { galleryImageId: galleryImg2.id, tagId: tagOutdoor.id },
            { galleryImageId: galleryImg3.id, tagId: tagWedding.id },
        ],
    });
    // ── Testimonials (all subject types) ─────────────────────────────────────────
    await prisma.testimonial.createMany({
        data: [
            {
                customerName: "Priya & Rahul Sharma",
                content: "Vaibhav Celebrations made our wedding absolutely magical. The Royal Mandap theme exceeded every expectation.",
                rating: 5,
                subjectType: client_1.TestimonialSubjectType.THEME,
                themeId: royalTheme.id,
                isFeatured: true,
                isActive: true,
            },
            {
                customerName: "Ananya & Vikram Mehta",
                content: "The Gold package was perfect value — everything was handled professionally from consultation to the final goodbye.",
                rating: 5,
                subjectType: client_1.TestimonialSubjectType.PACKAGE,
                packageId: premiumPkg.id,
                isFeatured: true,
                isActive: true,
            },
            {
                customerName: "Sneha Kapoor",
                content: "We attended the August Open Day and booked the same week. The team is responsive, warm, and detail-oriented.",
                rating: 5,
                subjectType: client_1.TestimonialSubjectType.GENERAL,
                isFeatured: false,
                isActive: true,
            },
        ],
    });
    // ── FAQs (all categories as strings) ─────────────────────────────────────────
    const faqData = [
        {
            category: "Booking",
            question: "How far in advance should I book?",
            answer: "We recommend booking at least 3–6 months ahead for peak wedding season (Oct–Feb).",
        },
        {
            category: "Booking",
            question: "Can I visit the venue before booking?",
            answer: "Yes! Schedule a free consultation or attend our monthly Open Day events.",
        },
        {
            category: "Packages",
            question: "What is included in the base package price?",
            answer: "Each package includes venue access, base décor, seating, and event coordination.",
        },
        {
            category: "Packages",
            question: "Can I upgrade my package after booking?",
            answer: "Yes, upgrades are possible subject to availability. Contact our operations team.",
        },
        {
            category: "Themes",
            question: "Can themes be customized?",
            answer: "Absolutely. Our design team can tailor colors, florals, and layout to match your vision.",
        },
        {
            category: "Venue",
            question: "What is the venue capacity?",
            answer: "Our farmhouse accommodates 50–350 guests depending on the package and setup.",
        },
        {
            category: "Venue",
            question: "Is parking available?",
            answer: "Yes, complimentary parking for up to 80 vehicles on premises.",
        },
        {
            category: "Payments",
            question: "What is the payment schedule?",
            answer: "40% advance on booking confirmation, 40% two weeks before event, 20% on event day.",
        },
        {
            category: "Payments",
            question: "Do you accept UPI and cards?",
            answer: "Yes, we accept UPI, credit/debit cards, and bank transfers via Razorpay.",
        },
        {
            category: "General",
            question: "Do you provide catering?",
            answer: "Catering is available as an add-on. We partner with trusted vendors for multi-cuisine menus.",
        },
    ];
    for (let i = 0; i < faqData.length; i++) {
        const item = faqData[i];
        await prisma.fAQ.create({
            data: { ...item, displayOrder: i + 1, isActive: true },
        });
    }
    // ── Legal Pages (all types) ──────────────────────────────────────────────────
    for (const type of Object.values(client_1.LegalPageType)) {
        await prisma.legalPage.create({
            data: {
                type,
                title: type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                bodyHtml: `<h1>${type.replace(/_/g, " ")}</h1><p>This is placeholder legal content for development. Replace with lawyer-reviewed text before go-live.</p>`,
                publishedAt: new Date(),
            },
        });
    }
    // ── Site Metadata (all page keys) ────────────────────────────────────────────
    const metadataPages = [
        {
            pageKey: "home",
            metaTitle: "Vaibhav Celebrations | Premium Farmhouse Weddings in Delhi NCR",
            metaDescription: "Premium farmhouse wedding venue near Surajkund, Faridabad. Book your dream celebration today.",
            canonicalUrl: "https://vaibhavcelebrations.in",
        },
        {
            pageKey: "themes",
            metaTitle: "Wedding Themes | Vaibhav Celebrations",
            metaDescription: "Explore Royal Mandap, Garden Bloom, and Minimal Elegance wedding themes.",
            canonicalUrl: "https://vaibhavcelebrations.in/themes",
        },
        {
            pageKey: "packages",
            metaTitle: "Wedding Packages & Pricing | Vaibhav Celebrations",
            metaDescription: "Standard, Premium, and Lux celebration packages for unforgettable birthdays.",
            canonicalUrl: "https://vaibhavcelebrations.in/packages",
        },
        {
            pageKey: "gallery",
            metaTitle: "Wedding Gallery | Vaibhav Celebrations",
            metaDescription: "Browse real wedding photos from Vaibhav Celebrations farmhouse venue.",
            canonicalUrl: "https://vaibhavcelebrations.in/gallery",
        },
        {
            pageKey: "contact",
            metaTitle: "Contact Us | Vaibhav Celebrations",
            metaDescription: "Schedule a consultation or visit our farmhouse near Surajkund, Faridabad.",
            canonicalUrl: "https://vaibhavcelebrations.in/contact",
        },
        {
            pageKey: "theme:royal-mandap",
            metaTitle: "Royal Mandap Theme | Vaibhav Celebrations",
            metaDescription: "Regal maroon and gold wedding décor with ornate mandap setup.",
            canonicalUrl: "https://vaibhavcelebrations.in/themes/royal-mandap",
        },
        {
            pageKey: "theme:garden-bloom",
            metaTitle: "Garden Bloom Theme | Vaibhav Celebrations",
            metaDescription: "Pastel florals and garden arches for dreamy outdoor weddings.",
            canonicalUrl: "https://vaibhavcelebrations.in/themes/garden-bloom",
        },
        {
            pageKey: "theme:minimal-elegance",
            metaTitle: "Minimal Elegance Theme | Vaibhav Celebrations",
            metaDescription: "Contemporary minimal wedding décor with clean lines.",
            canonicalUrl: "https://vaibhavcelebrations.in/themes/minimal-elegance",
        },
        {
            pageKey: "blog",
            metaTitle: "Wedding Blog | Vaibhav Celebrations",
            metaDescription: "Tips, trends, and inspiration for planning your perfect wedding.",
            canonicalUrl: "https://vaibhavcelebrations.in/blog",
        },
    ];
    for (const meta of metadataPages) {
        await prisma.siteMetadata.create({
            data: {
                pageKey: meta.pageKey,
                metaTitle: meta.metaTitle,
                metaDescription: meta.metaDescription,
                canonicalUrl: meta.canonicalUrl,
                ogImageId: heroMedia.id,
                schemaJsonLd: { "@type": "LocalBusiness", name: "Vaibhav Celebrations" },
            },
        });
    }
    // ── Page Content (Home / About / Contact) ───────────────────────────────────
    const { defaultPageSections } = await Promise.resolve().then(() => __importStar(require("../src/modules/pages/pages.service")));
    for (const pageKey of ["home", "about", "contact"]) {
        const sections = JSON.parse(JSON.stringify(defaultPageSections[pageKey]));
        if (pageKey === "home" && sections.hero) {
            sections.hero.backgroundImage = { mediaId: heroMedia.id };
        }
        await prisma.pageContent.create({
            data: { pageKey, sections: sections },
        });
    }
    // ── Blog ─────────────────────────────────────────────────────────────────────
    const catPlanning = await prisma.blogCategory.create({ data: { name: "Wedding Planning" } });
    const catTrends = await prisma.blogCategory.create({ data: { name: "Trends & Inspiration" } });
    const catVenue = await prisma.blogCategory.create({ data: { name: "Venue Guide" } });
    const tagDestination = await prisma.blogTag.create({ data: { name: "Destination" } });
    const tagBudget = await prisma.blogTag.create({ data: { name: "Budget Tips" } });
    const tagDecor = await prisma.blogTag.create({ data: { name: "Décor Ideas" } });
    const publishedPost = await prisma.blogPost.create({
        data: {
            title: "Top 10 Wedding Trends for 2026",
            slug: "top-wedding-trends-2026",
            excerpt: "From sustainable florals to intimate micro-weddings — discover what's trending this season.",
            contentHtml: "<p>2026 brings fresh inspiration for couples planning their big day. Sustainable florals, intimate gatherings, and personalized digital invites lead the way.</p>",
            featuredImageId: blogCoverMedia.id,
            authorName: "Content Editor",
            status: client_1.BlogStatus.PUBLISHED,
            publishedAt: new Date("2026-01-15"),
            isFeatured: true,
            seoTitle: "Top 10 Wedding Trends 2026 | Vaibhav Celebrations",
            seoDescription: "Discover the hottest wedding trends for 2026 at Vaibhav Celebrations.",
        },
    });
    const draftPost = await prisma.blogPost.create({
        data: {
            title: "How to Choose the Perfect Wedding Package",
            slug: "choose-perfect-wedding-package",
            excerpt: "A complete guide to matching your guest count, budget, and vision to the right package.",
            contentHtml: "<p>Draft content — to be published soon.</p>",
            authorName: "Content Editor",
            status: client_1.BlogStatus.DRAFT,
        },
    });
    const unpublishedPost = await prisma.blogPost.create({
        data: {
            title: "Farmhouse Wedding Venue Guide",
            slug: "farmhouse-wedding-venue-guide",
            excerpt: "Why a farmhouse venue might be perfect for your celebration.",
            contentHtml: "<p>Previously published, now under review.</p>",
            authorName: "Content Editor",
            status: client_1.BlogStatus.UNPUBLISHED,
            publishedAt: new Date("2025-12-01"),
        },
    });
    await prisma.blogPostCategory.createMany({
        data: [
            { blogPostId: publishedPost.id, categoryId: catTrends.id },
            { blogPostId: publishedPost.id, categoryId: catPlanning.id },
            { blogPostId: draftPost.id, categoryId: catPlanning.id },
            { blogPostId: unpublishedPost.id, categoryId: catVenue.id },
        ],
    });
    await prisma.blogPostTag.createMany({
        data: [
            { blogPostId: publishedPost.id, tagId: tagDecor.id },
            { blogPostId: publishedPost.id, tagId: tagBudget.id },
            { blogPostId: draftPost.id, tagId: tagBudget.id },
            { blogPostId: draftPost.id, tagId: tagDestination.id },
            { blogPostId: unpublishedPost.id, tagId: tagDecor.id },
        ],
    });
    // ── Events ───────────────────────────────────────────────────────────────────
    const augustEvent = await prisma.event.create({
        data: {
            title: "August Open Day — Visit & Book",
            slug: "august-open-day-2026",
            description: "Tour our farmhouse venue, meet our team, and enjoy complimentary refreshments. Special booking discounts for same-day confirmations.",
            bannerMediaId: eventBannerMedia.id,
            activities: ["Venue tour", "Theme showcase", "Q&A with event manager", "Complimentary refreshments"],
            ageGroup: "All ages",
            venue: "Vaibhav Farmhouse, Surajkund Road, Faridabad",
            scheduleStartAt: new Date("2026-08-15T10:00:00+05:30"),
            scheduleEndAt: new Date("2026-08-15T18:00:00+05:30"),
            isRegistrationOpen: true,
            registrationFeeInPaise: 0,
            themeId: royalTheme.id,
            pageTemplate: "CLASSIC_HERO",
            galleryMediaIds: [gallery1Media.id, gallery2Media.id, eventBannerMedia.id],
            faqItems: [
                { question: "Is registration free?", answer: "Yes — Open Day registration is completely free." },
                { question: "Do I need to book a package on the day?", answer: "No, but same-day bookings get exclusive discounts." },
            ],
            ctaLabel: "Register for Free",
            ctaUrl: "#register",
            seoTitle: "August Open Day 2026 | Vaibhav Celebrations",
            seoDescription: "Visit Vaibhav Celebrations on August 15. Tour the venue and get exclusive booking offers.",
            isActive: true,
        },
    });
    const septemberEvent = await prisma.event.create({
        data: {
            title: "Bridal Preview Evening",
            slug: "bridal-preview-september-2026",
            description: "An exclusive evening showcasing our latest themes, packages, and vendor partners.",
            bannerMediaId: heroMedia.id,
            activities: ["Theme walkthrough", "Vendor meet & greet", "Package comparison session"],
            venue: "Vaibhav Farmhouse, Surajkund Road, Faridabad",
            scheduleStartAt: new Date("2026-09-20T11:00:00+05:30"),
            scheduleEndAt: new Date("2026-09-20T15:00:00+05:30"),
            isRegistrationOpen: true,
            registrationFeeInPaise: 50000,
            themeId: gardenTheme.id,
            pageTemplate: "EDITORIAL_SPLIT",
            galleryMediaIds: [gallery1Media.id, heroMedia.id],
            faqItems: [
                { question: "Is there an entry fee?", answer: "Yes, ₹500 per guest — adjustable against your booking." },
            ],
            ctaLabel: "Reserve Your Seat",
            ctaUrl: "#register",
            isActive: true,
        },
    });
    // Third template demo (festive / campaign)
    await prisma.event.create({
        data: {
            title: "Festive Celebration Fair",
            slug: "festive-celebration-fair-2026",
            description: "A vibrant open fair with live décor demos, kids activities, and limited-time festive package offers — perfect for ad campaigns.",
            bannerMediaId: eventBannerMedia.id,
            activities: ["Live décor demos", "Kids activity corner", "Festive package launches", "Photo booth"],
            ageGroup: "Families & kids",
            venue: "Vaibhav Farmhouse, Surajkund Road, Faridabad",
            scheduleStartAt: new Date("2026-10-12T10:00:00+05:30"),
            scheduleEndAt: new Date("2026-10-12T19:00:00+05:30"),
            isRegistrationOpen: true,
            registrationFeeInPaise: 0,
            themeId: minimalTheme.id,
            pageTemplate: "FESTIVE_IMMERSIVE",
            galleryMediaIds: [gallery2Media.id, gallery3Media.id],
            faqItems: [
                { question: "Can I walk in without registering?", answer: "Registration helps us plan capacity — please register online." },
            ],
            ctaLabel: "Join the Fair",
            ctaUrl: "#register",
            seoTitle: "Festive Celebration Fair 2026 | Vaibhav Celebrations",
            isActive: true,
        },
    });
    // ── Popups (all placements) ──────────────────────────────────────────────────
    await prisma.popup.create({
        data: {
            title: "August Open Day — Register Now!",
            bodyText: "Join us on August 15 for a free venue tour and exclusive booking discounts.",
            ctaLabel: "Register Free",
            ctaUrl: "/events/august-open-day-2026",
            imageId: eventBannerMedia.id,
            placements: [client_1.PopupPlacement.HOMEPAGE, client_1.PopupPlacement.THEMES_PAGE, client_1.PopupPlacement.PACKAGES_PAGE],
            linkedEventId: augustEvent.id,
            triggerAfterSeconds: 5,
            isActive: true,
            startsAt: new Date("2026-07-01"),
            endsAt: new Date("2026-08-14"),
        },
    });
    await prisma.popup.create({
        data: {
            title: "Book Your 2026 Wedding Today",
            bodyText: "Limited dates available for Oct–Feb season. Secure your date with 40% advance.",
            ctaLabel: "Check Availability",
            ctaUrl: "/contact",
            placements: [client_1.PopupPlacement.GALLERY_PAGE],
            triggerAfterSeconds: 8,
            isActive: true,
        },
    });
    // ── Customers & CRM ──────────────────────────────────────────────────────────
    const customer1 = await prisma.customer.create({
        data: {
            fullName: "Priya Sharma",
            email: "priya.sharma@example.com",
            phone: "+919876543210",
        },
    });
    const customer2 = await prisma.customer.create({
        data: {
            fullName: "Ananya Mehta",
            email: "ananya.mehta@example.com",
            phone: "+919123456789",
        },
    });
    const customer3 = await prisma.customer.create({
        data: {
            fullName: "Rohit Verma",
            email: "rohit.verma@example.com",
            phone: "+919988776655",
        },
    });
    await prisma.customerNote.createMany({
        data: [
            {
                customerId: customer1.id,
                note: "Interested in Royal Mandap + Gold package for March 2027. Follow up after Open Day.",
                authorAdminUserId: opsAdmin.id,
            },
            {
                customerId: customer2.id,
                note: "Referred by Priya Sharma. Wants Garden Bloom theme, ~150 guests.",
                authorAdminUserId: opsAdmin.id,
            },
        ],
    });
    // ── Chatbot Session ──────────────────────────────────────────────────────────
    const chatbotSession = await prisma.chatbotSession.create({
        data: {
            path: [
                { step: "welcome", answer: null },
                { step: "package_interest", answer: "Premium" },
                { step: "guest_count", answer: "180" },
                { step: "contact", answer: "+919555555555" },
            ],
            resultTag: "qualified_lead",
        },
    });
    // ── Leads (all sources & statuses) ───────────────────────────────────────────
    const leadSources = Object.values(client_1.LeadSource);
    const leadStatuses = Object.values(client_1.LeadStatus);
    for (let i = 0; i < leadSources.length; i++) {
        const source = leadSources[i];
        await prisma.lead.create({
            data: {
                name: `Lead ${i + 1} — ${source}`,
                email: `lead${i + 1}@example.com`,
                phone: `+91900000${String(i).padStart(4, "0")}`,
                source,
                status: leadStatuses[i % leadStatuses.length],
                interestArea: i % 2 === 0 ? "Premium" : "Royal Mandap",
                message: `Inquiry via ${source}. Looking for wedding venue in Delhi NCR.`,
                customerId: i === 0 ? customer1.id : undefined,
                chatbotSessionId: source === client_1.LeadSource.CHATBOT ? chatbotSession.id : undefined,
            },
        });
    }
    // ── Consultation Requests (all statuses) ─────────────────────────────────────
    await prisma.consultationRequest.create({
        data: {
            name: "Kavita Singh",
            email: "kavita.singh@example.com",
            phone: "+919876111222",
            eventDate: new Date("2027-03-15"),
            childOrEventDetails: "Adult wedding ceremony, 180 guests",
            customRequirements: "Would like to discuss Gold package with Royal Mandap theme.",
            advanceNoticeDays: 240,
            belowMinimumNotice: false,
            status: client_1.ConsultationStatus.PENDING,
            customerId: customer1.id,
        },
    });
    await prisma.consultationRequest.create({
        data: {
            name: "Urgent Couple",
            email: "urgent@example.com",
            phone: "+919876333444",
            eventDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
            childOrEventDetails: "Birthday celebration, 50 guests",
            customRequirements: "Need venue in 1 week — is anything available?",
            advanceNoticeDays: 7,
            belowMinimumNotice: true,
            status: client_1.ConsultationStatus.PENDING,
        },
    });
    await prisma.consultationRequest.create({
        data: {
            name: "Confirmed Visitor",
            email: "confirmed@example.com",
            phone: "+919876555666",
            eventDate: new Date("2027-12-05"),
            childOrEventDetails: "Lux celebration, 80 guests",
            customRequirements: "Outdoor ceremony preferred with indoor backup.",
            advanceNoticeDays: 500,
            belowMinimumNotice: false,
            status: client_1.ConsultationStatus.SCHEDULED,
            customerId: customer2.id,
        },
    });
    await prisma.consultationRequest.create({
        data: {
            name: "Reviewed Inquiry",
            email: "reviewed@example.com",
            phone: "+919876777888",
            eventDate: new Date("2027-06-20"),
            advanceNoticeDays: 365,
            belowMinimumNotice: false,
            status: client_1.ConsultationStatus.REVIEWED,
        },
    });
    await prisma.consultationRequest.create({
        data: {
            name: "Completed Consultation",
            email: "completed@example.com",
            phone: "+919876999000",
            eventDate: new Date("2026-11-20"),
            advanceNoticeDays: 120,
            belowMinimumNotice: false,
            status: client_1.ConsultationStatus.COMPLETED,
            customerId: customer3.id,
        },
    });
    await prisma.consultationRequest.create({
        data: {
            name: "Declined Request",
            email: "declined@example.com",
            phone: "+919876000111",
            eventDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
            advanceNoticeDays: 3,
            belowMinimumNotice: true,
            status: client_1.ConsultationStatus.DECLINED,
        },
    });
    // ── Event Registrations (all payment statuses) ───────────────────────────────
    await prisma.eventRegistration.createMany({
        data: [
            {
                eventId: augustEvent.id,
                name: "Neha Gupta",
                email: "neha.gupta@example.com",
                phone: "+919111222333",
                guestCount: 2,
                notes: "Excited to visit the venue!",
                paymentStatus: client_1.PaymentStatus.NOT_REQUIRED,
            },
            {
                eventId: augustEvent.id,
                name: "Amit & Pooja",
                email: "amit.pooja@example.com",
                phone: "+919444555666",
                guestCount: 2,
                paymentStatus: client_1.PaymentStatus.NOT_REQUIRED,
            },
            {
                eventId: septemberEvent.id,
                name: "Divya Reddy",
                email: "divya.reddy@example.com",
                phone: "+919777888999",
                guestCount: 1,
                paymentStatus: client_1.PaymentStatus.PAID,
                amountPaidInPaise: 50000,
                razorpayOrderId: "order_dev_sep001",
                razorpayPaymentId: "pay_dev_sep001",
            },
            {
                eventId: septemberEvent.id,
                name: "Pending Payment User",
                email: "pending@example.com",
                phone: "+919333444555",
                guestCount: 2,
                paymentStatus: client_1.PaymentStatus.PENDING,
                amountPaidInPaise: 0,
                razorpayOrderId: "order_dev_sep002",
            },
            {
                eventId: septemberEvent.id,
                name: "Failed Payment User",
                email: "failed@example.com",
                phone: "+919666777888",
                guestCount: 1,
                paymentStatus: client_1.PaymentStatus.FAILED,
                razorpayOrderId: "order_dev_sep003",
            },
        ],
    });
    // ── Guest Verification Tokens ────────────────────────────────────────────────
    await prisma.guestVerificationToken.create({
        data: {
            referenceCode: "BOOKING-2026-0001",
            referenceType: "BOOKING",
            email: "priya.sharma@example.com",
            otpHash: await bcryptjs_1.default.hash("123456", 10),
            otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
            verifiedAt: new Date(),
            attemptCount: 0,
        },
    });
    await prisma.guestVerificationToken.create({
        data: {
            referenceCode: "CONSULT-001",
            referenceType: "CONSULTATION",
            email: "urgent@example.com",
            otpHash: await bcryptjs_1.default.hash("654321", 10),
            otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
            attemptCount: 2,
        },
    });
    // ── Bookings & Invoices ──────────────────────────────────────────────────────
    const booking1 = await prisma.booking.create({
        data: {
            bookingCode: "BOOKING-2026-0001",
            customerId: customer1.id,
            themeId: royalTheme.id,
            packageId: premiumPkg.id,
            eventDate: new Date("2027-02-14"),
            status: client_1.BookingStatus.CONFIRMED,
            paymentStatus: client_1.PaymentStatus.PARTIALLY_REFUNDED,
            basePriceInPaise: 7990000,
            customizationTotalInPaise: 500000,
            gstInPaise: 1528200,
            totalPriceInPaise: 10018200,
            guestEmail: customer1.email,
            guestPhone: customer1.phone,
            razorpayOrderId: "order_dev_bk001",
            razorpayPaymentId: "pay_dev_bk001",
        },
    });
    if (premiumVideoItem) {
        await prisma.bookingCustomization.create({
            data: {
                bookingId: booking1.id,
                packageServiceItemId: premiumVideoItem.id,
                quantity: 1,
                unitPriceInPaise: 500000,
            },
        });
    }
    await prisma.invoice.create({
        data: {
            invoiceNumber: "INVOICE-2026-27-0001",
            linkedType: client_1.InvoiceLinkedType.BOOKING,
            bookingId: booking1.id,
            customerId: customer1.id,
            subtotalInPaise: 8490000,
            gstInPaise: 1528200,
            totalInPaise: 10018200,
            pdfUrl: img("invoices/INVOICE-2026-27-0001.pdf"),
            emailSentAt: new Date(),
            issuedAt: new Date(),
        },
    });
    const booking2 = await prisma.booking.create({
        data: {
            bookingCode: "BOOKING-2026-0002",
            customerId: customer2.id,
            themeId: gardenTheme.id,
            packageId: luxPkg.id,
            eventDate: new Date("2027-11-20"),
            status: client_1.BookingStatus.SCHEDULED,
            paymentStatus: client_1.PaymentStatus.PENDING,
            basePriceInPaise: 11990000,
            customizationTotalInPaise: 0,
            gstInPaise: 2158200,
            totalPriceInPaise: 14148200,
            guestEmail: customer2.email,
            guestPhone: customer2.phone,
        },
    });
    await prisma.invoice.create({
        data: {
            invoiceNumber: "INVOICE-2026-27-0002",
            linkedType: client_1.InvoiceLinkedType.BOOKING,
            bookingId: booking2.id,
            customerId: customer2.id,
            subtotalInPaise: 11990000,
            gstInPaise: 2158200,
            totalInPaise: 14148200,
            issuedAt: new Date(),
        },
    });
    const booking3 = await prisma.booking.create({
        data: {
            bookingCode: "BOOKING-2026-0003",
            customerId: customer3.id,
            themeId: minimalTheme.id,
            packageId: standardPkg.id,
            eventDate: new Date("2026-12-05"),
            status: client_1.BookingStatus.COMPLETED,
            paymentStatus: client_1.PaymentStatus.PAID,
            basePriceInPaise: 4990000,
            customizationTotalInPaise: 0,
            gstInPaise: 898200,
            totalPriceInPaise: 5888200,
            guestEmail: customer3.email,
            guestPhone: customer3.phone,
            razorpayOrderId: "order_dev_bk003",
            razorpayPaymentId: "pay_dev_bk003",
        },
    });
    await prisma.invoice.create({
        data: {
            invoiceNumber: "INVOICE-2026-27-0003",
            linkedType: client_1.InvoiceLinkedType.BOOKING,
            bookingId: booking3.id,
            customerId: customer3.id,
            subtotalInPaise: 4990000,
            gstInPaise: 898200,
            totalInPaise: 5888200,
            pdfUrl: img("invoices/INVOICE-2026-27-0003.pdf"),
            emailSentAt: new Date(),
            whatsappSentAt: new Date(),
            whatsappSendStatus: "delivered",
            issuedAt: new Date("2026-06-01"),
        },
    });
    // ── Audit Logs ───────────────────────────────────────────────────────────────
    await prisma.auditLog.createMany({
        data: [
            {
                adminUserId: superAdmin.id,
                action: "ADMIN_LOGIN",
                entityType: "AdminUser",
                entityId: superAdmin.id,
                metadata: { userAgent: "seed-script" },
                ipAddress: "127.0.0.1",
            },
            {
                adminUserId: opsAdmin.id,
                action: "BOOKING_CONFIRMED",
                entityType: "Booking",
                entityId: booking1.id,
                metadata: { bookingCode: "BOOKING-2026-0001" },
                ipAddress: "127.0.0.1",
            },
            {
                adminUserId: contentAdmin.id,
                action: "BLOG_PUBLISHED",
                entityType: "BlogPost",
                entityId: publishedPost.id,
                metadata: { slug: "top-wedding-trends-2026" },
            },
            {
                adminUserId: superAdmin.id,
                action: "SETTINGS_UPDATED",
                entityType: "OperationalSetting",
                entityId: "gst_percent",
                metadata: { value: "18" },
            },
        ],
    });
    console.log("\n✅ Seed completed successfully!");
    console.log("─────────────────────────────────────────");
    console.log("Admin login:");
    console.log(`  Email:    ${process.env.SEED_ADMIN_EMAIL ?? "admin@vaibhavcelebrations.in"}`);
    console.log(`  Password: ${adminPassword}`);
    console.log("\nStaff logins (password: ChangeMe_Staff_123!):");
    console.log("  operations@vaibhavcelebrations.in (OPERATIONS)");
    console.log("  content@vaibhavcelebrations.in (CONTENT_EDITOR)");
    console.log("─────────────────────────────────────────");
}
main()
    .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map