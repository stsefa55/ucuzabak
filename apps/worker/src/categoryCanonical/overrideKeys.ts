/**
 * Kaynak + kapsam + normalize edilmiş kategori anahtarı ile override map anahtarı.
 * Örnek: trendyol|full|elektronik telefon
 */
export function buildCategoryOverrideKey(
  source: string,
  scope: "full" | "last",
  normalizedKey: string
): string {
  return `${source.toLowerCase().trim()}|${scope}|${normalizedKey}`;
}
