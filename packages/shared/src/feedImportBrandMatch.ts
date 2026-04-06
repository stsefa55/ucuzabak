import { slugifyCanonical } from "./catalog";
import { isGenericFeedImportBrandPhrase, normalizeFeedBrandMatchKey } from "./feedImportBrandSlug";

export type BrandRowForFeedImport = { id: number; name: string; slug: string };

/**
 * Yalnızca mevcut Brand satırlarına güvenli eşleme: tam normalize ad veya slug+ad tutarlılığı.
 * Yeni marka oluşturmaz; belirsizde null döner.
 */
export function matchCanonicalBrandForFeedImport(
  brands: BrandRowForFeedImport[],
  feedBrandRaw: string | null | undefined
): { id: number; name: string } | null {
  const raw = feedBrandRaw?.trim() ?? "";
  if (raw.length < 2) return null;

  const feedKey = normalizeFeedBrandMatchKey(raw);
  if (!feedKey || feedKey.length < 2) return null;
  if (isGenericFeedImportBrandPhrase(feedKey)) return null;

  const feedSlug = slugifyCanonical(raw);
  if (feedSlug.length < 2) return null;

  for (const b of brands) {
    if (normalizeFeedBrandMatchKey(b.name) === feedKey) {
      return { id: b.id, name: b.name };
    }
  }

  for (const b of brands) {
    if (b.slug === feedSlug && normalizeFeedBrandMatchKey(b.name) === feedKey) {
      return { id: b.id, name: b.name };
    }
  }

  return null;
}

/** StoreProduct.specsJson içinden feed markası (import ile uyumlu anahtarlar). */
export function extractFeedBrandFromSpecsJson(specs: unknown): string | null {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return null;
  const o = specs as Record<string, unknown>;
  const keys = ["Marka", "marka", "Brand", "brand", "BRAND", "Üretici", "uretici", "Manufacturer", "manufacturer"];
  for (const k of keys) {
    const v = o[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}
