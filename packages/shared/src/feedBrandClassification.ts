import { isGenericFeedImportBrandPhrase, normalizeFeedBrandMatchKey } from "./feedImportBrandSlug";

export type FeedBrandSuggestionClass = "STRONG" | "NORMALIZABLE" | "SUSPICIOUS" | "GENERIC";

function titleCaseWord(word: string): string {
  if (!word) return word;
  let w = word;
  if (/^[A-Za-zÇĞİÖŞÜçğıöşü0-9]{1,5}\.$/.test(w)) {
    w = w.slice(0, -1);
  }
  const lower = w.toLocaleLowerCase("tr-TR");
  return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
}

/**
 * Feed ham metninden vitrin / canonical ad önerisi (baş harfler, boşluk, kısa kısaltma noktası).
 */
export function brandDisplayNameFromRaw(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(titleCaseWord)
    .join(" ");
}

/** Mağaza / kanal gürültüsü (jenerik marka sayılır). normalizeFeedBrandMatchKey çıktısı üzerinde. */
export function isFeedBrandChannelOrStoreNoiseNormalized(normKey: string): boolean {
  if (!normKey || normKey.length < 2) return true;
  const n = normKey.toLowerCase();
  const needles = [
    "official store",
    "resmi magaza",
    "resmi mağaza",
    "misafir satici",
    "misafir satıcı",
    "magaza resmi",
    "trendyol magaza",
    "hepsiburada magaza",
    "n11 magaza"
  ];
  for (const x of needles) {
    if (n.includes(x)) return true;
  }
  if (/\bsatici\b/.test(n) || /\bsatıcı\b/.test(n)) return true;
  if (n.includes(" mağaza") || n.endsWith(" mağaza")) return true;
  if (n.includes(" magaza") || n.endsWith(" magaza")) return true;
  if (n === "mağaza" || n === "magaza") return true;
  return false;
}

function isSuspiciousBrandRaw(raw: string, suggested: string): boolean {
  const t = raw.trim();
  if (t.length > 52) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 10) return true;
  if (/https?:\/\//i.test(t)) return true;
  const letters = t.replace(/[^a-zA-ZÇĞİÖŞÜçğıöşü]/g, "").length;
  if (letters < 3 && t.length > 8) return true;
  const digitRatio = (t.match(/\d/g) ?? []).length / Math.max(t.length, 1);
  if (digitRatio > 0.45 && t.length > 18) return true;
  if (/[🔥✅⭐🎁]/u.test(t)) return true;
  if (suggested.length > 56) return true;
  return false;
}

export type FeedBrandClassification = {
  class: FeedBrandSuggestionClass;
  suggestedCanonical: string;
  normalizedKey: string;
};

/**
 * Operatör öneri ekranı için sınıflandırma. Otomatik DB yazımı yapmaz.
 */
export function classifyFeedBrandSuggestion(raw: string): FeedBrandClassification {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  const normalizedKey = normalizeFeedBrandMatchKey(trimmed);
  const suggestedCanonical = brandDisplayNameFromRaw(trimmed);

  if (!normalizedKey || normalizedKey.length < 2) {
    return { class: "GENERIC", suggestedCanonical, normalizedKey };
  }
  if (isGenericFeedImportBrandPhrase(normalizedKey) || isFeedBrandChannelOrStoreNoiseNormalized(normalizedKey)) {
    return { class: "GENERIC", suggestedCanonical, normalizedKey };
  }
  if (isSuspiciousBrandRaw(trimmed, suggestedCanonical)) {
    return { class: "SUSPICIOUS", suggestedCanonical, normalizedKey };
  }
  if (trimmed === suggestedCanonical) {
    return { class: "STRONG", suggestedCanonical, normalizedKey };
  }
  return { class: "NORMALIZABLE", suggestedCanonical, normalizedKey };
}
