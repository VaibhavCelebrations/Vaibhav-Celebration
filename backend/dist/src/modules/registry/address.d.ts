import type { ShippingAddress } from "../orders/orders.service";
export declare function formatAddressText(address: ShippingAddress | null | undefined): string;
export declare function parseShippingAddress(value: unknown): ShippingAddress | null;
