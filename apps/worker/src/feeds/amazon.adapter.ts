import { FeedAdapter, ParsedFeedItem } from "./types";

export class AmazonJsonAdapter implements FeedAdapter {
  parse(content: string): ParsedFeedItem[] {
    const data = JSON.parse(content);
    const items = Array.isArray(data) ? data : data.items || [];

    return items.map((item: any) => ({
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

