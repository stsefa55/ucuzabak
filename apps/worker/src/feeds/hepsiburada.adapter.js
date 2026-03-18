"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HepsiburadaCsvAdapter = void 0;
const sync_1 = require("csv-parse/sync");
class HepsiburadaCsvAdapter {
    parse(content) {
        const records = (0, sync_1.parse)(content, {
            columns: true,
            skip_empty_lines: true,
        });
        return records.map((row) => ({
            externalId: String(row.id || row.externalId),
            title: String(row.title),
            price: Number(row.price),
            originalPrice: row.originalPrice ? Number(row.originalPrice) : undefined,
            currency: row.currency || "TRY",
            inStock: row.inStock ? String(row.inStock).toLowerCase() === "true" : Number(row.stock || 0) > 0,
            stockQuantity: row.stock != null ? Number(row.stock) : undefined,
            ean: row.ean || undefined,
            modelNumber: row.modelNumber || undefined,
            specs: row.specs ? JSON.parse(row.specs) : undefined,
            url: String(row.url),
            imageUrl: row.imageUrl || undefined
        }));
    }
}
exports.HepsiburadaCsvAdapter = HepsiburadaCsvAdapter;
//# sourceMappingURL=hepsiburada.adapter.js.map