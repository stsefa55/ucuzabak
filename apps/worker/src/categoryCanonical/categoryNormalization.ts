import { normalizeCategoryText, normalizeProductTitle } from "@ucuzabak/shared";

export type CanonicalCategory = { id: number; name: string; slug: string; parentId: number | null };

/** İsim karşılaştırması (segment eşlemesi) — shared ile uyumlu. */
export function normalizeForCategoryText(input: string): string {
  return normalizeProductTitle(input);
}

/**
 * Feed `categoryText` için anahtar: virgül/noktalama/tire normalize,
 * sonra karşılaştırma normalizasyonu.
 */
export function normalizeCategoryPhrase(raw: string): string {
  return normalizeCategoryText(raw);
}
