import { isValidCanonicalSlug, normalizeBrandText, slugifyCanonical } from "./catalog";

/**
 * Feed → canonical Brand kıyası: boşluk / şirket ekleri (feedMatchScoring ile uyumlu).
 */
export function normalizeFeedBrandMatchKey(raw: string): string {
  let s = normalizeBrandText(raw.trim().replace(/\s+/g, " "));
  s = s.replace(/\b(as|a\.s\.|aş|ltd|inc|gmbh|sa|corp)\b/giu, " ").replace(/\s+/g, " ").trim();
  return s;
}

/** Küçük harf normalize edilmiş anahtar → jenerik / güvenilmez marka metinleri (otomatik marka yaratılmaz, slug’da da kullanılmaz). */
const GENERIC_BRAND_KEYS = new Set(
  [
    "genel markalar",
    "genel marka",
    "bilinmeyen marka",
    "diger marka",
    "diger",
    "markasiz",
    "markasız",
    "marka yok",
    "yok",
    "no brand",
    "unbranded",
    "generic",
    "generic brand",
    "various",
    "misc",
    "miscellaneous",
    "n a",
    "na",
    "unknown",
    "bilinmiyor"
  ].map((s) => normalizeFeedBrandMatchKey(s))
);

export function isGenericFeedImportBrandPhrase(normalizedKey: string): boolean {
  if (!normalizedKey || normalizedKey.length < 2) return true;
  return GENERIC_BRAND_KEYS.has(normalizedKey);
}

export type FeedImportSlugInput = {
  title: string;
  /** Ham feed markası (Trendyol `brand` vb.) */
  feedBrandRaw: string | null | undefined;
  /** DB ile eşleşen canonical marka adı (varsa slug’da tercih edilir) */
  matchedCanonicalBrandName: string | null | undefined;
  mpn: string | null | undefined;
};

/**
 * Yeni Product için SEO slug gövdesi (benzersizlik DB’de suffix ile sağlanır).
 * Marka jenerikse veya yoksa yalnızca başlık (+ gerekirse MPN).
 */
export function buildFeedImportCanonicalProductSlugBase(input: FeedImportSlugInput): string {
  const titleRaw = (input.title ?? "").trim();
  const titleSlug = slugifyCanonical(titleRaw || "urun").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 130);

  const feedTrim = input.feedBrandRaw?.trim() ?? "";
  const feedKey = feedTrim ? normalizeFeedBrandMatchKey(feedTrim) : "";
  const genericFeed = feedKey ? isGenericFeedImportBrandPhrase(feedKey) : true;

  const canonicalName = input.matchedCanonicalBrandName?.trim() ?? "";
  const brandSource =
    canonicalName ||
    (!genericFeed && feedTrim ? feedTrim : "");

  let brandPart = "";
  if (brandSource) {
    brandPart = slugifyCanonical(brandSource).replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (brandPart.length > 42) brandPart = brandPart.slice(0, 42).replace(/-+$/g, "");
  }

  let mainTitle = titleSlug;
  if (brandPart && mainTitle.startsWith(`${brandPart}-`)) {
    mainTitle = mainTitle.slice(brandPart.length + 1);
  }

  let mpnPart = "";
  const mpnTrim = input.mpn?.trim() ?? "";
  if (mpnTrim.length >= 2) {
    const mSlug = slugifyCanonical(mpnTrim).replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (mSlug.length >= 2 && mSlug.length <= 32) {
      const inTitle = mainTitle.includes(mSlug) || titleSlug.includes(mSlug);
      if (!inTitle) mpnPart = mSlug;
    }
  }

  const parts = [brandPart, mainTitle, mpnPart].filter((p) => p.length > 0);
  let base = parts.join("-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  if (base.length < 3) {
    base = titleSlug.length >= 2 ? titleSlug : "urun";
  }
  if (base.length > 118) base = base.slice(0, 118).replace(/-+$/g, "");

  if (!isValidCanonicalSlug(base)) {
    base = slugifyCanonical(base.replace(/[^a-z0-9-]/g, "-"))
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 118);
  }
  if (base.length < 2) base = "urun";

  return base;
}
