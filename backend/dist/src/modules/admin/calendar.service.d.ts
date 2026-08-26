export declare function getAdminCalendar(view: "day" | "week" | "month", date: string): Promise<{
    view: "week" | "day" | "month";
    from: string;
    to: string;
    orders: {
        id: string;
        orderCode: string;
        placedAt: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        kind: import(".prisma/client").$Enums.OrderKind;
        totalInPaise: number;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        registryCode: string | null;
        isRegistryOrder: boolean;
        isPackageOrder: boolean;
        packageTitle: string | null;
        themeTitle: string | null;
        eventDate: string | null;
    }[];
    packageEvents: {
        id: string;
        orderCode: string;
        eventDate: string;
        customerName: string;
        packageTitle: string;
        themeTitle: string | null;
        totalInPaise: number;
    }[];
    birthdays: {
        id: string;
        registryCode: string;
        title: string;
        occasion: string | null;
        eventDate: string;
        personName: string | null;
        contactPhone: string | null;
    }[];
}>;
