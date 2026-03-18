"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmazonJsonAdapter = void 0;
class AmazonJsonAdapter {
    parse(content) {
        const data = JSON.parse(content);
        const items = Array.isArray(data) ? data : data.items || [];
        return items.map((item) => ({
            externalId: String(item.asin || item.id),
            title: String(item.title),
            price: Number(item.price),
            originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
            currency: item.currency || "USD",
            inStock: item.inStock ?? true,
            stockQuantity: item.stock != null ? Number(item.stock) : undefined,
            ean: item.ean || undefined,
            modelNumber: item.modelNumber || undefined,
            specs: item.specs || undefined,
            url: String(item.url),
            imageUrl: item.imageUrl || undefined
        }));
    }
}
exports.AmazonJsonAdapter = AmazonJsonAdapter;
//# sourceMappingURL=amazon.adapter.js.map