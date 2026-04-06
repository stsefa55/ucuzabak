import { parse } from "csv-parse/sync";
import { FeedAdapter, FeedParseResult, ParsedFeedItem } from "./types";

export class HepsiburadaCsvAdapter implements FeedAdapter {
  parse(content: string): FeedParseResult {
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
    }) as any[];

    const items = records.map((row) => ({
      externalId: String(row.id || row.externalId),
      title: String(row.title),
      brand:
        row.brand != null && String(row.brand).trim() !== ""
          ? String(row.brand).trim()
          : undefined,
      categoryText:
        row.category != null && String(row.category).trim() !== ""
          ? String(row.category).trim()
          : row.categoryPath != null && String(row.categoryPath).trim() !== ""
            ? String(row.categoryPath).trim()
            : undefined,
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
    return { items };
  }
}

