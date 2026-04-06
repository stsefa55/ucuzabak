import { parseTrendyolProductIdFromUrl, primitiveFeedIdCandidate, stripFeedFileUtf8Bom } from "./feedIdentity";
import { FeedAdapter, FeedParseResult, ParsedFeedItem } from "./types";

export class AmazonJsonAdapter implements FeedAdapter {
  parse(content: string): FeedParseResult {
    const data = JSON.parse(stripFeedFileUtf8Bom(content));
    const items = Array.isArray(data) ? data : data.items || data.products || [];

    const droppedByReason: Record<string, number> = {};
    const bump = (k: string) => {
      droppedByReason[k] = (droppedByReason[k] ?? 0) + 1;
    };

    const mapped = items.map((item: any) => {
      const trendyolRow =
        item?.source === "trendyol" ||
        item?.source === "Trendyol" ||
        String(item?.source ?? "").toLowerCase() === "trendyol";
      const fromTrendyolUrl = trendyolRow
        ? parseTrendyolProductIdFromUrl(item.url) ?? parseTrendyolProductIdFromUrl(item.mobileUrl)
        : undefined;

      const externalId =
        primitiveFeedIdCandidate(item.asin) ??
        primitiveFeedIdCandidate(item.externalId) ??
        primitiveFeedIdCandidate(item.id) ??
        primitiveFeedIdCandidate(item.sku) ??
        primitiveFeedIdCandidate(item.productId) ??
        fromTrendyolUrl ??
        "";
      const priceRaw = item.price ?? item.salePrice ?? item.currentPrice ?? item.listPrice;
      const url = item.url ?? item.link ?? item.productUrl ?? item.detailUrl ?? "#";
      const mobileUrl =
        item.mobileUrl != null && String(item.mobileUrl).trim() !== ""
          ? String(item.mobileUrl).trim()
          : undefined;
      const imagesArray: string[] = Array.isArray(item.images)
        ? (item.images as unknown[])
            .map((x) => String(x ?? "").trim())
            .filter((x) => x.length > 0)
        : [];
      const imagePrimary =
        [item.imageUrl, item.image, item.thumbnail, imagesArray[0]].find(
          (x) => x != null && String(x).trim() !== ""
        ) ?? undefined;
      const description =
        item.description != null && String(item.description).trim() !== ""
          ? String(item.description).trim().slice(0, 8000)
          : undefined;
      return {
        externalId,
        title: String(item.title ?? item.name ?? "Ürün"),
        brand:
          item.brand != null && String(item.brand).trim() !== ""
            ? String(item.brand).trim()
            : undefined,
        categoryText:
          item.category != null && String(item.category).trim() !== ""
            ? String(item.category).trim()
            : item.productType != null && String(item.productType).trim() !== ""
              ? String(item.productType).trim()
              : undefined,
        description,
        price: Number(priceRaw),
        originalPrice:
          item.originalPrice != null
            ? Number(item.originalPrice)
            : item.listPrice != null
              ? Number(item.listPrice)
              : undefined,
        currency: item.currency || "TRY",
        inStock: item.inStock ?? item.available ?? true,
        stockQuantity: item.stock != null ? Number(item.stock) : undefined,
        ean: item.ean ?? item.gtin ?? item.barcode ?? undefined,
        modelNumber: item.modelNumber ?? item.mpn ?? item.model ?? undefined,
        specs: item.specs ?? item.attributes ?? undefined,
        url: String(url),
        mobileUrl,
        imageUrl: imagePrimary != null ? String(imagePrimary).trim() : undefined,
        images: imagesArray.length > 0 ? imagesArray : undefined
      };
    });

    const kept: ParsedFeedItem[] = [];
    for (const r of mapped) {
      if (r.externalId.length === 0) {
        bump("missing_external_id");
        continue;
      }
      if (!Number.isFinite(r.price)) {
        bump("invalid_price");
        continue;
      }
      kept.push(r);
    }

    return {
      items: kept,
      droppedByReason: Object.keys(droppedByReason).length > 0 ? droppedByReason : undefined
    };
  }
}

