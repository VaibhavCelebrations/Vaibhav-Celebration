export type NotificationDeliveryStatus = "PENDING" | "SENT" | "SKIPPED" | "FAILED" | "DELIVERED" | "READ";
export type NotificationResult = {
    channel: "email" | "whatsapp";
    sent: boolean;
    skipped?: boolean;
    status: NotificationDeliveryStatus;
    providerMessageId?: string;
    error?: string;
};
