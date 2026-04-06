/**
 * Kategori ağacı: aday ürünlerin yanlış kategoride eşleşmesini azaltmak için skor katkısı.
 */

export function computeCategoryAncestorSet(
  categoryId: number,
  parentById: Map<number, number | null>
): Set<number> {
  const s = new Set<number>();
  let cur: number | null = categoryId;
  const guard = new Set<number>();
  while (cur != null && !guard.has(cur)) {
    guard.add(cur);
    s.add(cur);
    cur = parentById.get(cur) ?? null;
  }
  return s;
}

export type CategoryMatchSignal = {
  points: number;
  label: string;
  feedCategoryId: number | null;
  productCategoryId: number | null;
  detail: Record<string, unknown>;
};

/**
 * Feed’den çözülen kategori ile ürünün categoryId’si arasında uyumluluk.
 * - Aynı yaprak: güçlü artı
 * - Bir diğerinin alt dalında: orta artı
 * - Ortak ata: zayıf artı
 * - Kesişim yok: ceza (yanlış pozitif baskısı)
 */
export function categoryMatchSignal(
  feedCategoryId: number | null,
  productCategoryId: number | null,
  parentById: Map<number, number | null>
): CategoryMatchSignal {
  const baseDetail = { feedCategoryId, productCategoryId };
  if (feedCategoryId == null || productCategoryId == null) {
    return {
      points: 0,
      label: "category_skipped_missing",
      feedCategoryId,
      productCategoryId,
      detail: { ...baseDetail, note: "feed_or_product_category_unset" }
    };
  }

  const feedA = computeCategoryAncestorSet(feedCategoryId, parentById);
  const prodA = computeCategoryAncestorSet(productCategoryId, parentById);

  if (feedCategoryId === productCategoryId) {
    return {
      points: 14,
      label: "category_exact_leaf",
      feedCategoryId,
      productCategoryId,
      detail: baseDetail
    };
  }
  if (prodA.has(feedCategoryId)) {
    return {
      points: 11,
      label: "product_descendant_of_feed_category",
      feedCategoryId,
      productCategoryId,
      detail: baseDetail
    };
  }
  if (feedA.has(productCategoryId)) {
    return {
      points: 11,
      label: "feed_descendant_of_product_category",
      feedCategoryId,
      productCategoryId,
      detail: baseDetail
    };
  }
  let sharedAncestors = 0;
  for (const id of feedA) {
    if (prodA.has(id)) sharedAncestors += 1;
  }
  if (sharedAncestors > 0) {
    return {
      points: 6,
      label: "category_shared_branch",
      feedCategoryId,
      productCategoryId,
      detail: { ...baseDetail, sharedAncestors }
    };
  }
  return {
    points: -13,
    label: "category_unrelated_tree",
    feedCategoryId,
    productCategoryId,
    detail: { ...baseDetail, warning: "cross_category_false_positive_risk" }
  };
}
