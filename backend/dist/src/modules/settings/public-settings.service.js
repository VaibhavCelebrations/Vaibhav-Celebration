"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicSettings = getPublicSettings;
const prisma_1 = require("../../db/prisma");
const PUBLIC_KEYS = [
    "business_name",
    "business_phone",
    "business_email",
    "business_address",
    "whatsapp_number",
    "instagram_url",
    "facebook_url",
    "youtube_url",
    "linkedin_url",
];
function mapKey(key) {
    const map = {
        business_name: "businessName",
        business_phone: "businessPhone",
        business_email: "businessEmail",
        business_address: "businessAddress",
        whatsapp_number: "whatsappNumber",
        instagram_url: "instagramUrl",
        facebook_url: "facebookUrl",
        youtube_url: "youtubeUrl",
        linkedin_url: "linkedinUrl",
    };
    return map[key] ?? null;
}
async function getPublicSettings() {
    const rows = await prisma_1.prisma.operationalSetting.findMany({
        where: { key: { in: [...PUBLIC_KEYS] } },
    });
    const defaults = {
        businessName: "Vaibhav Celebrations",
        businessPhone: "",
        businessEmail: "",
        businessAddress: "",
        whatsappNumber: "",
        instagramUrl: null,
        facebookUrl: null,
        youtubeUrl: null,
        linkedinUrl: null,
    };
    for (const row of rows) {
        const field = mapKey(row.key);
        if (field) {
            defaults[field] = row.value || null;
        }
    }
    return defaults;
}
//# sourceMappingURL=public-settings.service.js.map