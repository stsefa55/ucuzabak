import {
  parseTrendyolProductIdFromUrl,
  primitiveFeedIdCandidate,
  stripFeedFileUtf8Bom
} from "./feedIdentity";
import { FeedAdapter, FeedParseResult, ParsedFeedItem } from "./types";

/**
 * Normalize Trendyol JSON (ör. worker/API çıktısı): `source: "trendyol"`, externalId, url -p-{id}.
 * Kimlik önceliği: harici id alanları → URL içerik id → merchantId+mpn bileşik.
 */
export function isTrendyolNormalizedJsonPayload(raw: string): boolean {
  const s = stripFeedFileUtf8Bom(raw).slice(0, 24000).trimStart();
  // Hem [ {...} ] hem { "items": [ {...} ] } — baştaki '[' şartı BOM / sarmalayıcı yüzünden yanlış negatif veriyordu.
  return /"source"\s*:\s*"trendyol"/i.test(s);
}

export class TrendyolJsonAdapter implements FeedAdapter {
  parse(content: string): FeedParseResult {
    const data = JSON.parse(stripFeedFileUtf8Bom(content));
    const rows = Array.isArray(data) ? data : data.items || data.products || [];

    const droppedByReason: Record<string, number> = {};
    const bump = (k: string) => {
      droppedByReason[k] = (droppedByReason[k] ?? 0) + 1;
    };

    const items: ParsedFeedItem[] = [];

    for (const item of rows as any[]) {
      const candidates: string[] = [];
      let chosen: string | undefined;
      let chosenMethod = "";

      const tryField = (field: string, label: string, v: unknown) => {
        const p = primitiveFeedIdCandidate(v);
        if (p) candidates.push(`${label}=${p}`);
        if (!chosen && p) {
          chosen = p;
          chosenMethod = field;
        }
        return p;
      };

      tryField("externalId", "externalId", item.externalId);
      tryField("contentId", "contentId", item.contentId);
      tryField("listingId", "listingId", item.listingId);
      tryField("id", "id", item.id);
      tryField("productId", "productId", item.productId);
      tryField("sku", "sku", item.sku);
      tryField("merchantSku", "merchantSku", item.merchantSku);

      const urlPid =
        parseTrendyolProductIdFromUrl(item.url) ?? parseTrendyolProductIdFromUrl(item.mobileUrl);
      if (urlPid) {
        candidates.push(`url_p_id=${urlPid}`);
        if (!chosen) {
          chosen = urlPid;
          chosenMethod = "url_p_id";
        }
      }

      const merchantId = primitiveFeedIdCandidate(item.merchantId);
      const mpn = primitiveFeedIdCandidate(item.mpn ?? item.modelNumber);
      if (!chosen && merchantId && mpn) {
        const composite = `ty-${merchantId}-${mpn}`;
        candidates.push(`composite_merchant_mpn=${composite}`);
        chosen = composite;
        chosenMethod = "merchant_mpn";
      }

      if (!chosen) {
        bump("missing_external_id");
        continue;
      }

      const priceRaw = item.price ?? item.salePrice ?? item.currentPrice;
      const price = Number(priceRaw);
      if (!Number.isFinite(price)) {
        bump("invalid_price");
        continue;
      }

      const urlRaw =
        typeof item.url === "string" && item.url.trim() !== ""
          ? item.url.trim()
          : typeof item.mobileUrl === "string" && item.mobileUrl.trim() !== ""
            ? item.mobileUrl.trim()
            : "#";
      const mobileUrlRaw =
        typeof item.mobileUrl === "string" && item.mobileUrl.trim() !== ""
          ? item.mobileUrl.trim()
          : undefined;

      const title = String(item.title ?? item.name ?? "Ürün").trim() || "Ürün";
      const brandRaw = item.brand;
      const brand =
        brandRaw != null && String(brandRaw).trim() !== "" ? String(brandRaw).trim() : undefined;

      const categoryRaw = item.categoryText ?? item.category ?? item.productType;
      const categoryText =
        categoryRaw != null && String(categoryRaw).trim() !== ""
          ? String(categoryRaw).trim()
          : undefined;

      const imagesArray: string[] = Array.isArray(item.images)
        ? (item.images as unknown[])
            .map((x) => String(x ?? "").trim())
            .filter((x) => x.length > 0)
        : [];
      const imageCandidates = [
        item.imageUrl,
        item.image,
        item.thumbnail,
        imagesArray[0]
      ];
      let imageUrl: string | undefined;
      for (const c of imageCandidates) {
        if (c != null && String(c).trim() !== "") {
          imageUrl = String(c).trim();
          break;
        }
      }

      const descriptionRaw = item.description ?? item.shortDescription;
      const description =
        descriptionRaw != null && String(descriptionRaw).trim() !== ""
          ? String(descriptionRaw).trim().slice(0, 8000)
          : undefined;

      const specsVal = item.specs ?? item.attributes;
      const specs =
        specsVal && typeof specsVal === "object" && !Array.isArray(specsVal)
          ? (specsVal as Record<string, unknown>)
          : undefined;

      items.push({
        externalId: chosen,
        title,
        brand,
        categoryText,
        description,
        price,
        originalPrice:
          item.originalPrice != null && Number.isFinite(Number(item.originalPrice))
            ? Number(item.originalPrice)
            : item.listPrice != null && Number.isFinite(Number(item.listPrice))
              ? Number(item.listPrice)
              : undefined,
        currency: typeof item.currency === "string" && item.currency.trim() !== "" ? item.currency : "TRY",
        inStock: item.inStock ?? item.available ?? true,
        stockQuantity: item.stock != null ? Number(item.stock) : undefined,
        ean: primitiveFeedIdCandidate(item.ean ?? item.gtin ?? item.barcode),
        modelNumber: primitiveFeedIdCandidate(item.modelNumber ?? item.mpn ?? item.model),
        specs,
        url: urlRaw,
        mobileUrl: mobileUrlRaw,
        imageUrl,
        images: imagesArray.length > 0 ? imagesArray : undefined,
        feedIdentityTrace: { candidates, chosenMethod }
      });
    }

    return {
      items,
      droppedByReason: Object.keys(droppedByReason).length > 0 ? droppedByReason : undefined
    };
  }
}
