"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAddressText = formatAddressText;
exports.parseShippingAddress = parseShippingAddress;
function formatAddressText(address) {
    if (!address)
        return "";
    return [
        address.fullName,
        [address.line1, address.line2].filter(Boolean).join(", "),
        address.city && address.state ? `${address.city}, ${address.state}` : address.city || address.state,
        address.pincode,
        address.country,
    ]
        .map((line) => line?.trim())
        .filter(Boolean)
        .join("\n");
}
function parseShippingAddress(value) {
    if (!value || typeof value !== "object")
        return null;
    const a = value;
    if (typeof a.fullName !== "string" || typeof a.line1 !== "string")
        return null;
    return {
        fullName: a.fullName,
        line1: a.line1,
        line2: typeof a.line2 === "string" ? a.line2 : undefined,
        city: String(a.city ?? ""),
        state: String(a.state ?? ""),
        pincode: String(a.pincode ?? ""),
        country: String(a.country ?? "India"),
    };
}
//# sourceMappingURL=address.js.map