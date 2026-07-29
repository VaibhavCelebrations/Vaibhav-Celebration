export type PublicSettings = {
    businessName: string;
    businessPhone: string;
    businessEmail: string;
    businessAddress: string;
    whatsappNumber: string;
    instagramUrl: string | null;
    facebookUrl: string | null;
    youtubeUrl: string | null;
    linkedinUrl: string | null;
};
export declare function getPublicSettings(): Promise<PublicSettings>;
