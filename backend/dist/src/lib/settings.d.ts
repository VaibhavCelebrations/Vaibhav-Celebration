export declare function getSetting(key: string, fallback: string): Promise<string>;
export declare function getSettingNumber(key: string, fallback: number): Promise<number>;
export declare function getGstPercent(): Promise<number>;
export declare function getMaxBookingsPerDay(): Promise<number>;
export declare function getMinConsultationAdvanceDays(): Promise<number>;
export declare function invalidateSettingsCache(): void;
export declare function gstOn(amountInPaise: number, gstPercent: number): number;
