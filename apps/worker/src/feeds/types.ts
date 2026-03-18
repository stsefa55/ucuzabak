export interface ParsedFeedItem {
  externalId: string;
  title: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  inStock: boolean;
  stockQuantity?: number;
  ean?: string;
  modelNumber?: string;
  specs?: Record<string, unknown>;
  url: string;
  imageUrl?: string;
}

export interface FeedAdapter {
  parse(content: string): ParsedFeedItem[];
}

