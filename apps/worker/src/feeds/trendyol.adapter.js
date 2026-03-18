"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendyolXmlAdapter = void 0;
const fast_xml_parser_1 = require("fast-xml-parser");
function toStr(v) {
    if (v == null)
        return undefined;
    const s = String(v).trim();
    return s === "" || s === "undefined" ? undefined : s;
}
function toStrOrUndefined(v) {
    const s = toStr(v);
    return s ?? undefined;
}
/** Başlıktan slug benzeri externalId yedek değeri üretir. */
function slugFromTitle(title) {
    const t = toStr(title) || "item";
    return t
        .toLowerCase()
        .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" }[c] ?? c))
        .replace(/[^a-z0-9\s-]/g, " ")
        .replace(/\s+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80) || "item";
}
class TrendyolXmlAdapter {
    parse(content) {
        const parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
        const json = parser.parse(content);
        const products = Array.isArray(json.products?.product)
            ? json.products.product
            : json.products?.product
                ? [json.products.product]
                : [];
        return products.map((p) => {
            const ean = toStrOrUndefined(p.ean);
            const modelNumber = toStrOrUndefined(p.modelNumber);
            const title = toStr(p.title) || "Untitled";
            const rawId = toStrOrUndefined(p.id);
            const externalId = rawId ?? ean ?? modelNumber ?? slugFromTitle(p.title);
            return {
                externalId,
                title,
                price: Number(p.price) || 0,
                originalPrice: p.originalPrice != null ? Number(p.originalPrice) : undefined,
                currency: toStrOrUndefined(p.currency) || "TRY",
                inStock: p.stock != null && Number(p.stock) > 0,
                stockQuantity: p.stock != null ? Number(p.stock) : undefined,
                ean,
                modelNumber,
                specs: p.specs && typeof p.specs === "object" ? p.specs : undefined,
                url: toStr(p.url) || "",
                imageUrl: toStrOrUndefined(p.imageUrl)
            };
        });
    }
}
exports.TrendyolXmlAdapter = TrendyolXmlAdapter;
//# sourceMappingURL=trendyol.adapter.js.map