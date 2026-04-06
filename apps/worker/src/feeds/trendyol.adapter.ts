import { XMLParser } from "fast-xml-parser";
import { FeedAdapter, FeedParseResult, ParsedFeedItem } from "./types";

function toStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" || s === "undefined" ? undefined : s;
}

function toStrOrUndefined(v: unknown): string | undefined {
  const s = toStr(v);
  return s ?? undefined;
}

/** Başlıktan slug benzeri externalId yedek değeri üretir. */
function slugFromTitle(title: unknown): string {
  const t = toStr(title) || "item";
  return t
    .toLowerCase()
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" }[c] ?? c))
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "item";
}

export class TrendyolXmlAdapter implements FeedAdapter {
  parse(content: string): FeedParseResult {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    const json = parser.parse(content);

    const products = Array.isArray(json.products?.product)
      ? json.products.product
      : json.products?.product
      ? [json.products.product]
      : [];

    const items = products.map((p: any) => {
      const ean = toStrOrUndefined(p.ean);
      const modelNumber = toStrOrUndefined(p.modelNumber);
      const title = toStr(p.title) || "Untitled";
      const brand = toStrOrUndefined(p.brand ?? p.manufacturer ?? p.vendor ?? p.Brand);
      const categoryText = toStrOrUndefined(
        p.category ?? p.categoryPath ?? p.categoryName ?? p.breadcrumb ?? p.Breadcrumbs
      );
      const rawId = toStrOrUndefined(p.id);
      const externalId =
        rawId ?? ean ?? modelNumber ?? slugFromTitle(p.title);

      return {
        externalId,
        title,
        brand,
        categoryText,
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
    return { items };
  }
}
