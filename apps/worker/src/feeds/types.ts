export interface ParsedFeedItem {
  externalId: string;
  title: string;
  /** Mağaza / feed marka metni (specs’e de yedeklenir). */
  brand?: string;
  /** Ham kategori yolu / metni (canonical eşleme için). */
  categoryText?: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  inStock: boolean;
  stockQuantity?: number;
  ean?: string;
  modelNumber?: string;
  specs?: Record<string, unknown>;
  /** Mağaza ürün / teklif yönlendirmesi (tercih: gerçek ürün sayfası). */
  url: string;
  /** Mobil / AMP URL — `import-normalized-json` ile uyumlu; Offer.affiliateUrl için öncelikli. */
  mobileUrl?: string;
  /** Kısa açıklama (canonical Product.description). */
  description?: string;
  /** Birincil görsel (geriye dönük). */
  imageUrl?: string;
  /** Ek görseller (ProductImage ve vitrin tamamlığı için). */
  images?: string[];
  /** Opsiyonel: hangi ham alanlardan kimlik üretildi (log / import özeti). */
  feedIdentityTrace?: { candidates: string[]; chosenMethod: string };
}

export type FeedParseResult = {
  items: ParsedFeedItem[];
  /** Parse sırasında elenen satır sayıları (anahtar: neden kodu) */
  droppedByReason?: Record<string, number>;
};

export interface FeedAdapter {
  parse(content: string): FeedParseResult;
}

