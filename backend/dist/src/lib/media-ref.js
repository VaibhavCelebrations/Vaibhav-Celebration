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
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaSelect = void 0;
exports.toMediaRef = toMediaRef;
exports.loadMediaById = loadMediaById;
exports.loadMediaMap = loadMediaMap;
exports.attachMediaField = attachMediaField;
exports.resolveMediaInJson = resolveMediaInJson;
function toMediaRef(asset) {
    if (!asset || asset.deletedAt)
        return null;
    return {
        id: asset.id,
        url: asset.url,
        altText: asset.altText,
        type: asset.type,
        width: asset.width,
        height: asset.height,
    };
}
exports.mediaSelect = {
    id: true,
    url: true,
    altText: true,
    type: true,
    width: true,
    height: true,
    deletedAt: true,
};
async function loadMediaById(id) {
    if (!id)
        return null;
    const { prisma } = await Promise.resolve().then(() => __importStar(require("../db/prisma")));
    const asset = await prisma.mediaAsset.findFirst({
        where: { id, deletedAt: null },
        select: exports.mediaSelect,
    });
    return toMediaRef(asset);
}
/** Batch-load media assets by id — avoids Prisma relation includes. */
async function loadMediaMap(ids) {
    const unique = [...new Set(ids.filter((id) => Boolean(id)))];
    if (!unique.length)
        return new Map();
    const { prisma } = await Promise.resolve().then(() => __importStar(require("../db/prisma")));
    const assets = await prisma.mediaAsset.findMany({
        where: { id: { in: unique }, deletedAt: null },
        select: exports.mediaSelect,
    });
    const map = new Map();
    for (const asset of assets) {
        const ref = toMediaRef(asset);
        if (ref)
            map.set(asset.id, ref);
    }
    return map;
}
function attachMediaField(row, map, field, target) {
    const id = row[field];
    return { ...row, [target]: id ? map.get(id) ?? null : null };
}
/** Walk JSON and replace `{ mediaId: string }` leaves with resolved MediaRef objects. */
async function resolveMediaInJson(value, loadMedia) {
    if (value === null || value === undefined)
        return value;
    if (Array.isArray(value)) {
        return Promise.all(value.map((item) => resolveMediaInJson(item, loadMedia)));
    }
    if (typeof value === "object") {
        const obj = value;
        if (typeof obj.mediaId === "string" && Object.keys(obj).length === 1) {
            const media = await loadMedia(obj.mediaId);
            return media ?? { mediaId: obj.mediaId };
        }
        const out = {};
        for (const [key, val] of Object.entries(obj)) {
            out[key] = await resolveMediaInJson(val, loadMedia);
        }
        return out;
    }
    return value;
}
//# sourceMappingURL=media-ref.js.map